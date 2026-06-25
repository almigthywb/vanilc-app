import { useQuery } from "@tanstack/react-query";
import { X, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden border-border bg-card p-0 shadow-flame",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          isMobile
            ? "h-[100dvh] w-screen max-w-none rounded-none"
            : "w-[92vw] max-w-[900px] rounded-3xl",
        )}
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          {product.description ?? `Detalhes de ${product.name}`}
        </DialogDescription>

        <div className={cn("flex h-full", isMobile ? "flex-col" : "flex-row")}>
          {/* Image */}
          <div
            className={cn(
              "group relative overflow-hidden bg-muted",
              isMobile ? "h-72 w-full shrink-0" : "w-1/2 shrink-0",
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
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
            {category && (
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {category.name}
              </p>
            )}
            <h2 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">
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

            <div className="mt-6 flex items-baseline gap-3">
              {product.is_promo && product.promo_price && (
                <span className="text-base text-muted-foreground line-through">
                  {formatKwanza(product.price)}
                </span>
              )}
              <span className="text-3xl font-extrabold text-primary sm:text-4xl">
                {formatKwanza(price)}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-destructive bg-transparent px-5 text-sm font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
                Fechar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!product.available}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-flame transition hover:bg-primary/90 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
