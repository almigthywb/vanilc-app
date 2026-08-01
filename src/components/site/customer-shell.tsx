import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CategorySidebar } from "./category-sidebar";
import { CartDrawer } from "./cart-drawer";
import { categoriesQuery, settingsQuery } from "@/lib/queries";
import { PageTransition } from "@/components/motion/page-transition";

export function CustomerShell({ children }: { children: ReactNode }) {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onOpenCart={() => setCartOpen(true)} onOpenMenu={() => setMenuOpen(true)} />

      {!settings.store_open && (
        <div className="bg-destructive text-destructive-foreground">
          <div className="mx-auto max-w-[1600px] px-4 py-2 text-center text-sm font-semibold">
            🔥 Estamos fechados no momento. Volte mais tarde para fazer seu pedido!
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        <CategorySidebar
          categories={categories}
          mobileOpen={menuOpen}
          onCloseMobile={() => setMenuOpen(false)}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <SiteFooter />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} settings={settings} />
      <Toaster position="top-center" />
    </div>
  );
}
