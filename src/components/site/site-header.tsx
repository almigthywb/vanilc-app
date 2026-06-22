import { Link } from "@tanstack/react-router";
import { HelpCircle, Search, ShoppingCart, User, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/vanilc-logo.png";
import { useCart, cartCount } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";

interface Props {
  onOpenCart: () => void;
  onOpenMenu?: () => void;
}

export function SiteHeader({ onOpenCart, onOpenMenu }: Props) {
  const items = useCart();
  const count = cartCount(items);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-3 px-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-foreground hover:bg-muted lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="shrink-0">
          <img
            src={logo}
            alt="Vanilc Churrascaria"
            className="h-14 w-auto sm:h-16"
            width={240}
            height={160}
          />
        </Link>

        <div className="ml-2 hidden items-center gap-2 lg:flex">
          <MapPin className="h-5 w-5 text-primary" />
          <div className="text-xs leading-tight">
            <p className="text-muted-foreground">Entregar em:</p>
            <p className="font-semibold text-foreground">Luanda, Angola</p>
          </div>
        </div>

        <div className="ml-auto flex flex-1 items-center justify-end gap-1 sm:gap-3">
          <div className="hidden flex-1 max-w-xl md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar produtos..."
                className="h-12 w-full rounded-full border border-border bg-muted/40 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-card"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md text-foreground hover:bg-muted md:hidden"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/auth"
            className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted sm:flex"
          >
            <HelpCircle className="h-4 w-4" /> Ajuda
          </Link>
          <Link
            to="/auth"
            className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted sm:flex"
          >
            <User className="h-4 w-4" /> Entrar
          </Link>

          <Button
            type="button"
            onClick={onOpenCart}
            variant="default"
            size="lg"
            className="relative h-12 rounded-full px-4 sm:px-6 font-bold"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline ml-2">Carrinho</span>
            {count > 0 && (
              <span className="ml-2 grid h-6 w-6 place-items-center rounded-full bg-card text-xs font-bold text-primary">
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-card px-3 py-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              placeholder="Buscar produtos..."
              className="h-11 w-full rounded-full border border-border bg-muted/40 pl-11 pr-10 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
