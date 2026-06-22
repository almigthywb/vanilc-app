import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, DollarSign, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const stats = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [allOrders, todayOrders, monthOrders, customers] = await Promise.all([
        supabase.from("orders").select("id, total"),
        supabase
          .from("orders")
          .select("id, total")
          .gte("created_at", today.toISOString()),
        supabase
          .from("orders")
          .select("id, total")
          .gte("created_at", monthStart.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      const totalRevenue = (allOrders.data ?? []).reduce(
        (s, o) => s + Number(o.total),
        0,
      );
      const todayRevenue = (todayOrders.data ?? []).reduce(
        (s, o) => s + Number(o.total),
        0,
      );
      const monthRevenue = (monthOrders.data ?? []).reduce(
        (s, o) => s + Number(o.total),
        0,
      );
      const avgTicket = (allOrders.data?.length ?? 0) > 0 ? totalRevenue / (allOrders.data?.length ?? 1) : 0;

      return {
        totalOrders: allOrders.data?.length ?? 0,
        todayOrders: todayOrders.data?.length ?? 0,
        todayRevenue,
        monthRevenue,
        totalRevenue,
        avgTicket,
        customers: customers.count ?? 0,
      };
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_first_name, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const s = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat Icon={ShoppingBag} label="Pedidos hoje" value={s?.todayOrders ?? 0} />
        <Stat Icon={DollarSign} label="Receita hoje" value={formatKwanza(s?.todayRevenue ?? 0)} />
        <Stat Icon={TrendingUp} label="Receita do mês" value={formatKwanza(s?.monthRevenue ?? 0)} />
        <Stat Icon={Users} label="Clientes" value={s?.customers ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Stat Icon={ShoppingBag} label="Total de pedidos" value={s?.totalOrders ?? 0} />
        <Stat Icon={DollarSign} label="Receita total" value={formatKwanza(s?.totalRevenue ?? 0)} />
        <Stat Icon={TrendingUp} label="Ticket médio" value={formatKwanza(s?.avgTicket ?? 0)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-2xl">Pedidos recentes</h2>
        {recent.data && recent.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Cliente</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.data.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3 font-bold text-primary">#{o.order_number}</td>
                    <td className="py-3 pr-3">{o.customer_first_name}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatKwanza(Number(o.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">Nenhum pedido ainda.</p>
        )}
      </section>
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-extrabold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    received: { label: "Recebido", cls: "bg-primary/10 text-primary" },
    preparing: { label: "Em preparo", cls: "bg-chart-3/15 text-chart-3" },
    out_for_delivery: { label: "Saiu p/ entrega", cls: "bg-chart-4/15 text-chart-4" },
    completed: { label: "Finalizado", cls: "bg-success/15 text-success" },
    cancelled: { label: "Cancelado", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}
