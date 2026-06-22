import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, Phone, MapPin, Clock, Truck, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { settingsQuery, type Settings } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => {
    if (data && !s) setS({ ...data });
  }, [data, s]);

  const save = useMutation({
    mutationFn: async () => {
      if (!s) return;
      const { error } = await supabase
        .from("settings")
        .update({
          whatsapp_number: s.whatsapp_number,
          delivery_fee_city: s.delivery_fee_city,
          delivery_fee_outside: s.delivery_fee_outside,
          prep_time_min: s.prep_time_min,
          prep_time_max: s.prep_time_max,
          address: s.address,
          business_hours: s.business_hours,
          store_open: s.store_open,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (!s) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl">Configurações</h1>
        <p className="text-muted-foreground">Personalize a operação da Vanilc</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-6"
      >
        <Section title="WhatsApp para receber pedidos" Icon={Phone}>
          <Field label="Número (com código do país)">
            <input
              required
              className={inputClass}
              value={s.whatsapp_number}
              onChange={(e) => setS({ ...s, whatsapp_number: e.target.value })}
              placeholder="244900000000"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use apenas dígitos, ex: <code>244912345678</code>. Todos os pedidos
              serão enviados para este número automaticamente.
            </p>
          </Field>
        </Section>

        <Section title="Taxas de entrega" Icon={Truck}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Entrega na cidade (Kz)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={s.delivery_fee_city}
                onChange={(e) => setS({ ...s, delivery_fee_city: Number(e.target.value) })}
              />
            </Field>
            <Field label="Entrega fora da cidade (Kz)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={s.delivery_fee_outside}
                onChange={(e) => setS({ ...s, delivery_fee_outside: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Tempo médio de preparo" Icon={Clock}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mínimo (min)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={s.prep_time_min}
                onChange={(e) => setS({ ...s, prep_time_min: Number(e.target.value) })}
              />
            </Field>
            <Field label="Máximo (min)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={s.prep_time_max}
                onChange={(e) => setS({ ...s, prep_time_max: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Informações da churrasqueira" Icon={MapPin}>
          <Field label="Endereço">
            <input
              className={inputClass}
              value={s.address ?? ""}
              onChange={(e) => setS({ ...s, address: e.target.value })}
            />
          </Field>
          <Field label="Horário de funcionamento">
            <input
              className={inputClass}
              value={s.business_hours ?? ""}
              onChange={(e) => setS({ ...s, business_hours: e.target.value })}
              placeholder="Seg a Dom — 11h às 23h"
            />
          </Field>
        </Section>

        <Section title="Status da loja" Icon={DollarSign}>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="font-semibold">
                {s.store_open ? "Loja aberta" : "Loja fechada"}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.store_open
                  ? "Clientes podem fazer pedidos."
                  : "Pedidos estão bloqueados."}
              </p>
            </div>
            <input
              type="checkbox"
              checked={s.store_open}
              onChange={(e) => setS({ ...s, store_open: e.target.checked })}
              className="h-6 w-6 accent-primary"
            />
          </label>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending} size="lg">
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";

function Section({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
