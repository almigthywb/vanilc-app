import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Save, Trash2, Archive, ArchiveRestore, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKwanza, formatDateTime } from "@/lib/format";
import { formatCustomerNumber, formatPhonePretty, normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customer = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (customer.data && !initialized) {
    setFirstName(customer.data.first_name ?? "");
    setLastName(customer.data.last_name ?? "");
    setPhone(customer.data.phone ?? "");
    setNotes(customer.data.notes ?? "");
    setInitialized(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const nextNorm = normalizePhone(phone);
      if (!nextNorm) throw new Error("Telefone inválido.");
      // If phone changed, check whether another customer already owns it
      if (nextNorm !== customer.data?.normalized_phone) {
        const { data: clash } = await supabase
          .from("customers")
          .select("id, customer_number, first_name, last_name")
          .eq("normalized_phone", nextNorm)
          .neq("id", id)
          .maybeSingle();
        if (clash) {
          throw new Error(
            `Telefone já pertence a ${formatCustomerNumber(clash.customer_number)} — ${clash.first_name}. Use "Vincular Cliente" no pedido para unir cadastros.`,
          );
        }
      }
      const { error } = await supabase
        .from("customers")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim(),
          notes: notes.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = customer.data?.status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("customers").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const removeCustomer = useMutation({
    mutationFn: async () => {
      if ((orders.data ?? []).length > 0) {
        throw new Error("Cliente possui pedidos. Arquive em vez de excluir.");
      }
      if (!confirm("Excluir permanentemente este cliente?")) throw new Error("__cancel");
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      navigate({ to: "/admin/clientes" });
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "__cancel") return;
      toast.error(e instanceof Error ? e.message : "Erro");
    },
  });

  const c = customer.data;
  const rows = orders.data ?? [];

  const stats = {
    total: rows.length,
    completed: rows.filter((o) => o.status === "completed").length,
    cancelled: rows.filter((o) => o.status === "cancelled").length,
    totalSpent: rows
      .filter((o) => o.status === "completed")
      .reduce((a, o) => a + Number(o.total), 0),
  };
  const avgTicket = stats.completed > 0 ? stats.totalSpent / stats.completed : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/clientes" className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl truncate">
            {c ? `${c.first_name} ${c.last_name ?? ""}` : "Cliente"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {c ? formatCustomerNumber(c.customer_number) : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total pedidos" value={String(stats.total)} />
        <StatCard label="Finalizados" value={String(stats.completed)} />
        <StatCard label="Cancelados" value={String(stats.cancelled)} />
        <StatCard label="Total gasto" value={formatKwanza(stats.totalSpent)} />
        <StatCard label="Ticket médio" value={formatKwanza(avgTicket)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info + edit form */}
        <div className="lg:col-span-1 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-xl">Dados do cliente</h2>

          <div className="space-y-3 text-sm">
            <Field label="Nº do Cliente">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 font-bold tabular-nums">
                {c ? formatCustomerNumber(c.customer_number) : ""}
              </div>
            </Field>
            <Field label="Nome">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
              />
            </Field>
            <Field label="Sobrenome">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary tabular-nums"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Normalizado: {formatPhonePretty(phone) || "—"}
              </p>
            </Field>
            <Field label="Observações">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
              />
            </Field>

            <Field label="Cadastrado em">
              <div className="text-muted-foreground">{c ? formatDateTime(c.created_at) : ""}</div>
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
            <Button variant="outline" onClick={() => toggleStatus.mutate()} disabled={toggleStatus.isPending}>
              {c?.status === "active" ? (
                <>
                  <Archive className="mr-2 h-4 w-4" /> Arquivar
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Reativar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => removeCustomer.mutate()}
              disabled={removeCustomer.isPending || rows.length > 0}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              title={rows.length > 0 ? "Cliente com histórico não pode ser excluído" : ""}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>

        {/* Order history */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-xl">Histórico de pedidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/pedidos"
                        search={{ open: o.id } as never}
                        className="font-bold text-primary hover:underline"
                      >
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatKwanza(Number(o.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">Nenhum pedido ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
