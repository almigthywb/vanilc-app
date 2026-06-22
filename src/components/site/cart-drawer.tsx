import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X, ShoppingBag, Bike } from "lucide-react";
import {
  cart,
  cartSubtotal,
  useCart,
  type CartItem,
} from "@/lib/cart-store";
import { formatKwanza } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { resolveProductImage } from "@/lib/product-images";
import type { Settings } from "@/lib/queries";

interface Props {
  open: boolean;
  onClose: () => void;
  settings?: Settings;
}

export function CartDrawer({ open, onClose, settings }: Props) {
  const items = useCart();
  const navigate = useNavigate();
  const subtotal = cartSubtotal(items);
  const deliveryFee = settings?.delivery_fee_city ?? 0;
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);
  const storeOpen = settings?.store_open ?? true;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        aria-hidden={!open}
      >
        <CartContents
          items={items}
          subtotal={subtotal}
          total={total}
          deliveryFee={deliveryFee}
          storeOpen={storeOpen}
          prepTimeMin={settings?.prep_time_min ?? 30}
          prepTimeMax={settings?.prep_time_max ?? 60}
          onClose={onClose}
          onCheckout={() => {
            onClose();
            navigate({ to: "/checkout" });
          }}
        />
      </aside>
    </>
  );
}

function CartContents({
  items,
  subtotal,
  deliveryFee,
  total,
  storeOpen,
  prepTimeMin,
  prepTimeMax,
  onClose,
  onCheckout,
}: {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  storeOpen: boolean;
  prepTimeMin: number;
  prepTimeMax: number;
  onClose: () => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Meu carrinho{" "}
            <span className="text-muted-foreground">({items.length})</span>
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              onClick={() => cart.clear()}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label="Esvaziar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingBag className="mb-3 h-12 w-12 opacity-50" />
            <p className="font-medium text-foreground">Carrinho vazio</p>
            <p className="text-sm">Adicione produtos para começar</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <img
                  src={resolveProductImage(item.image)}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {item.name}
                  </p>
                  {item.weightLabel && (
                    <p className="text-xs text-muted-foreground">
                      {item.weightLabel}
                    </p>
                  )}
                  <p className="mt-1 font-bold text-primary">
                    {formatKwanza(item.unitPrice)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => cart.setQty(item.id, item.qty - 1)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-muted"
                    aria-label="Diminuir"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => cart.setQty(item.id, item.qty + 1)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <footer className="border-t border-border p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatKwanza(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="font-semibold">{formatKwanza(deliveryFee)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-extrabold text-primary">
              {formatKwanza(total)}
            </span>
          </div>

          {!storeOpen && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive text-center">
              Estamos fechados no momento.
            </p>
          )}

          <Button
            className="h-12 w-full text-base font-bold"
            onClick={onCheckout}
            disabled={!storeOpen}
          >
            Finalizar pedido
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/" onClick={onClose}>
              Continuar comprando
            </Link>
          </Button>

          <div className="flex items-center gap-3 rounded-xl bg-accent/60 px-3 py-3 text-sm">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-card text-primary">
              <Bike className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-xs text-muted-foreground">Previsão de entrega</p>
              <p className="font-bold text-foreground">
                {prepTimeMin} - {prepTimeMax} min
              </p>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
