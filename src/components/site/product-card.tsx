import { Plus } from "lucide-react";
import { resolveProductImage } from "@/lib/product-images";
import { formatKwanza } from "@/lib/format";
import { cart } from "@/lib/cart-store";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";

interface Props {
  product: Product;
  variant?: "compact" | "wide";
}

export function ProductCard({ product, variant = "compact" }: Props) {
  const price = product.is_promo && product.promo_price ? product.promo_price : product.price;
  const onAdd = () => {
    cart.add({
      productId: product.id,
      name: product.name,
      unitPrice: Number(price),
      image: product.image_url,
      weightLabel: product.weight_label,
    });
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  if (variant === "wide") {
    return (
      <article className="group flex overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-flame">
        <img
          src={resolveProductImage(product.image_url)}
          alt={product.name}
          loading="lazy"
          className="h-32 w-32 shrink-0 object-cover transition group-hover:scale-105 sm:h-36 sm:w-36"
        />
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
            <p className="text-lg font-extrabold text-primary">{formatKwanza(price)}</p>
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
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-flame">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={resolveProductImage(product.image_url)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      </div>
      <div className="p-3">
        <h3 className="truncate font-bold text-foreground">{product.name}</h3>
        <p className="text-xs text-muted-foreground">{product.weight_label ?? "—"}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-base font-extrabold text-primary">{formatKwanza(price)}</p>
          <button
            type="button"
            onClick={onAdd}
            disabled={!product.available}
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            aria-label={`Adicionar ${product.name}`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
