import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CustomerShell } from "@/components/site/customer-shell";
import { cart, useCart, cartSubtotal } from "@/lib/cart-store";
import { settingsQuery } from "@/lib/queries";
import { formatKwanza } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/lib/orders.functions";
import { toast } from "sonner";
import { PhoneInput, isValidPhone } from "@/components/site/phone-input";

type DeliveryType = "pickup" | "city" | "outside";
type Payment = "tpa" | "qr_code" | "unitel_money" | "cash";

const PAYMENT_LABEL: Record<Payment, string> = {
  tpa: "TPA",
  qr_code: "QR Code",
  unitel_money: "Unitel Money",
  cash: "Dinheiro",
};

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  pickup: "Retirar na churrasqueira",
  city: "Entrega na cidade",
  outside: "Entrega fora da cidade",
};

const COUNTRY_CODES: Array<{ code: string; dial: string; flag: string; name: string }> = [
  { code: "AO", dial: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "MZ", dial: "+258", flag: "🇲🇿", name: "Moçambique" },
  { code: "CV", dial: "+238", flag: "🇨🇻", name: "Cabo Verde" },
  { code: "ST", dial: "+239", flag: "🇸🇹", name: "São Tomé e Príncipe" },
  { code: "GW", dial: "+245", flag: "🇬🇼", name: "Guiné-Bissau" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "África do Sul" },
  { code: "NA", dial: "+264", flag: "🇳🇦", name: "Namíbia" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "França" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espanha" },
];


export const Route = createFileRoute("/checkout")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: () => ({ meta: [{ title: "Finalizar pedido — Vanilc" }] }),
  component: () => (
    <CustomerShell>
      <CheckoutPage />
    </CustomerShell>
  ),
});

function CheckoutPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const items = useCart();
  const subtotal = cartSubtotal(items);
  const navigate = useNavigate();
  const createOrderFn = useServerFn(createOrder);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+244");
  const [phone, setPhone] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("city");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee =
    deliveryType === "pickup"
      ? 0
      : deliveryType === "city"
        ? Number(settings.delivery_fee_city)
        : Number(settings.delivery_fee_outside);
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
    setSubmitting(true);
    try {
      const fullPhone = `${dialCode} ${phone.trim()}`.trim();
      const result = await createOrderFn({
        data: {
          firstName,
          lastName,
          phone: fullPhone,
          deliveryType,
          address,
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
        address,
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
            <Field label="Telefone" required>
              <div className="flex items-stretch gap-2">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className={`${inputClass} w-[92px] shrink-0 px-2 text-center font-medium`}
                  aria-label="Código do país"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.dial}>
                      {c.flag} {c.dial}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="9XX XXX XXX"
                  className={`${inputClass} min-w-0 flex-1`}
                />
              </div>
            </Field>

          </div>
        </Card>

        <Card title="Tipo de entrega">
          <div className="space-y-2">
            {(Object.keys(DELIVERY_LABEL) as DeliveryType[]).map((opt) => {
              const fee =
                opt === "pickup"
                  ? "Grátis"
                  : formatKwanza(
                      opt === "city"
                        ? settings.delivery_fee_city
                        : settings.delivery_fee_outside,
                    );
              return (
                <label
                  key={opt}
                  className={[
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition",
                    deliveryType === opt
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
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
                  <span className="text-sm font-semibold text-primary">{fee}</span>
                </label>
              );
            })}
          </div>
          {deliveryType !== "pickup" && (
            <Field label="Endereço completo" required>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={400}
                rows={2}
                className={inputClass}
                placeholder="Bairro, rua, número, referências..."
              />
            </Field>
          )}
        </Card>

        <Card title="Forma de pagamento">
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PAYMENT_LABEL) as Payment[]).map((opt) => (
              <label
                key={opt}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                  payment === opt
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === opt}
                  onChange={() => setPayment(opt)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-medium">{PAYMENT_LABEL[opt]}</span>
              </label>
            ))}
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
  address: string;
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
  if (a.deliveryType !== "pickup") lines.push(`*Endereço:* ${a.address}`);
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
