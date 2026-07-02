import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatKwanza } from "@/lib/format";
import { resolveProductImage } from "@/lib/product-images";
import { deleteAdminProduct, saveAdminProduct, uploadAdminMedia } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProductsPage,
});

interface ProductForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
  is_featured: boolean;
  is_promo: boolean;
  promo_price: number | null;
  weight_label: string;
}

const EMPTY: ProductForm = {
  name: "",
  description: "",
  price: 0,
  category_id: null,
  image_url: null,
  available: true,
  is_featured: false,
  is_promo: false,
  promo_price: null,
  weight_label: "",
};

function ProductsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const deleteProduct = useServerFn(deleteAdminProduct);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteProduct({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Produtos</h1>
          <p className="text-muted-foreground">Gerencie o cardápio da Vanilc</p>
        </div>
        <Button onClick={() => setEditing(EMPTY)}>
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(products.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
          >
            <img
              src={resolveProductImage(p.image_url)}
              alt={p.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              <p className="text-sm text-primary font-semibold">
                {formatKwanza(Number(p.price))}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.available ? "Disponível" : "Indisponível"} • {p.weight_label ?? "—"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() =>
                  setEditing({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? "",
                    price: Number(p.price),
                    category_id: p.category_id,
                    image_url: p.image_url,
                    available: p.available,
                    is_featured: p.is_featured,
                    is_promo: p.is_promo,
                    promo_price: p.promo_price !== null ? Number(p.promo_price) : null,
                    weight_label: p.weight_label ?? "",
                  })
                }
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remover "${p.name}"?`)) remove.mutate(p.id);
                }}
                className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductModal
          initial={editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ProductModal({
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

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name,
        description: f.description || null,
        price: f.price,
        category_id: f.category_id,
        image_url: f.image_url,
        available: f.available,
        is_featured: f.is_featured,
        is_promo: f.is_promo,
        promo_price: f.is_promo ? f.promo_price : null,
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
      const path = `products/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const { error } = await supabase.storage.from("vanilc-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("vanilc-media").getPublicUrl(path);
      setF((s) => ({ ...s, image_url: data.publicUrl }));
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
            <input
              required
              className={inputClass}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Descrição">
            <textarea
              rows={2}
              className={inputClass}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço (Kz)">
              <input
                required
                type="number"
                step="1"
                min={0}
                className={inputClass}
                value={f.price}
                onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Peso/porção">
              <input
                className={inputClass}
                value={f.weight_label}
                onChange={(e) => setF({ ...f, weight_label: e.target.value })}
                placeholder="500g"
              />
            </Field>
            <Field label="Categoria">
              <select
                className={inputClass}
                value={f.category_id ?? ""}
                onChange={(e) => setF({ ...f, category_id: e.target.value || null })}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Imagem">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
                className="block w-full text-sm"
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              {f.image_url && (
                <img src={resolveProductImage(f.image_url)} alt="" className="mt-2 h-20 w-20 rounded-md object-cover" />
              )}
            </Field>
          </div>

          <div className="grid gap-2">
            <Toggle
              label="Disponível"
              checked={f.available}
              onChange={(v) => setF({ ...f, available: v })}
            />
            <Toggle
              label="Destaque"
              checked={f.is_featured}
              onChange={(v) => setF({ ...f, is_featured: v })}
            />
            <Toggle
              label="Em promoção"
              checked={f.is_promo}
              onChange={(v) => setF({ ...f, is_promo: v })}
            />
            {f.is_promo && (
              <Field label="Preço promocional (Kz)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={f.promo_price ?? 0}
                  onChange={(e) => setF({ ...f, promo_price: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}
