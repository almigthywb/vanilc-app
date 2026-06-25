import { useQuery } from "@tanstack/react-query";
import { X, ShoppingCart } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { resolveProductImage } from "@/lib/product-images";
import { formatKwanza } from "@/lib/format";
import { cart } from "@/lib/cart-store";
import { categoriesQuery, type Product } from "@/lib/queries";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({ product, open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const { data: categories } = useQuery(categoriesQuery);
  const category = categories?.find((c) => c.id === product.category_id);
  const price =
    product.is_promo && product.promo_price ? product.promo_price : product.price;

  const handleAdd = () => {
    cart.add({
      productId: product.id,
      name: product.name,
      unitPrice: Number(price),
      image: product.image_url,
      weightLabel: product.weight_label,
    });
    toast.success(`${product.name} adicionado ao carrinho`);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-300",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 overflow-hidden bg-card shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "duration-300",
            isMobile
              ? [
                  // Centered with margins, ~82dvh, slides up from bottom
                  "left-4 right-4 top-[4vh] mx-auto max-h-[82dvh] rounded-[24px]",
                  "data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8",
                  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                ]
              : [
                  "left-[50%] top-[50%] w-[92vw] max-w-[900px] translate-x-[-50%] translate-y-[-50%] rounded-3xl",
                  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                  "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                ],
          )}
        >
          <DialogPrimitive.Title className="sr-only">{product.name}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {product.description ?? `Detalhes de ${product.name}`}
          </DialogPrimitive.Description>

          <div
            className={cn(
              "flex max-h-[82dvh] sm:max-h-none",
              isMobile ? "flex-col" : "h-full flex-row",
            )}
          >
            {/* Close button (X) — always visible, larger on mobile */}
            <DialogPrimitive.Close
              aria-label="Fechar"
              className={cn(
                "absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full",
                "bg-background/90 text-foreground shadow-md backdrop-blur",
                "transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring",
                isMobile ? "h-11 w-11" : "h-9 w-9",
              )}
            >
              <X className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
            </DialogPrimitive.Close>

            {/* Image */}
            <div
              className={cn(
                "group relative overflow-hidden bg-muted",
                isMobile ? "h-60 w-full shrink-0" : "w-1/2 shrink-0",
              )}
            >
              <img
                src={resolveProductImage(product.image_url)}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              {product.is_promo && (
                <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  Promoção
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5 sm:p-8">
              {category && (
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {category.name}
                </p>
              )}
              <h2 className="mt-1 font-display text-2xl text-foreground sm:text-4xl">
                {product.name}
              </h2>
              {product.weight_label && (
                <p className="mt-1 text-sm text-muted-foreground">{product.weight_label}</p>
              )}

              {product.description && (
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                  {product.description}
                </p>
              )}

              <div className="mt-5 flex items-baseline gap-3">
                {product.is_promo && product.promo_price && (
                  <span className="text-base text-muted-foreground line-through">
                    {formatKwanza(product.price)}
                  </span>
                )}
                <span className="text-3xl font-extrabold text-primary sm:text-4xl">
                  {formatKwanza(price)}
                </span>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
                {!isMobile && (
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-destructive bg-transparent px-5 text-sm font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                    Fechar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!product.available}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-flame transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
