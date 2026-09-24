import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Save, Phone, MapPin, Clock, Truck, DollarSign, Image as ImageIcon, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { uploadAdminMedia } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { adminSettingsQuery, type Settings } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery(adminSettingsQuery);

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
          banner_url_desktop: s.banner_url_desktop,
          banner_url_mobile: s.banner_url_mobile,
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
          <p className="text-sm text-muted-foreground">
            As taxas agora são definidas por zona em{" "}
            <a href="/admin/zonas" className="font-semibold text-primary underline">
              Zonas de Entrega
            </a>
            .
          </p>
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

        <Section title="Banner da Página Inicial" Icon={ImageIcon}>
          <div className="grid gap-4 md:grid-cols-2">
            <BannerUpload
              label="Banner Desktop (PC)"
              hint="Recomendado: 1920 × 700 px para melhor qualidade em computadores."
              aspect="aspect-[16/7]"
              value={s.banner_url_desktop}
              onChange={(url) => setS({ ...s, banner_url_desktop: url })}
              storagePath="banners/desktop"
            />
            <BannerUpload
              label="Banner Mobile"
              hint="Recomendado: 1080 × 1350 px para melhor visualização em smartphones."
              aspect="aspect-[4/5]"
              value={s.banner_url_mobile}
              onChange={(url) => setS({ ...s, banner_url_mobile: url })}
              storagePath="banners/mobile"
            />
          </div>
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

function BannerUpload({
  label,
  hint,
  aspect,
  value,
  onChange,
  storagePath,
}: {
  label: string;
  hint: string;
  aspect: string;
  value: string | null;
  onChange: (url: string | null) => void;
  storagePath: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const uploadMedia = useServerFn(uploadAdminMedia);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const dataBase64 = btoa(binary);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${storagePath}-${Date.now()}.${ext}`;
      const res = await uploadMedia({
        data: { path, contentType: file.type, dataBase64 },
      });
      onChange(res.publicUrl);
      toast.success("Imagem enviada. Lembre-se de salvar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative ${aspect} w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/60"
        }`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-center text-xs text-muted-foreground">
            <div>
              <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Arraste e solte ou clique para enviar</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" /> Alterar Banner
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remover
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
