import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function fail(tag: string, err: unknown, message: string): Error {
  console.error(`[${tag}]`, err);
  return new Error(message);
}

// Only productId, qty and notes are trusted from the client; name/price come from the DB.
const CartItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
});

const CreateOrderSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().min(6).max(30),
  deliveryType: z.enum(["pickup", "delivery"]),
  deliveryZoneId: z.string().uuid().optional().nullable(),
  referencePoint: z.string().trim().max(300).optional().default(""),
  address: z.string().trim().max(400).optional().default(""),
  // Only the currently available method may create a new order.
  paymentMethod: z.literal("tpa_cash"),
  notes: z.string().trim().max(500).optional().default(""),
  items: z.array(CartItemSchema).min(1).max(50),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    const { data: settings, error: sErr } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (sErr || !settings) throw new Error("Não foi possível carregar configurações.");
    if (!settings.store_open) throw new Error("A loja está fechada no momento.");

    // Fee is always recomputed server-side from the selected zone.
    let deliveryFee = 0;
    let zoneId: string | null = null;
    let zoneName: string | null = null;
    if (data.deliveryType === "delivery") {
      if (!data.deliveryZoneId) throw new Error("Selecione a sua área de entrega.");
      const { data: zone } = await supabase
        .from("delivery_zones")
        .select("id, name, fee, active")
        .eq("id", data.deliveryZoneId)
        .maybeSingle();
      if (!zone || !zone.active) throw new Error("Zona de entrega indisponível.");
      deliveryFee = Number(zone.fee);
      zoneId = zone.id;
      zoneName = zone.name;
    }

    // Recompute item prices/names from the database — never trust the client.
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, name, price, promo_price, is_promo, available")
      .in("id", productIds);
    if (pErr) throw new Error("Não foi possível validar os produtos do pedido.");
    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    const pricedItems = data.items.map((i) => {
      const p = productMap.get(i.productId);
      if (!p || !p.available) {
        const label = p?.name ? `O produto '${p.name}'` : "Um dos produtos";
        throw new Error(
          `${label} já não está disponível. Atualize o carrinho e tente novamente.`,
        );
      }
      const unitPrice =
        p.is_promo === true && p.promo_price != null ? Number(p.promo_price) : Number(p.price);
      return { productId: p.id, name: p.name, qty: i.qty, unitPrice, notes: i.notes ?? null };
    });

    const subtotal = pricedItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const total = subtotal + deliveryFee;

    // Upsert customer by NORMALIZED phone (single source of truth for identity)
    const normalized = data.phone.replace(/[^0-9]/g, "");
    const normalizedPhone =
      normalized.length === 9 && normalized.startsWith("9") ? "244" + normalized : normalized;

    let customerId: string | null = null;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("normalized_phone", normalizedPhone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      // Do NOT overwrite the saved name/phone of a returning customer.
    } else {
      const { data: inserted, error: cErr } = await supabase
        .from("customers")
        .insert({
          phone: data.phone,
          first_name: data.firstName,
          last_name: data.lastName,
          total_orders: 0,
          total_spent: 0,
        })
        .select("id")
        .single();
      if (cErr) throw fail("createOrder", cErr, "Não foi possível registar o seu pedido. Tente novamente.");
      customerId = inserted.id;
    }

    // Create order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        customer_first_name: data.firstName,
        customer_last_name: data.lastName,
        customer_phone: data.phone,
        status: "received",
        delivery_type: data.deliveryType,
        address: data.address || null,
        delivery_zone_id: zoneId,
        delivery_zone_name: zoneName,
        reference_point: data.referencePoint || null,
        payment_method: data.paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: data.notes || null,
      })
      .select("id, order_number")
      .single();
    if (oErr) throw fail("createOrder", oErr, "Não foi possível registar o seu pedido. Tente novamente.");

    // Insert items
    const itemsPayload = pricedItems.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      name_snapshot: i.name,
      qty: i.qty,
      unit_price: i.unitPrice,
      notes: i.notes,
    }));
    const { error: iErr } = await supabase.from("order_items").insert(itemsPayload);
    if (iErr) throw fail("createOrder", iErr, "Não foi possível registar o seu pedido. Tente novamente.");

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      whatsappNumber: settings.whatsapp_number,
      subtotal,
      deliveryFee,
      total,
      zoneName,
    };
  });
