import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CartItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(50),
  unitPrice: z.number().nonnegative().max(10_000_000),
  notes: z.string().max(500).optional().nullable(),
});

const CreateOrderSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().min(6).max(30),
  deliveryType: z.enum(["pickup", "city", "outside"]),
  address: z.string().trim().max(400).optional().default(""),
  paymentMethod: z.enum(["tpa", "qr_code", "unitel_money", "cash"]),
  notes: z.string().trim().max(500).optional().default(""),
  items: z.array(CartItemSchema).min(1).max(50),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    // Load settings to compute delivery fee + verify store open
    const { data: settings, error: sErr } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (sErr || !settings) throw new Error("Não foi possível carregar configurações.");
    if (!settings.store_open) throw new Error("A loja está fechada no momento.");

    if (data.deliveryType !== "pickup" && !data.address.trim()) {
      throw new Error("Endereço é obrigatório para entrega.");
    }

    const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const deliveryFee =
      data.deliveryType === "pickup"
        ? 0
        : data.deliveryType === "city"
          ? Number(settings.delivery_fee_city)
          : Number(settings.delivery_fee_outside);
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
      if (cErr) throw new Error(cErr.message);
      customerId = inserted!.id;
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
        payment_method: data.paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: data.notes || null,
      })
      .select("id, order_number")
      .single();
    if (oErr) throw new Error(oErr.message);

    // Insert items
    const itemsPayload = data.items.map((i) => ({
      order_id: order!.id,
      product_id: i.productId ?? null,
      name_snapshot: i.name,
      qty: i.qty,
      unit_price: i.unitPrice,
      notes: i.notes ?? null,
    }));
    const { error: iErr } = await supabase.from("order_items").insert(itemsPayload);
    if (iErr) throw new Error(iErr.message);

    return {
      orderId: order!.id,
      orderNumber: order!.order_number,
      whatsappNumber: settings.whatsapp_number,
      subtotal,
      deliveryFee,
      total,
    };
  });
