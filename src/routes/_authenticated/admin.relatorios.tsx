import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  head: () => ({ meta: [
    { title: "Relatórios — Vanilc Admin" },
    { name: "description", content: "Analise os pedidos finalizados e as vendas da Vanilc." },
    { property: "og:title", content: "Relatórios — Vanilc Admin" },
    { property: "og:description", content: "Analise os pedidos finalizados e as vendas da Vanilc." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  const report = useQuery({
    queryKey: ["admin-reports", period],
    queryFn: async () => {
      const since = new Date();
      if (period === "day") since.setHours(0, 0, 0, 0);
      else if (period === "week") since.setDate(since.getDate() - 7);
      else since.setMonth(since.getMonth() - 1);

      const { data: orders } = await supabase
        .from("orders")
        .select("id, total, completed_at")
        .eq("status", "completed")
        .gte("completed_at", since.toISOString());
      const { data: items } = await supabase
        .from("order_items")
        .select("name_snapshot, qty, unit_price, order_id");
      const orderIds = new Set((orders ?? []).map((o) => o.id));
      const filteredItems = (items ?? []).filter((i) => orderIds.has(i.order_id));

      const productMap = new Map<string, { qty: number; revenue: number }>();
      for (const i of filteredItems) {
        const cur = productMap.get(i.name_snapshot) ?? { qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += Number(i.unit_price) * i.qty;
        productMap.set(i.name_snapshot, cur);
      }
      const topProducts = [...productMap.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      const totalRevenue = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);

      return { totalOrders: orders?.length ?? 0, totalRevenue, topProducts };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Relatórios</h1>
        <p className="text-muted-foreground">Análise da performance da Vanilc</p>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:bg-muted",
            ].join(" ")}
          >
            {p === "day" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card label="Pedidos no período" value={String(report.data?.totalOrders ?? 0)} />
        <Card label="Receita no período" value={formatKwanza(report.data?.totalRevenue ?? 0)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-2xl">Top produtos</h2>
        {report.data && report.data.topProducts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">Produto</th>
                <th className="py-2 text-right">Qtd</th>
                <th className="py-2 text-right">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.data.topProducts.map((p) => (
                <tr key={p.name}>
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-right">{p.qty}</td>
                  <td className="py-3 text-right font-semibold">{formatKwanza(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">Sem dados no período.</p>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
