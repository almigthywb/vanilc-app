import { useState } from "react";
import { Plus, Flame } from "lucide-react";
import { resolveProductImage } from "@/lib/product-images";
import { formatKwanza } from "@/lib/format";
import { cart } from "@/lib/cart-store";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";
import { ProductDetailModal } from "./product-detail-modal";

interface Props {
  product: Product;
  variant?: "compact" | "wide";
}

function PromoBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/80 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg ring-1 ring-primary/20">
      <Flame className="h-3 w-3" strokeWidth={2.5} />
      -{percent}%
    </span>
  );
}

export function ProductCard({ product, variant = "compact" }: Props) {
  const [open, setOpen] = useState(false);
  const onPromo = product.is_promo && product.promo_price != null && product.promo_price < product.price;
  const price = onPromo ? Number(product.promo_price) : Number(product.price);
  const percent = onPromo
    ? product.discount_percent ??
      Math.round((1 - Number(product.promo_price) / Number(product.price)) * 100)
    : 0;

  const onAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    cart.add({
      productId: product.id,
      name: product.name,
      unitPrice: price,
      image: product.image_url,
      weightLabel: product.weight_label,
    });
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const openModal = () => setOpen(true);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  };

  if (variant === "wide") {
    return (
      <>
        <article
          role="button"
          tabIndex={0}
          onClick={openModal}
          onKeyDown={onKey}
          className="motion-card group relative flex cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:-translate-y-0.5 hover:shadow-flame focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
            <img
              src={resolveProductImage(product.image_url)}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            {onPromo && (
              <div className="absolute left-2 top-2">
                <PromoBadge percent={percent} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-foreground">{product.name}</h3>
              {product.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {product.description}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="flex flex-col">
                {onPromo && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatKwanza(product.price)}
                  </span>
                )}
                <p className="text-lg font-extrabold text-primary">{formatKwanza(price)}</p>
              </div>
              <button
                type="button"
                onClick={onAdd}
                disabled={!product.available}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>
        </article>
        <ProductDetailModal product={product} open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={onKey}
        className="motion-card group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:-translate-y-1 hover:shadow-flame focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={resolveProductImage(product.image_url)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
          {onPromo && (
            <div className="absolute left-2 top-2">
              <PromoBadge percent={percent} />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate font-bold text-foreground">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{product.weight_label ?? "—"}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col leading-tight">
              {onPromo && (
                <span className="truncate text-[11px] text-muted-foreground line-through">
                  {formatKwanza(product.price)}
                </span>
              )}
              <p className="truncate text-base font-extrabold text-primary">{formatKwanza(price)}</p>
            </div>
            <button
              type="button"
              onClick={onAdd}
              disabled={!product.available}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              aria-label={`Adicionar ${product.name}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </article>
      <ProductDetailModal product={product} open={open} onOpenChange={setOpen} />
    </>
  );
}
