import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      return { granted: false, reason: "Já existe um administrador." };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true };
  });

const GrantAdmin = z.object({ email: z.string().email() });

const requireAdmin = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
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
  promo_price: z.number().nonnegative().nullable(),
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
    if (lErr) throw new Error(lErr.message);
    const target = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) throw new Error("Usuário não encontrado. Peça para se cadastrar primeiro.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: target.id, role: "admin" });
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
