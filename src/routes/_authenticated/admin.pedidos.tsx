import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, X, Search, Trash2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";
import { formatCustomerNumber, formatPhonePretty, normalizePhone } from "@/lib/phone";
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

type OrderRow = {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_first_name: string;
  customer_last_name: string | null;
  customer_phone: string;
  status: string;
  delivery_type: string;
  delivery_zone_name?: string | null;
  reference_point?: string | null;
  total: number | string;
  created_at: string;
  customers?: { customer_number: number; normalized_phone: string | null } | null;
};

function OrdersPage() {
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState<string>("today");
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const orders = useQuery({
    queryKey: ["admin-orders", status, period],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, customers(customer_number, normalized_phone)")
        .order("created_at", { ascending: false });
      if (status === "pending") {
        query = query.in("status", [...PENDING_STATUSES]);
      } else if (status !== "all") {
        query = query.eq("status", status as never);
      }
      const since = periodSince(period);
      if (since) query = query.gte("created_at", since.toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const filtered = useMemo(() => {
    const rows = orders.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    const numTerm = term.replace(/[^0-9]/g, "");
    return rows.filter((o) => {
      const name = `${o.customer_first_name} ${o.customer_last_name ?? ""}`.toLowerCase();
      if (name.includes(term)) return true;
      if (!numTerm) return false;
      if (String(o.order_number).includes(numTerm)) return true;
      if (o.customers?.customer_number && String(o.customers.customer_number).includes(numTerm))
        return true;
      const phoneN = o.customers?.normalized_phone ?? normalizePhone(o.customer_phone);
      if (phoneN.includes(numTerm)) return true;
      return false;
    });
  }, [orders.data, q]);

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

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nº pedido, nº cliente, nome ou telefone…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-bold text-primary">#{o.order_number}</td>
                  <td className="px-4 py-3">
                    {o.customer_id && o.customers ? (
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: o.customer_id }}
                        className="font-semibold text-primary hover:underline tabular-nums"
                      >
                        {formatCustomerNumber(o.customers.customer_number)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.customer_first_name} {o.customer_last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatPhonePretty(o.customer_phone)}
                  </td>
                  <td className="px-4 py-3">
                    {o.delivery_type === "pickup"
                      ? "Retirada"
                      : o.delivery_zone_name ??
                        (o.delivery_type === "city" ? "Cidade" : o.delivery_type === "outside" ? "Fora" : "Entrega")}
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
          {filtered.length === 0 && (
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
  const [linkOpen, setLinkOpen] = useState(false);

  const order = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const [{ data: o }, { data: items }] = await Promise.all([
        supabase
          .from("orders")
          .select("*, customers(id, customer_number, first_name, last_name, normalized_phone)")
          .eq("id", id)
          .single(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      return { order: o, items: items ?? [] };
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard-ops"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard-fin"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customer"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customer-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-cancelled-orders"] });
  };

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteOrder = useMutation({
    mutationFn: async () => {
      if (
        !confirm(
          "Tem certeza de que deseja excluir permanentemente este pedido?\nEsta ação não poderá ser desfeita.",
        )
      )
        throw new Error("__cancel");
      const { error: e1 } = await supabase.from("order_items").delete().eq("order_id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("orders").delete().eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Pedido excluído.");
      invalidateAll();
      onClose();
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "__cancel") return;
      toast.error(e instanceof Error ? e.message : "Erro");
    },
  });

  const o = order.data?.order;
  const items = order.data?.items ?? [];
  const linkedCustomer = o?.customers as
    | {
        id: string;
        customer_number: number;
        first_name: string;
        last_name: string | null;
        normalized_phone: string | null;
      }
    | null
    | undefined;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
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
            {/* Customer link */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente vinculado</p>
                {linkedCustomer ? (
                  <Link
                    to="/admin/clientes/$id"
                    params={{ id: linkedCustomer.id }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {formatCustomerNumber(linkedCustomer.customer_number)} — {linkedCustomer.first_name}{" "}
                    {linkedCustomer.last_name ?? ""}
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Nenhum</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Link2 className="mr-2 h-4 w-4" /> Vincular
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Cliente" value={`${o.customer_first_name} ${o.customer_last_name ?? ""}`} />
              <Info label="Telefone" value={formatPhonePretty(o.customer_phone)} />
              <Info
                label="Tipo de entrega"
                value={
                  o.delivery_type === "pickup"
                    ? "Retirar na churrasqueira"
                    : o.delivery_zone_name
                      ? `Entrega — ${o.delivery_zone_name}`
                      : o.delivery_type === "city"
                        ? "Entrega na cidade"
                        : o.delivery_type === "outside"
                          ? "Entrega fora da cidade"
                          : "Entrega"
                }
              />
              {o.reference_point && (
                <Info label="Ponto de referência" value={o.reference_point} className="sm:col-span-2" />
              )}
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

            <div className="flex justify-end border-t border-border pt-3">
              <Button
                variant="outline"
                onClick={() => deleteOrder.mutate()}
                disabled={deleteOrder.isPending}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir pedido
              </Button>
            </div>
          </div>
        )}
      </div>

      {linkOpen && (
        <LinkCustomerDialog
          orderId={id}
          currentCustomerId={o?.customer_id ?? null}
          onClose={() => setLinkOpen(false)}
          onDone={() => {
            invalidateAll();
            setLinkOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LinkCustomerDialog({
  orderId,
  currentCustomerId,
  onClose,
  onDone,
}: {
  orderId: string;
  currentCustomerId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");

  const results = useQuery({
    queryKey: ["admin-customer-search", q],
    queryFn: async () => {
      const term = q.trim();
      let query = supabase
        .from("customers")
        .select("id, customer_number, first_name, last_name, normalized_phone, phone")
        .order("customer_number", { ascending: true })
        .limit(20);
      if (term) {
        const numTerm = term.replace(/[^0-9]/g, "");
        const clauses: string[] = [`first_name.ilike.%${term}%`, `last_name.ilike.%${term}%`];
        if (numTerm) {
          clauses.push(`normalized_phone.ilike.%${numTerm}%`);
          const asNum = Number(numTerm);
          if (Number.isFinite(asNum)) clauses.push(`customer_number.eq.${asNum}`);
        }
        query = query.or(clauses.join(","));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const link = useMutation({
    mutationFn: async (customerId: string) => {
      if (customerId === currentCustomerId) return;
      const { data: c, error: cErr } = await supabase
        .from("customers")
        .select("first_name, last_name, phone")
        .eq("id", customerId)
        .single();
      if (cErr) throw cErr;
      const { error } = await supabase
        .from("orders")
        .update({
          customer_id: customerId,
          customer_first_name: c.first_name,
          customer_last_name: c.last_name,
          customer_phone: c.phone,
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido vinculado ao cliente.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/50 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-20 max-h-[70vh] max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-xl">Vincular cliente</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nº cliente, nome ou telefone…"
              className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <ul className="max-h-[45vh] overflow-y-auto divide-y divide-border">
          {(results.data ?? []).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => link.mutate(c.id)}
                disabled={link.isPending}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {c.first_name} {c.last_name ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatCustomerNumber(c.customer_number)} · {formatPhonePretty(c.normalized_phone ?? c.phone)}
                  </p>
                </div>
                {c.id === currentCustomerId && (
                  <span className="text-xs font-semibold text-primary">Atual</span>
                )}
              </button>
            </li>
          ))}
          {results.data && results.data.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
        </ul>
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
