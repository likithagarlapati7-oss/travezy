import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/travezy";
import { dashboardPathForRole, normaliseRole, type AppRole } from "@/lib/roles";

export { dashboardPathForRole };
export type { AppRole };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  /** True until the Supabase session has been resolved. */
  loading: boolean;
  /** True while the profile/role lookup is still running for a signed-in user. */
  profileLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listener first, so no auth event is missed while the session resolves.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const { data: account, isLoading: profileLoading } = useQuery({
    queryKey: ["auth-account", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ profile: Profile | null; role: AppRole | null }> => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roles = (rolesRes.data ?? [])
        .map((r) => normaliseRole(r.role))
        .filter(Boolean) as AppRole[];
      const role: AppRole | null = roles.includes("admin")
        ? "admin"
        : roles.includes("verifier")
          ? "verifier"
          : roles.includes("provider")
            ? "provider"
            : roles.includes("tourist")
              ? "tourist"
              : normaliseRole(profileRes.data?.account_type ?? null);
      return { profile: profileRes.data ?? null, role };
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: account?.profile ?? null,
      role: account?.role ?? null,
      loading,
      profileLoading: !!userId && profileLoading,
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    [session, account, loading, profileLoading, userId, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
