import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { deleteAdminCategory, saveAdminCategory } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriesPage,
});

interface CatForm {
  id?: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
}

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CatForm | null>(null);
  const saveCategory = useServerFn(saveAdminCategory);
  const deleteCategory = useServerFn(deleteAdminCategory);

  const cats = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (c: CatForm) => {
      const payload = { name: c.name, slug: c.slug, sort_order: c.sort_order, active: c.active };
      if (c.id) {
        await saveCategory({ data: { id: c.id, ...payload } });
      } else {
        await saveCategory({ data: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria salva");
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteCategory({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Categorias</h1>
          <p className="text-muted-foreground">Organize o cardápio em categorias</p>
        </div>
        <Button
          onClick={() =>
            setEditing({ name: "", slug: "", sort_order: (cats.data?.length ?? 0) + 1, active: true })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Nova categoria
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(cats.data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.sort_order}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3">{c.active ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() =>
                        setEditing({
                          id: c.id,
                          name: c.name,
                          slug: c.slug,
                          sort_order: c.sort_order,
                          active: c.active,
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${c.name}"?`)) remove.mutate(c.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={() => setEditing(null)}>
          <div
            className="mx-auto mt-20 max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Editar" : "Nova"} categoria</h2>
              <button
                onClick={() => setEditing(null)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Nome</span>
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Slug</span>
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Ordem</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-5 w-5 accent-primary"
                />
                <span>Ativa</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
