import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatKwanza } from "@/lib/format";
import { deleteDeliveryZone, reorderDeliveryZones, saveDeliveryZone } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/zonas")({
  head: () => ({ meta: [{ title: "Zonas de Entrega — Admin Vanilc" }] }),
  component: ZonesPage,
});

interface Zone {
  id: string;
  name: string;
  fee: number;
  active: boolean;
  display_order: number;
}
interface ZoneForm {
  id?: string;
  name: string;
  fee: string;
}

function ZonesPage() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveDeliveryZone);
  const deleteFn = useServerFn(deleteDeliveryZone);
  const reorderFn = useServerFn(reorderDeliveryZones);
  const [editing, setEditing] = useState<ZoneForm | null>(null);
  const [list, setList] = useState<Zone[]>([]);
  const [saved, setSaved] = useState(false);

  const zones = useQuery({
    queryKey: ["admin-delivery-zones"],
    queryFn: async (): Promise<Zone[]> => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("display_order");
      if (error) throw error;
      return (data ?? []).map((z) => ({ ...z, fee: Number(z.fee) }));
    },
  });
  useEffect(() => {
    if (zones.data) setList(zones.data);
  }, [zones.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
    qc.invalidateQueries({ queryKey: ["delivery-zones"] });
  };

  const save = useMutation({
    mutationFn: async (z: { id?: string; name?: string; fee?: number; active?: boolean }) => {
      const current = list.find((l) => l.id === z.id);
      await saveFn({
        data: {
          id: z.id,
          name: z.name ?? current?.name ?? "",
          fee: z.fee ?? current?.fee ?? 0,
          active: z.active ?? current?.active,
        },
      });
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success("Zona guardada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Zona eliminada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = list.findIndex((z) => z.id === active.id);
    const newI = list.findIndex((z) => z.id === over.id);
    const next = arrayMove(list, oldI, newI);
    setList(next);
    try {
      await reorderFn({ data: { ids: next.map((z) => z.id) } });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar");
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Zonas de Entrega</h1>
          <p className="text-muted-foreground">
            Defina as áreas de entrega e as respetivas taxas. Arraste para reordenar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary motion-pop">
              <Check className="h-4 w-4" /> Guardado
            </span>
          )}
          <Button onClick={() => setEditing({ name: "", fee: "" })}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar zona
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        {list.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            {zones.isLoading ? "A carregar..." : "Nenhuma zona criada ainda."}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={list.map((z) => z.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border">
                {list.map((z) => (
                  <ZoneRow
                    key={z.id}
                    zone={z}
                    onToggle={(active) => {
                      setList((l) => l.map((x) => (x.id === z.id ? { ...x, active } : x)));
                      save.mutate({ id: z.id, active });
                    }}
                    onEdit={() => setEditing({ id: z.id, name: z.name, fee: String(z.fee) })}
                    onDelete={() => {
                      if (confirm(`Eliminar a zona "${z.name}"? Pedidos antigos não são afetados.`))
                        remove.mutate(z.id);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-foreground/40 p-4" onClick={() => setEditing(null)}>
          <div
            className="mx-auto mt-20 max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Editar" : "Nova"} zona</h2>
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
                const fee = Number(editing.fee);
                if (!Number.isFinite(fee) || fee < 0) return toast.error("Taxa inválida");
                save.mutate({ id: editing.id, name: editing.name.trim(), fee });
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Nome</span>
                <input
                  required
                  maxLength={100}
                  placeholder="Ex: Samba"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Taxa (Kz)</span>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                  value={editing.fee}
                  onChange={(e) => setEditing({ ...editing, fee: e.target.value })}
                />
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

function ZoneRow({
  zone,
  onToggle,
  onEdit,
  onDelete,
}: {
  zone: Zone;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: zone.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-3 bg-card px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
        className="grid h-8 w-8 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${zone.active ? "" : "text-muted-foreground line-through"}`}>
          {zone.name}
        </p>
      </div>
      <span className="w-28 text-right font-semibold tabular-nums text-primary">
        {formatKwanza(zone.fee)}
      </span>
      <Switch checked={zone.active} onCheckedChange={onToggle} aria-label="Ativa" />
      <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
