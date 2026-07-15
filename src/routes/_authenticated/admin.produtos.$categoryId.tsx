import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChevronRight, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatKwanza } from "@/lib/format";
import { resolveProductImage } from "@/lib/product-images";
import { deleteAdminProduct, reorderAdminProducts } from "@/lib/admin.functions";
import { toast } from "sonner";
import {
  EMPTY_PRODUCT,
  ProductModal,
  type ProductForm,
} from "@/components/admin/product-modal";

type Filter = "all" | "active" | "inactive" | "newest" | "oldest" | "price_desc" | "price_asc";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "inactive", label: "Inativos" },
  { id: "newest", label: "Mais recentes" },
  { id: "oldest", label: "Mais antigos" },
  { id: "price_desc", label: "Maior preço" },
  { id: "price_asc", label: "Menor preço" },
];

export const Route = createFileRoute("/_authenticated/admin/produtos/$categoryId")({
  component: CategoryProductsPage,
});

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
  is_featured: boolean;
  is_promo: boolean;
  promo_price: number | null;
  discount_percent: number | null;
  weight_label: string | null;
  sort_order: number;
  created_at?: string | null;
}

function CategoryProductsPage() {
  const { categoryId } = Route.useParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const deleteProduct = useServerFn(deleteAdminProduct);
  const reorderProducts = useServerFn(reorderAdminProducts);

  const category = useQuery({
    queryKey: ["admin-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["admin-products", "category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const [localOrder, setLocalOrder] = useState<ProductRow[] | null>(null);
  const baseList = localOrder ?? products.data ?? [];

  const filtered = useMemo(() => {
    const list = [...baseList];
    switch (filter) {
      case "active":
        return list.filter((p) => p.available);
      case "inactive":
        return list.filter((p) => !p.available);
      case "newest":
        return list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      case "oldest":
        return list.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
      case "price_desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "price_asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      default:
        return list;
    }
  }, [baseList, filter]);

  const dndEnabled = filter === "all";

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

  const reorder = useMutation({
    mutationFn: async (items: Array<{ id: string; sort_order: number }>) => {
      await reorderProducts({ data: { items } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ordem atualizada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar ordem"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = baseList;
    const oldIndex = current.findIndex((p) => p.id === active.id);
    const newIndex = current.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(current, oldIndex, newIndex).map((p, i) => ({ ...p, sort_order: i + 1 }));
    setLocalOrder(next);
    reorder.mutate(
      next.map((p) => ({ id: p.id, sort_order: p.sort_order })),
      { onSettled: () => setLocalOrder(null) },
    );
  };

  const toForm = (p: ProductRow): ProductForm => ({
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
  });

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/admin/produtos" className="hover:text-foreground">Produtos</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{category.data?.name ?? "…"}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">{category.data?.name ?? "Categoria"}</h1>
          <p className="text-muted-foreground">
            {(products.data ?? []).length} produto(s) nesta categoria
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              ...EMPTY_PRODUCT,
              category_id: categoryId,
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!dndEnabled && (
        <p className="text-xs text-muted-foreground">
          Selecione "Todos" para reorganizar os produtos por arrastar e soltar.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={filtered.map((p) => p.id)}
          strategy={rectSortingStrategy}
          disabled={!dndEnabled}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <SortableCard
                key={p.id}
                product={p}
                dndEnabled={dndEnabled}
                onEdit={() => setEditing(toForm(p))}
                onDelete={() => {
                  if (confirm(`Remover "${p.name}"?`)) remove.mutate(p.id);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filtered.length === 0 && !products.isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Nenhum produto nesta categoria.
        </div>
      )}

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

function SortableCard({
  product,
  dndEnabled,
  onEdit,
  onDelete,
}: {
  product: ProductRow;
  dndEnabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
    disabled: !dndEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-lg ${
        isDragging ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="relative">
        <img
          src={resolveProductImage(product.image_url)}
          alt={product.name}
          className="h-32 w-full object-cover"
        />
        {dndEnabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            className="absolute left-2 top-2 grid h-8 w-8 cursor-grab place-items-center rounded-lg bg-background/90 text-muted-foreground shadow-sm hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
            product.available
              ? "bg-primary/90 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {product.available ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate font-bold">{product.name}</p>
        <p className="text-sm font-semibold text-primary">
          {formatKwanza(Number(product.price))}
        </p>
        <p className="text-xs text-muted-foreground">
          Ordem #{product.sort_order}
          {product.weight_label ? ` • ${product.weight_label}` : ""}
        </p>

        <div className="mt-2 flex justify-end gap-1">
          <button
            onClick={onEdit}
            aria-label="Editar"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Remover"
            className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
