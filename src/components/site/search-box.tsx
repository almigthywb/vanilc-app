import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { productsQuery, type Product } from "@/lib/queries";
import { resolveProductImage } from "@/lib/product-images";
import { formatKwanza } from "@/lib/format";
import { ProductDetailModal } from "./product-detail-modal";
import { cn } from "@/lib/utils";

interface Props {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function SearchBox({ placeholder = "Buscar produtos...", className, autoFocus, onClose }: Props) {
  const { data: products = [] } = useQuery(productsQuery);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [] as Product[];
    return products
      .filter((p) => normalize(p.name).includes(q) || normalize(p.description ?? "").includes(q))
      .slice(0, 8);
  }, [query, products]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSelect = (p: Product) => {
    setSelected(p);
    setOpen(false);
    setQuery("");
    onClose?.();
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus={autoFocus}
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-12 w-full rounded-full border border-border bg-muted/40 pl-11 pr-10 text-sm outline-none transition focus:border-primary focus:bg-card"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-muted"
            aria-label="Limpar"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            {results.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Produto indisponível
              </div>
            ) : (
              <ul className="py-2">
                {results.map((p) => {
                  const price = p.is_promo && p.promo_price ? p.promo_price : p.price;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted"
                      >
                        <img
                          src={resolveProductImage(p.image_url)}
                          alt={p.name}
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                          {!p.available && (
                            <p className="text-xs text-destructive">Indisponível</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-bold text-primary">
                          {formatKwanza(price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {selected && (
        <ProductDetailModal
          product={selected}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
        />
      )}
    </>
  );
}
