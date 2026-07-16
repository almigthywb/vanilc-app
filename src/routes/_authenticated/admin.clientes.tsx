import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";
import { formatCustomerNumber, formatPhonePretty, normalizePhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");

  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("customer_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const rows = customers.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    const numTerm = term.replace(/[^0-9]/g, "");
    return rows.filter((c) => {
      const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
      if (name.includes(term)) return true;
      if (numTerm && c.normalized_phone?.includes(numTerm)) return true;
      if (numTerm && String(c.customer_number).includes(numTerm)) return true;
      return false;
    });
  }, [customers.data, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl">Clientes</h1>
          <p className="text-muted-foreground">
            Cadastro único identificado por telefone e número de cliente.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nº, nome ou telefone…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">1º pedido</th>
                <th className="px-4 py-3">Último</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
                <th className="px-4 py-3 text-right">Total gasto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-bold text-primary tabular-nums">
                    {formatCustomerNumber(c.customer_number)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatPhonePretty(c.normalized_phone ?? c.phone)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.first_order_at ? formatDateTime(c.first_order_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.last_order_at ? formatDateTime(c.last_order_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.total_orders}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatKwanza(Number(c.total_spent))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {c.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/admin/clientes/$id"
                      params={{ id: c.id }}
                      className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                      aria-label="Abrir cliente"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              {q ? "Nenhum cliente encontrado." : "Nenhum cliente ainda."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
// keep for reference: normalizePhone imported to guarantee tree-shake safety
void normalizePhone;
