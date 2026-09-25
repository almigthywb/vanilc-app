import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CustomerShell } from "@/components/site/customer-shell";
import { cart, useCart, cartSubtotal } from "@/lib/cart-store";
import { settingsQuery, deliveryZonesQuery } from "@/lib/queries";
import { formatKwanza } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/lib/orders.functions";
import { toast } from "sonner";
import { PhoneInput, isValidPhone } from "@/components/site/phone-input";
import tpaCashImage from "@/assets/payment-tpa-cash.png.asset.json";
import multicaixaImage from "@/assets/payment-multicaixa-express.png.asset.json";

type DeliveryType = "pickup" | "delivery";
type Payment = "tpa_cash";

const PAYMENT_LABEL: Record<Payment, string> = {
  tpa_cash: "TPA / Cash",
};

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  pickup: "Retirar na churrasqueira",
  delivery: "Entrega",
};



export const Route = createFileRoute("/checkout")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(deliveryZonesQuery),
    ]),
  head: () => ({ meta: [
    { title: "Finalizar pedido — Vanilc" },
    { name: "description", content: "Confirme o seu pedido Vanilc, escolha retirada ou entrega e pague com TPA ou dinheiro." },
    { property: "og:title", content: "Finalizar pedido — Vanilc" },
    { property: "og:description", content: "Confirme o seu pedido Vanilc, escolha retirada ou entrega e pague com TPA ou dinheiro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <CustomerShell>
      <CheckoutPage />
    </CustomerShell>
  ),
});

function CheckoutPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: zones } = useSuspenseQuery(deliveryZonesQuery);
  const items = useCart();
  const subtotal = cartSubtotal(items);
  const navigate = useNavigate();
  const createOrderFn = useServerFn(createOrder);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+244");
  const [phone, setPhone] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [zoneId, setZoneId] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [payment, setPayment] = useState<Payment>("tpa_cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
  const deliveryFee = deliveryType === "delivery" && selectedZone ? selectedZone.fee : 0;
  const total = subtotal + deliveryFee;

  if (!settings.store_open) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-3xl">Estamos fechados no momento.</h1>
        <p className="mt-2 text-muted-foreground">Volte mais tarde para fazer o seu pedido.</p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-3xl">Seu carrinho está vazio</h1>
        <Button asChild className="mt-6">
          <Link to="/">Ver cardápio</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (deliveryType === "delivery" && !selectedZone) {
      toast.error("Selecione a sua área de entrega.");
      return;
    }
    setSubmitting(true);
    try {
      const fullPhone = `${dialCode} ${phone.trim()}`.trim();
      const result = await createOrderFn({
        data: {
          firstName,
          lastName,
          phone: fullPhone,
          deliveryType,
          deliveryZoneId: deliveryType === "delivery" ? zoneId : null,
          referencePoint: deliveryType === "delivery" ? referencePoint : "",
          paymentMethod: payment,
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })),
        },
      });
      const msg = buildWhatsAppMessage({
        orderNumber: result.orderNumber,
        firstName,
        lastName,
        phone: fullPhone,

        deliveryType,
        zoneName: result.zoneName ?? "",
        referencePoint,
        items,
        payment,
        notes,
        subtotal: result.subtotal,
        deliveryFee: result.deliveryFee,
        total: result.total,
      });
      const wa = `https://wa.me/${onlyDigits(result.whatsappNumber)}?text=${encodeURIComponent(msg)}`;
      cart.clear();
      window.open(wa, "_blank");
      toast.success(`Pedido #${result.orderNumber} confirmado!`);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 pb-20 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="font-display text-4xl">Finalizar pedido</h1>

        <Card title="Seus dados">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primeiro nome" required>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <Field label="Segundo nome">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Telefone" required>
                <PhoneInput
                  dialCode={dialCode}
                  onDialCodeChange={setDialCode}
                  phone={phone}
                  onPhoneChange={setPhone}
                  required
                  error={
                    phone.length > 0 && !isValidPhone(phone)
                      ? "Introduza um número de telefone válido."
                      : undefined
                  }
                />
              </Field>
            </div>


          </div>
        </Card>

        <Card title="Tipo de entrega">
          <div className="space-y-2">
            {(Object.keys(DELIVERY_LABEL) as DeliveryType[]).map((opt) => (
              <label
                key={opt}
                className={[
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition",
                  deliveryType === opt ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryType === opt}
                    onChange={() => setDeliveryType(opt)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{DELIVERY_LABEL[opt]}</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {opt === "pickup" ? "Grátis" : selectedZone ? formatKwanza(selectedZone.fee) : "Conforme a área"}
                </span>
              </label>
            ))}
          </div>
          {deliveryType === "delivery" && (
            <Field label="Selecione a sua área" required>
              {zones.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  De momento não há zonas de entrega disponíveis.
                </p>
              ) : (
                <select
                  required
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Selecione a sua área
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {formatKwanza(z.fee)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          {deliveryType === "delivery" && selectedZone && (
            <Field label="Ponto de referência">
              <textarea
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                maxLength={300}
                rows={2}
                className={inputClass}
                placeholder="Ex: perto do mercado, portão azul, ..."
              />
            </Field>
          )}
        </Card>

        <Card title="Forma de pagamento">
          <div className="mx-auto grid max-w-[410px] grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Forma de pagamento">
            <Button
              type="button"
              variant="outline"
              aria-pressed={payment === "tpa_cash"}
              onClick={() => setPayment("tpa_cash")}
              className={`aspect-square h-auto min-w-0 w-full flex-col gap-0 overflow-hidden rounded-lg border-2 bg-cream p-2 shadow-card hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring ${payment === "tpa_cash" ? "border-primary" : "border-border"}`}
            >
              <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                <img src={tpaCashImage.url} alt="Terminal TPA e pagamento em dinheiro" className="max-h-full w-full object-contain" />
              </span>
              <span className="w-full shrink-0 whitespace-normal py-2 text-center text-sm font-semibold leading-tight text-foreground">TPA / Cash</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={false}
              onClick={() => toast("Indisponível")}
              className="aspect-square h-auto min-w-0 w-full flex-col gap-0 overflow-hidden rounded-lg border-2 border-border bg-cream p-2 shadow-card hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                <img src={multicaixaImage.url} alt="Logotipo Multicaixa Express" className="max-h-full w-full object-contain" />
              </span>
              <span className="w-full shrink-0 whitespace-normal py-2 text-center text-sm font-semibold leading-tight text-foreground">Multicaixa Express</span>
            </Button>
          </div>
        </Card>

        <Card title="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ponto da carne, sem cebola, etc."
            className={inputClass}
          />
        </Card>
      </div>

      {/* Summary sidebar */}
      <aside className="space-y-4">
        <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-2xl">Resumo</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-semibold">{i.qty}x </span>
                  <span className="truncate">{i.name}</span>
                </span>
                <span className="shrink-0 font-medium">
                  {formatKwanza(i.unitPrice * i.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={formatKwanza(subtotal)} />
            <Row label="Taxa de entrega" value={formatKwanza(deliveryFee)} />
            <Row label="Pagamento" value={PAYMENT_LABEL[payment]} />
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold text-primary">{formatKwanza(total)}</span>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="mt-5 h-12 w-full text-base font-bold"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {submitting ? "Enviando..." : "Confirmar pedido"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Você será redirecionado para o WhatsApp.
          </p>
        </div>
      </aside>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

interface BuildArgs {
  orderNumber: number;
  firstName: string;
  lastName: string;
  phone: string;
  deliveryType: DeliveryType;
  zoneName: string;
  referencePoint: string;
  items: Array<{ name: string; qty: number; unitPrice: number; notes?: string }>;
  payment: Payment;
  notes: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

function buildWhatsAppMessage(a: BuildArgs): string {
  const lines: string[] = [];
  lines.push(`*NOVO PEDIDO #${a.orderNumber}* 🔥`);
  lines.push("");
  lines.push(`*Nome:* ${a.firstName} ${a.lastName}`.trim());
  lines.push(`*Telefone:* ${a.phone}`);
  lines.push(`*Tipo de entrega:* ${DELIVERY_LABEL[a.deliveryType]}`);
  if (a.deliveryType === "delivery") {
    lines.push(`*Área:* ${a.zoneName}`);
    if (a.referencePoint) lines.push(`*Ponto de referência:* ${a.referencePoint}`);
  }
  lines.push("");
  lines.push("*Itens:*");
  for (const i of a.items) {
    lines.push(`• ${i.qty}x ${i.name} — ${formatKwanza(i.unitPrice * i.qty)}`);
  }
  if (a.notes) {
    lines.push("");
    lines.push(`*Observações:* ${a.notes}`);
  }
  lines.push("");
  lines.push(`*Pagamento:* ${PAYMENT_LABEL[a.payment]}`);
  lines.push(`*Subtotal:* ${formatKwanza(a.subtotal)}`);
  lines.push(`*Entrega:* ${formatKwanza(a.deliveryFee)}`);
  lines.push(`*TOTAL:* ${formatKwanza(a.total)}`);
  return lines.join("\n");
}
