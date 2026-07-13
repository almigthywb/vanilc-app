import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: OrdersPage,
});

const STATUSES = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "received", label: "Recebido" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Em preparo" },
  { value: "ready", label: "Pronto" },
  { value: "out_for_delivery", label: "Saiu p/ entrega" },
  { value: "completed", label: "Finalizados" },
  { value: "cancelled", label: "Cancelados" },
] as const;

const REAL_STATUSES = [
  { value: "received", label: "Recebido" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Em preparo" },
  { value: "ready", label: "Pronto" },
  { value: "out_for_delivery", label: "Saiu p/ entrega" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const PENDING_STATUSES = ["received", "confirmed", "preparing", "ready", "out_for_delivery"] as const;

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "all", label: "Tudo" },
] as const;

function OrdersPage() {
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState<string>("today");
  const [openId, setOpenId] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin-orders", status, period],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (status === "pending") {
        q = q.in("status", [...PENDING_STATUSES]);
      } else if (status !== "all") {
        q = q.eq("status", status as never);
      }
      const since = periodSince(period);
      if (since) q = q.gte("created_at", since.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Pedidos</h1>
        <p className="text-muted-foreground">Gerencie todos os pedidos da Vanilc</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Chip>
        ))}
        <div className="mx-2 h-8 w-px bg-border" />
        {STATUSES.map((s) => (
          <Chip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(orders.data ?? []).map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-bold text-primary">#{o.order_number}</td>
                  <td className="px-4 py-3">
                    {o.customer_first_name} {o.customer_last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.customer_phone}</td>
                  <td className="px-4 py-3">
                    {o.delivery_type === "pickup"
                      ? "Retirada"
                      : o.delivery_type === "city"
                        ? "Cidade"
                        : "Fora"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
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
            <p className="py-12 text-center text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
        </div>
      </div>

      {openId && <OrderModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function periodSince(p: string): Date | null {
  const d = new Date();
  if (p === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (p === "week") {
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (p === "month") {
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-1.5 text-sm font-semibold transition",
        active ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function OrderModal({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const [{ data: o }, { data: items }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      return { order: o, items: items ?? [] };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-ops"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-fin"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cancelled-orders"] });
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const o = order.data?.order;
  const items = order.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl">Pedido #{o?.order_number}</h2>
            <p className="text-sm text-muted-foreground">{o && formatDateTime(o.created_at)}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {o && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Cliente" value={`${o.customer_first_name} ${o.customer_last_name ?? ""}`} />
              <Info label="Telefone" value={o.customer_phone} />
              <Info
                label="Tipo de entrega"
                value={
                  o.delivery_type === "pickup"
                    ? "Retirar na churrasqueira"
                    : o.delivery_type === "city"
                      ? "Entrega na cidade"
                      : "Entrega fora da cidade"
                }
              />
              <Info label="Pagamento" value={paymentLabel(o.payment_method)} />
              {o.address && <Info label="Endereço" value={o.address} className="sm:col-span-2" />}
              {o.notes && <Info label="Observações" value={o.notes} className="sm:col-span-2" />}
            </div>

            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Itens</h3>
              <ul className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      <span className="font-bold">{i.qty}x</span> {i.name_snapshot}
                    </span>
                    <span className="font-semibold">{formatKwanza(Number(i.unit_price) * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <Row label="Subtotal" value={formatKwanza(Number(o.subtotal))} />
              <Row label="Taxa de entrega" value={formatKwanza(Number(o.delivery_fee))} />
              <Row label="Total" value={formatKwanza(Number(o.total))} bold />
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Alterar status
              </p>
              <div className="flex flex-wrap gap-2">
                {REAL_STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={o.status === s.value ? "default" : "outline"}
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-border pt-1 font-bold text-base" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function paymentLabel(p: string) {
  return (
    { tpa: "TPA", qr_code: "QR Code", unitel_money: "Unitel Money", cash: "Dinheiro" } as Record<
      string,
      string
    >
  )[p] ?? p;
}
