import type { ReactNode } from "react";

export function AdminTable({
  headers,
  rows,
  empty,
  isLoading,
  error,
}: {
  headers: string[];
  rows: ReactNode[];
  empty: string;
  isLoading?: boolean;
  error?: unknown;
}) {
  if (error) {
    return (
      <p className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-destructive">
        Unable to load this data. Please refresh and try again.
      </p>
    );
  }
  if (isLoading) return <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />;
  if (!rows.length) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-5 py-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{rows}</tbody>
      </table>
    </div>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 align-middle">{children}</td>;
}
