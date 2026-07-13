import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { XCircle, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pedidos-cancelados")({
  component: CancelledOrdersPage,
});

function CancelledOrdersPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin-cancelled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl">Pedidos cancelados</h1>
          <p className="text-muted-foreground">
            Estes pedidos não entram em nenhuma estatística financeira.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Cancelado em</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(orders.data ?? []).map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-bold text-destructive">#{o.order_number}</td>
                  <td className="px-4 py-3">
                    {o.customer_first_name} {o.customer_last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.customer_phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {o.cancelled_at ? formatDateTime(o.cancelled_at) : formatDateTime(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold line-through opacity-60">
                    {formatKwanza(Number(o.total))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setOpenId(o.id)}
                      className="rounded-md p-2 hover:bg-muted"
                      aria-label="Ver pedido"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.data && orders.data.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              Nenhum pedido cancelado.
            </p>
          )}
        </div>
      </div>

      {openId && <CancelledDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function CancelledDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ["admin-cancelled-order", id],
    queryFn: async () => {
      const [{ data: o }, { data: items }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      return { order: o, items: items ?? [] };
    },
  });

  const o = detail.data?.order;
  const items = detail.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl">Pedido #{o?.order_number}</h2>
            <p className="text-sm text-destructive">
              Cancelado {o?.cancelled_at ? "em " + formatDateTime(o.cancelled_at) : ""}
            </p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {o && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Cliente</p>
                <p className="font-medium">
                  {o.customer_first_name} {o.customer_last_name ?? ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Telefone</p>
                <p className="font-medium">{o.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Criado em</p>
                <p className="font-medium">{formatDateTime(o.created_at)}</p>
              </div>
              {o.address && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase text-muted-foreground">Endereço</p>
                  <p className="font-medium">{o.address}</p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase text-muted-foreground">Produtos</p>
              <ul className="space-y-1 rounded-xl border border-border bg-muted/30 p-3">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      <span className="font-bold">{i.qty}x</span> {i.name_snapshot}
                    </span>
                    <span className="opacity-60 line-through">
                      {formatKwanza(Number(i.unit_price) * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex justify-between font-bold">
                <span>Valor (não contabilizado)</span>
                <span className="line-through opacity-70">{formatKwanza(Number(o.total))}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
