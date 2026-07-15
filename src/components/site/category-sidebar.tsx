import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Drumstick, Beef, Soup, Wine, Salad, Tag, Flame, X } from "lucide-react";
import type { Category } from "@/lib/queries";

interface Props {
  categories: Category[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  destaques: Home,
  carnes: Beef,
  combos: Drumstick,
  porcoes: Soup,
  acompanhamentos: Salad,
  bebidas: Wine,
  sobremesas: Tag,
  promocoes: Tag,
};

export function CategorySidebar({ categories, mobileOpen, onCloseMobile }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const content = (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        to="/"
        onClick={onCloseMobile}
        className={navLinkClass(path === "/")}
      >
        <Home className="h-5 w-5" /> Início
      </Link>
      {categories.map((cat) => {
        const isPromo = cat.slug === "promocoes";
        const Icon = isPromo ? Flame : (ICONS[cat.slug] ?? Beef);
        const active = path === `/cardapio/${cat.slug}`;
        return (
          <Link
            key={cat.id}
            to="/cardapio/$slug"
            params={{ slug: cat.slug }}
            onClick={onCloseMobile}
            className={navLinkClass(active)}
          >
            <Icon className="h-5 w-5" /> {cat.name}
          </Link>
        );
      })}

      <div className="mt-6 rounded-2xl bg-accent/60 p-4 text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-card text-primary">
          <Flame className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-foreground">
          O melhor sabor do churrasco,
        </p>
        <p className="text-sm font-bold text-primary">na palma da sua mão.</p>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-20">{content}</div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 lg:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <p className="font-bold text-foreground">Categorias</p>
              <button
                onClick={onCloseMobile}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function navLinkClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
    active
      ? "bg-accent text-primary"
      : "text-foreground hover:bg-muted",
  ].join(" ");
}
