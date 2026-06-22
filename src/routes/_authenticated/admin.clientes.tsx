import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("total_spent", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Clientes</h1>
        <p className="text-muted-foreground">Cadastrados automaticamente a cada pedido</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
                <th className="px-4 py-3 text-right">Total gasto</th>
                <th className="px-4 py-3">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(customers.data ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-right">{c.total_orders}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatKwanza(Number(c.total_spent))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.last_order_at ? formatDateTime(c.last_order_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.data?.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">Nenhum cliente ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
