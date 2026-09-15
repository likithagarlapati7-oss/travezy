import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serviceInputSchema } from "./services.schema";
import {
  assertCanDeleteService,
  assertOwnsService,
  requireProvider,
  toServiceRow,
} from "./services.server";

export const createService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => serviceInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const provider = await requireProvider(context.supabase, context.userId);
    let res = await context.supabase
      .from("services")
      .insert(toServiceRow(data, provider.id, true))
      .select("id")
      .single();

    // Fallback if remote schema cache does not have latitude/longitude columns yet
    if (
      res.error &&
      (res.error.message?.includes("latitude") ||
        res.error.message?.includes("schema cache") ||
        res.error.code === "42703" ||
        res.error.code === "PGRST204")
    ) {
      res = await context.supabase
        .from("services")
        .insert(toServiceRow(data, provider.id, false))
        .select("id")
        .single();
    }

    if (res.error) throw new Error(res.error.message);
    return { id: res.data.id };
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), values: serviceInputSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const provider = await requireProvider(context.supabase, context.userId);
    await assertOwnsService(context.supabase, data.id, provider.id);
    let res = await context.supabase
      .from("services")
      .update(toServiceRow(data.values, undefined, true) as any)
      .eq("id", data.id)
      .eq("provider_id", provider.id);

    // Fallback if remote schema cache does not have latitude/longitude columns yet
    if (
      res.error &&
      (res.error.message?.includes("latitude") ||
        res.error.message?.includes("schema cache") ||
        res.error.code === "42703" ||
        res.error.code === "PGRST204")
    ) {
      res = await context.supabase
        .from("services")
        .update(toServiceRow(data.values, undefined, false) as any)
        .eq("id", data.id)
        .eq("provider_id", provider.id);
    }

    if (res.error) throw new Error(res.error.message);
    return { id: data.id };
  });

export const toggleServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const provider = await requireProvider(context.supabase, context.userId);
    await assertOwnsService(context.supabase, data.id, provider.id);

    const { error } = await context.supabase
      .from("services")
      .update({ is_active: data.is_active } as any)
      .eq("id", data.id)
      .eq("provider_id", provider.id);

    if (error) throw new Error(error.message);
    return { id: data.id, is_active: data.is_active };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const provider = await requireProvider(context.supabase, context.userId);
    await assertOwnsService(context.supabase, data.id, provider.id);
    await assertCanDeleteService(context.supabase, data.id);

    const { error } = await context.supabase
      .from("services")
      .delete()
      .eq("id", data.id)
      .eq("provider_id", provider.id);

    if (error) throw new Error(error.message);
    return { id: data.id };
  });
