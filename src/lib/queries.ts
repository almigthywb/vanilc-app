import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  is_promo: boolean;
  discount_percent: number | null;
  image_url: string | null;
  available: boolean;
  is_featured: boolean;
  sort_order: number;
  weight_label: string | null;
}

export interface Settings {
  id: number;
  store_open: boolean;
  /** Only visible to admin users; absent for anonymous visitors. */
  whatsapp_number?: string;
  delivery_fee_city: number;
  delivery_fee_outside: number;
  prep_time_min: number;
  prep_time_max: number;
  address: string | null;
  business_hours: string | null;
  logo_url: string | null;
  banner_url: string | null;
  banner_url_desktop: string | null;
  banner_url_mobile: string | null;
}


export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      ...p,
      price: Number(p.price),
      promo_price: p.promo_price !== null ? Number(p.promo_price) : null,
    })) as Product[];
  },
});

const SETTINGS_PUBLIC_COLUMNS =
  "id, store_open, delivery_fee_city, delivery_fee_outside, prep_time_min, prep_time_max, address, business_hours, logo_url, banner_url, banner_url_desktop, banner_url_mobile";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    const { data, error } = await supabase
      .from("settings")
      .select(SETTINGS_PUBLIC_COLUMNS)
      .eq("id", 1)
      .single();
    if (error) throw error;
    return {
      ...data,
      delivery_fee_city: Number(data.delivery_fee_city),
      delivery_fee_outside: Number(data.delivery_fee_outside),
    } as Settings;
  },
});

export const adminSettingsQuery = queryOptions({
  queryKey: ["settings", "admin"],
  queryFn: async (): Promise<Settings> => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return {
      ...data,
      delivery_fee_city: Number(data.delivery_fee_city),
      delivery_fee_outside: Number(data.delivery_fee_outside),
    } as Settings;
  },
});


export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  display_order: number;
  active: boolean;
}

export const deliveryZonesQuery = queryOptions({
  queryKey: ["delivery-zones", "active"],
  queryFn: async (): Promise<DeliveryZone[]> => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("id, name, fee, display_order, active")
      .eq("active", true)
      .order("display_order");
    if (error) throw error;
    return (data ?? []).map((z) => ({ ...z, fee: Number(z.fee) }));
  },
});
