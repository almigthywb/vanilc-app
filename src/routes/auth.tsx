import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Flame, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/vanilc-logo.png";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Vanilc Admin" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Conta criada! Você está autenticado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <img src={logo} alt="Vanilc" className="h-28 w-auto sm:h-32" />
        </Link>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Painel administrativo</h1>
              <p className="text-xs text-muted-foreground">
                Acesso exclusivo para a equipe Vanilc
              </p>
            </div>
          </div>

          <div className="mb-4 flex rounded-full border border-border bg-muted p-1 text-sm font-semibold">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                type="button"
                className={[
                  "flex-1 rounded-full px-4 py-2 transition",
                  mode === m
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                E-mail
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Senha
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </label>
            <Button
              type="submit"
              disabled={loading || isLoading}
              className="h-12 w-full text-base font-bold"
            >
              {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Primeira vez? Crie uma conta e clique em "Tornar-me admin" no painel.
          </p>
        </div>
        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao site
        </Link>
      </div>
      </div>
      <SiteFooter />
    </div>
  );

}
