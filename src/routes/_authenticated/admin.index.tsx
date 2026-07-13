import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

const PENDING_STATUSES = ["received", "confirmed", "preparing", "ready", "out_for_delivery"] as const;

function DashboardPage() {
  const ops = useQuery({
    queryKey: ["admin-dashboard-ops"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [receivedToday, pending, completedToday, cancelledToday] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", PENDING_STATUSES as unknown as string[]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("completed_at", today.toISOString())
          .lt("completed_at", tomorrow.toISOString()),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "cancelled")
          .gte("cancelled_at", today.toISOString())
          .lt("cancelled_at", tomorrow.toISOString()),
      ]);

      return {
        receivedToday: receivedToday.count ?? 0,
        pending: pending.count ?? 0,
        completedToday: completedToday.count ?? 0,
        cancelledToday: cancelledToday.count ?? 0,
      };
    },
  });

  const fin = useQuery({
    queryKey: ["admin-dashboard-fin"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [allCompleted, monthCompleted, todayCompleted, customers] = await Promise.all([
        supabase.from("orders").select("id, total").eq("status", "completed"),
        supabase
          .from("orders")
          .select("id, total")
          .eq("status", "completed")
          .gte("completed_at", monthStart.toISOString()),
        supabase
          .from("orders")
          .select("id, total")
          .eq("status", "completed")
          .gte("completed_at", today.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      const sum = (rows: { total: number | string }[] | null) =>
        (rows ?? []).reduce((s, o) => s + Number(o.total), 0);

      const totalRevenue = sum(allCompleted.data);
      const totalSales = allCompleted.data?.length ?? 0;
      return {
        todayRevenue: sum(todayCompleted.data),
        monthRevenue: sum(monthCompleted.data),
        totalRevenue,
        totalSales,
        avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
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

  const o = ops.data;
  const f = fin.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Operacional — hoje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat Icon={ShoppingBag} label="Pedidos recebidos hoje" value={o?.receivedToday ?? 0} />
          <Stat Icon={Clock} label="Pedidos pendentes" value={o?.pending ?? 0} tone="warn" />
          <Stat Icon={CheckCircle2} label="Finalizados hoje" value={o?.completedToday ?? 0} tone="success" />
          <Stat Icon={XCircle} label="Cancelados hoje" value={o?.cancelledToday ?? 0} tone="danger" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Financeiro — apenas pedidos finalizados
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat Icon={DollarSign} label="Receita de hoje" value={formatKwanza(f?.todayRevenue ?? 0)} />
          <Stat Icon={TrendingUp} label="Receita do mês" value={formatKwanza(f?.monthRevenue ?? 0)} />
          <Stat Icon={DollarSign} label="Receita total" value={formatKwanza(f?.totalRevenue ?? 0)} />
          <Stat Icon={Receipt} label="Total de vendas" value={f?.totalSales ?? 0} />
          <Stat Icon={TrendingUp} label="Ticket médio" value={formatKwanza(f?.avgTicket ?? 0)} />
          <Stat Icon={Users} label="Clientes" value={f?.customers ?? 0} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="text-sm font-semibold text-primary hover:underline">
            Ver todos
          </Link>
        </div>
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
  tone,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "success" | "warn" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warn"
        ? "bg-chart-3/15 text-chart-3"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${toneCls}`}>
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
    confirmed: { label: "Confirmado", cls: "bg-chart-2/15 text-chart-2" },
    preparing: { label: "Em preparo", cls: "bg-chart-3/15 text-chart-3" },
    ready: { label: "Pronto", cls: "bg-chart-4/15 text-chart-4" },
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
