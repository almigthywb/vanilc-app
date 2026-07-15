import { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveProductImage } from "@/lib/product-images";
import { formatKwanza } from "@/lib/format";
import { saveAdminProduct, uploadAdminMedia } from "@/lib/admin.functions";

export interface ProductForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
  is_featured: boolean;
  is_promo: boolean;
  discount_percent: number | null;
  weight_label: string;
}

export const EMPTY_PRODUCT: ProductForm = {
  name: "",
  description: "",
  price: 0,
  category_id: null,
  image_url: null,
  available: true,
  is_featured: false,
  is_promo: false,
  discount_percent: null,
  weight_label: "",
};

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function ProductModal({
  initial,
  categories,
  onClose,
}: {
  initial: ProductForm;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [f, setF] = useState<ProductForm>(initial);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const saveProduct = useServerFn(saveAdminProduct);
  const uploadMedia = useServerFn(uploadAdminMedia);

  const discount = f.is_promo ? Math.max(0, Math.min(100, f.discount_percent ?? 0)) : 0;
  const promoPrice = f.is_promo && discount > 0 ? Math.round(f.price * (1 - discount / 100)) : null;
  const discountInvalid =
    f.is_promo &&
    (f.discount_percent === null ||
      Number.isNaN(f.discount_percent) ||
      f.discount_percent < 0 ||
      f.discount_percent > 100);

  const save = useMutation({
    mutationFn: async () => {
      if (discountInvalid) throw new Error("Percentual de desconto deve ser entre 0 e 100");
      const payload = {
        name: f.name,
        description: f.description || null,
        price: f.price,
        category_id: f.category_id,
        image_url: f.image_url,
        available: f.available,
        is_featured: f.is_featured,
        is_promo: f.is_promo,
        discount_percent: f.is_promo ? f.discount_percent : null,
        weight_label: f.weight_label || null,
      };
      if (f.id) {
        await saveProduct({ data: { id: f.id, ...payload } });
      } else {
        await saveProduct({ data: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto salvo");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const dataBase64 = btoa(binary);
      const path = `products/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const res = await uploadMedia({
        data: { path, contentType: file.type || "application/octet-stream", dataBase64 },
      });
      setF((s) => ({ ...s, image_url: res.publicUrl }));
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="mx-auto max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{f.id ? "Editar" : "Novo"} produto</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-3"
        >
          <Field label="Nome">
            <input required className={inputClass} value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea rows={2} className={inputClass} value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço (Kz)">
              <input required type="number" step="1" min={0} className={inputClass} value={f.price}
                onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
            </Field>
            <Field label="Peso/porção">
              <input className={inputClass} value={f.weight_label}
                onChange={(e) => setF({ ...f, weight_label: e.target.value })}
                placeholder="500g" />
            </Field>
            <Field label="Categoria">
              <select className={inputClass} value={f.category_id ?? ""}
                onChange={(e) => setF({ ...f, category_id: e.target.value || null })}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Imagem">
              <input type="file" accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
                className="block w-full text-sm" />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              {f.image_url && (
                <img src={resolveProductImage(f.image_url)} alt="" className="mt-2 h-20 w-20 rounded-md object-cover" />
              )}
            </Field>
          </div>

          <div className="grid gap-2">
            <Toggle label="Disponível" checked={f.available} onChange={(v) => setF({ ...f, available: v })} />
            <Toggle label="Destaque" checked={f.is_featured} onChange={(v) => setF({ ...f, is_featured: v })} />
            <Toggle
              label="Em promoção"
              checked={f.is_promo}
              onChange={(v) =>
                setF({ ...f, is_promo: v, discount_percent: v ? (f.discount_percent ?? 10) : null })
              }
            />
            {f.is_promo && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <Field label="Percentual de desconto (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    className={inputClass}
                    value={f.discount_percent ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setF({ ...f, discount_percent: v === "" ? null : Number(v) });
                    }}
                    placeholder="20"
                  />
                </Field>
                {discountInvalid && (
                  <p className="text-xs font-medium text-destructive">
                    O desconto deve ser um número entre 0 e 100.
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preço promocional
                  </span>
                  <div className="flex items-baseline gap-2">
                    {promoPrice !== null && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatKwanza(f.price)}
                      </span>
                    )}
                    <span className="text-lg font-extrabold text-primary">
                      {formatKwanza(promoPrice ?? f.price)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending || discountInvalid}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-primary" />
    </label>
  );
}
