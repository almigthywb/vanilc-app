import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  ShoppingBag,
  Beef,
  FolderTree,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Flame,
  Power,
  PowerOff,
  ShieldAlert,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import logo from "@/assets/vanilc-logo.png";
import { SiteFooter } from "@/components/site/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/queries";
import { getCurrentRole, claimFirstAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const NAV: Array<{ to: string; label: string; Icon: React.ComponentType<{ className?: string }>; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", Icon: ShoppingBag },
  { to: "/admin/produtos", label: "Produtos", Icon: Beef },
  { to: "/admin/categorias", label: "Categorias", Icon: FolderTree },
  { to: "/admin/clientes", label: "Clientes", Icon: Users },
  { to: "/admin/relatorios", label: "Relatórios", Icon: BarChart3 },
  { to: "/admin/configuracoes", label: "Configurações", Icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const role = useQuery({
    queryKey: ["admin-role"],
    queryFn: useServerFn(getCurrentRole),
  });
  const settings = useQuery(settingsQuery);

  const claim = useServerFn(claimFirstAdmin);
  const claimMutation = useMutation({
    mutationFn: claim,
    onSuccess: (res) => {
      if (res.granted) {
        toast.success("Você agora é administrador!");
        queryClient.invalidateQueries({ queryKey: ["admin-role"] });
      } else {
        toast.error(res.reason ?? "Não foi possível.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const toggleStore = useMutation({
    mutationFn: async () => {
      const current = settings.data?.store_open ?? true;
      const { error } = await supabase
        .from("settings")
        .update({ store_open: !current })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Estado da loja atualizado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      try {
        // Remove any lingering Supabase auth tokens
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            window.localStorage.removeItem(key);
          }
        }
        for (const key of Object.keys(window.sessionStorage)) {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            window.sessionStorage.removeItem(key);
          }
        }
      } catch {
        // storage may be unavailable
      }
    }
    setUser(null);
    navigate({ to: "/auth", replace: true });
    if (typeof window !== "undefined") {
      // Hard reload to ensure no in-memory state remains and back button can't restore
      setTimeout(() => window.location.replace("/auth"), 0);
    }
  };

  const isAdmin = role.data?.isAdmin ?? false;
  const storeOpen = settings.data?.store_open ?? true;

  const sidebarContent = (
    <>
      <div className="flex items-center justify-center border-b border-border p-4">
        <img src={logo} alt="Vanilc" className="h-16 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, label, Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to as never}
              onClick={() => setOpen(false)}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-card shadow-card lg:flex">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button
              variant={storeOpen ? "default" : "outline"}
              size="sm"
              disabled={toggleStore.isPending || !isAdmin}
              onClick={() => toggleStore.mutate()}
              className={[
                "h-10 rounded-full px-4 font-bold",
                storeOpen ? "" : "border-destructive text-destructive hover:bg-destructive/10",
              ].join(" ")}
            >
              {storeOpen ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
              {storeOpen ? "Aberto" : "Fechado"}
            </Button>

            {user && (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                  <span className="text-sm font-bold">
                    {(user.email ?? "A").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden min-w-0 flex-col leading-tight sm:flex">
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Administrador
                  </span>
                  <span className="max-w-[180px] truncate text-sm font-semibold text-foreground lg:max-w-[240px]">
                    {user.email}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {!role.isLoading && !isAdmin && (
          <div className="m-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 sm:m-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-bold text-destructive">Você ainda não é administrador.</p>
                <p className="text-sm text-muted-foreground">
                  Se este é o primeiro acesso da Vanilc, você pode se tornar o primeiro
                  administrador. Caso contrário, peça a um admin para conceder acesso.
                </p>
                <Button
                  className="mt-3"
                  onClick={() => claimMutation.mutate(undefined)}
                  disabled={claimMutation.isPending}
                >
                  <Flame className="mr-2 h-4 w-4" />
                  Tornar-me administrador
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-6">{isAdmin ? children : null}</main>
        <SiteFooter />
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
