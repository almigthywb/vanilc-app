import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function fail(tag: string, err: unknown, message: string): Error {
  console.error(`[${tag}]`, err);
  return new Error(message);
}
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Returns whether the current authenticated user is admin.
export const getCurrentRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (data ?? []).some((r) => r.role === "admin");
    return { isAdmin, userId: context.userId };
  });

// First-time bootstrap: if no admin exists, grant admin to the current user.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw fail("claimFirstAdmin", cErr, "Não foi possível concluir a configuração do administrador.");
    if ((count ?? 0) > 0) {
      return { granted: false, reason: "Já existe um administrador." };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw fail("claimFirstAdmin", error, "Não foi possível concluir a configuração do administrador.");
    return { granted: true };
  });

const GrantAdmin = z.object({ email: z.string().email() });

const requireAdmin = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw fail("requireAdmin", error, "Não foi possível verificar as suas permissões.");
  if (!roles || roles.length === 0) throw new Error("Acesso negado.");
};

const ProductInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().nonnegative(),
  category_id: z.string().uuid().nullable(),
  image_url: z.string().nullable(),
  available: z.boolean(),
  is_featured: z.boolean(),
  is_promo: z.boolean(),
  discount_percent: z.number().int().min(0).max(100).nullable(),
  weight_label: z.string().nullable(),
});

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  sort_order: z.number().int(),
  active: z.boolean(),
});

const DeleteInput = z.object({ id: z.string().uuid() });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GrantAdmin.parse(d))
  .handler(async ({ data, context }) => {
    // Caller must be admin
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Look up user by email via admin API
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers();
    if (lErr) throw fail("grantAdminByEmail", lErr, "Não foi possível conceder acesso de administrador.");
    const target = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) throw new Error("Usuário não encontrado. Peça para se cadastrar primeiro.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: target.id, role: "admin" });
    if (error) throw fail("grantAdminByEmail", error, "Não foi possível conceder acesso de administrador.");
    return { granted: true };
  });

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...payload } = data;
    const query = id
      ? supabaseAdmin.from("products").update(payload).eq("id", id)
      : supabaseAdmin.from("products").insert(payload);
    const { error } = await query;
    if (error) throw fail("saveAdminProduct", error, "Não foi possível guardar o produto.");
    return { ok: true };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw fail("deleteAdminProduct", error, "Não foi possível eliminar o produto.");
    return { ok: true };
  });

export const saveAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CategoryInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...payload } = data;
    const query = id
      ? supabaseAdmin.from("categories").update(payload).eq("id", id)
      : supabaseAdmin.from("categories").insert(payload);
    const { error } = await query;
    if (error) throw fail("saveAdminCategory", error, "Não foi possível guardar a categoria.");
    return { ok: true };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw fail("deleteAdminCategory", error, "Não foi possível eliminar a categoria.");
    return { ok: true };
  });

const UploadInput = z.object({
  path: z.string().min(1),
  contentType: z.string().min(1),
  dataBase64: z.string().min(1),
});

const ReorderInput = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })).min(1),
});

export const reorderAdminProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReorderInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const item of data.items) {
      const { error } = await supabaseAdmin
        .from("products")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
      if (error) throw fail("reorderAdminProducts", error, "Não foi possível reordenar os produtos.");
    }
    return { ok: true };
  });

export const uploadAdminMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    const safePath = data.path.replace(/[^a-zA-Z0-9/_.-]/g, "_");
    const { error } = await supabaseAdmin.storage
      .from("vanilc-media")
      .upload(safePath, bytes, { upsert: true, contentType: data.contentType });
    if (error) throw fail("uploadAdminMedia", error, "Não foi possível enviar a imagem.");
    const { data: pub } = supabaseAdmin.storage.from("vanilc-media").getPublicUrl(safePath);
    return { publicUrl: pub.publicUrl };
  });

const CreateAdminInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const RemoveAdminInput = z.object({ userId: z.string().uuid() });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, created_at, created_by")
      .eq("role", "admin");
    if (error) throw fail("listAdmins", error, "Não foi possível carregar os administradores.");
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers();
    if (lErr) throw fail("listAdmins", lErr, "Não foi possível carregar os administradores.");
    const byId = new Map(list.users.map((u) => [u.id, u]));
    const admins = (roles ?? []).map((r) => {
      const u = byId.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        email: u?.email ?? "(desconhecido)",
        createdAt: r.created_at,
        lastSignInAt: u?.last_sign_in_at ?? null,
        active: !u?.banned_until,
        isSelf: r.user_id === context.userId,
      };
    });
    admins.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return { admins };
  });

export const createAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateAdminInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers();
    if (lErr) throw fail("createAdmin", lErr, "Não foi possível criar o administrador.");
    const existing = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );

    let targetId: string;
    if (existing) {
      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .eq("role", "admin");
      if (existingRoles && existingRoles.length > 0) {
        throw new Error("Este e-mail já é administrador.");
      }
      targetId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (cErr) throw fail("createAdmin", cErr, "Não foi possível criar o administrador.");
      targetId = created.user.id;
    }

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: targetId, role: "admin", created_by: context.userId });
    if (rErr) throw fail("createAdmin", rErr, "Não foi possível criar o administrador.");

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      target_user_id: targetId,
      target_email: data.email,
      action: "create",
    });

    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveAdminInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Você não pode remover a si mesmo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw fail("removeAdmin", cErr, "Não foi possível remover o administrador.");
    if ((count ?? 0) <= 1) {
      throw new Error("Deve existir pelo menos um administrador ativo.");
    }

    let targetEmail: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    targetEmail = list?.users.find((u) => u.id === data.userId)?.email ?? null;

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw fail("removeAdmin", error, "Não foi possível remover o administrador.");

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      target_email: targetEmail,
      action: "remove",
    });

    return { ok: true };
  });

// ---------- Delivery zones ----------
const ZoneInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  fee: z.number().nonnegative().max(10_000_000),
  active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export const saveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ZoneInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("delivery_zones").update(rest).eq("id", id);
      if (error) throw fail("saveDeliveryZone", error, "Não foi possível guardar a zona de entrega.");
    } else {
      const { data: last } = await supabaseAdmin
        .from("delivery_zones")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("delivery_zones").insert({
        name: rest.name,
        fee: rest.fee,
        active: rest.active ?? true,
        display_order: (last?.display_order ?? 0) + 1,
      });
      if (error) throw fail("saveDeliveryZone", error, "Não foi possível guardar a zona de entrega.");
    }
    return { ok: true };
  });

export const deleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw fail("deleteDeliveryZone", error, "Não foi possível eliminar a zona de entrega.");
    return { ok: true };
  });

export const reorderDeliveryZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabaseAdmin
        .from("delivery_zones")
        .update({ display_order: i + 1 })
        .eq("id", data.ids[i]);
      if (error) throw fail("reorderDeliveryZones", error, "Não foi possível reordenar as zonas de entrega.");
    }
    return { ok: true };
  });
