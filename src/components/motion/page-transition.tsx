import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Envolve o conteúdo de uma página e reanima a cada navegação.
 * Usa apenas transform/opacity + scroll suave para o topo.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div key={pathname} className="motion-page">
      {children}
    </div>
  );
}
