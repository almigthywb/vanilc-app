import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldCheck, UserPlus, Loader2, Mail, Calendar, Clock } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listAdmins, createAdmin, removeAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/administradores")({
  component: AdminsPage,
});

const formSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As palavras-passe não coincidem",
    path: ["confirm"],
  });

function AdminsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdmins);
  const create = useServerFn(createAdmin);
  const remove = useServerFn(removeAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: () => list({ data: undefined as never }),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toRemove, setToRemove] = useState<{ userId: string; email: string } | null>(null);

  const createMut = useMutation({
    mutationFn: (d: { email: string; password: string }) => create({ data: d }),
    onSuccess: () => {
      toast.success("Administrador adicionado com sucesso.");
      setEmail("");
      setPassword("");
      setConfirm("");
      setErrors({});
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao adicionar."),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Administrador removido.");
      setToRemove(null);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  useEffect(() => {
    document.title = "Administradores · Vanilc Admin";
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = formSchema.safeParse({ email, password, confirm });
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const iss of res.error.issues) errs[iss.path[0] as string] = iss.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    createMut.mutate({ email: res.data.email, password: res.data.password });
  };

  const admins = data?.admins ?? [];
  const canRemove = admins.length > 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administradores</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quem tem acesso à área administrativa.
        </p>
      </div>

      {/* Add new admin */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Adicionar novo administrador</h2>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              className="mt-1.5"
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-1.5"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar palavra-passe</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5"
            />
            {errors.confirm && (
              <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>
            )}
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={createMut.isPending} className="w-full">
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Adicionar Administrador
            </Button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Administradores cadastrados{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({admins.length})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : admins.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum administrador cadastrado.
          </p>
        ) : (
          <ul className="grid gap-3">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-4 shadow-sm transition hover:border-border sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{a.email}</span>
                      {a.isSelf && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Você
                        </span>
                      )}
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          a.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {a.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Admin
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Criado em {formatDate(a.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Último acesso:{" "}
                        {a.lastSignInAt ? formatDate(a.lastSignInAt) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={a.isSelf || !canRemove}
                    onClick={() => setToRemove({ userId: a.userId, email: a.email })}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    title={
                      a.isSelf
                        ? "Você não pode remover a si mesmo"
                        : !canRemove
                          ? "Deve existir pelo menos um administrador"
                          : undefined
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover{" "}
              <span className="font-semibold text-foreground">{toRemove?.email}</span>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toRemove) removeMut.mutate(toRemove.userId);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
