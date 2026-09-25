import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  head: () => ({ meta: [
    { title: "Produtos — Vanilc Admin" },
    { name: "description", content: "Escolha uma categoria para gerenciar os produtos Vanilc." },
    { property: "og:title", content: "Produtos — Vanilc Admin" },
    { property: "og:description", content: "Escolha uma categoria para gerenciar os produtos Vanilc." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProductsCategoriesPage,
});

function ProductsCategoriesPage() {
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,category_id").order("sort_order");
      return data ?? [];
    },
  });

  const countBy = (id: string) =>
    (products.data ?? []).filter((p) => p.category_id === id).length;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Produtos</span>
      </nav>

      <div>
        <h1 className="font-display text-4xl">Produtos</h1>
        <p className="text-muted-foreground">Selecione uma categoria para gerenciar seus produtos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(categories.data ?? []).map((c) => {
          const count = countBy(c.id);
          return (
            <Link
              key={c.id}
              to="/admin/produtos/$categoryId"
              params={{ categoryId: c.id }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
            >
              {c.image_url ? (
                <img
                  src={resolveProductImage(c.image_url)}
                  alt={c.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FolderTree className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {count} {count === 1 ? "produto" : "produtos"}
                </p>
                {!c.active && (
                  <p className="mt-1 text-xs text-muted-foreground">Categoria inativa</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      {(categories.data ?? []).length === 0 && !categories.isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Nenhuma categoria cadastrada. Crie categorias em <Link to="/admin/categorias" className="text-primary underline">Categorias</Link>.
        </div>
      )}
    </div>
  );
}
