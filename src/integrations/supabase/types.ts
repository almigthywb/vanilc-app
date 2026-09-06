export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          customer_number: number
          first_name: string
          first_order_at: string | null
          id: string
          last_name: string | null
          last_order_at: string | null
          normalized_phone: string | null
          notes: string | null
          phone: string
          status: string
          total_orders: number
          total_spent: number
        }
        Insert: {
          created_at?: string
          customer_number?: number
          first_name: string
          first_order_at?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          normalized_phone?: string | null
          notes?: string | null
          phone: string
          status?: string
          total_orders?: number
          total_spent?: number
        }
        Update: {
          created_at?: string
          customer_number?: number
          first_name?: string
          first_order_at?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          normalized_phone?: string | null
          notes?: string | null
          phone?: string
          status?: string
          total_orders?: number
          total_spent?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          name_snapshot: string
          notes: string | null
          options_snapshot: Json
          order_id: string
          product_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          id?: string
          name_snapshot: string
          notes?: string | null
          options_snapshot?: Json
          order_id: string
          product_id?: string | null
          qty: number
          unit_price: number
        }
        Update: {
          id?: string
          name_snapshot?: string
          notes?: string | null
          options_snapshot?: Json
          order_id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_first_name: string
          customer_id: string | null
          customer_last_name: string | null
          customer_phone: string
          delivery_fee: number
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Insert: {
          address?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_first_name: string
          customer_id?: string | null
          customer_last_name?: string | null
          customer_phone: string
          delivery_fee?: number
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          order_number?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Update: {
          address?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_first_name?: string
          customer_id?: string | null
          customer_last_name?: string | null
          customer_phone?: string
          delivery_fee?: number
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_items: {
        Row: {
          extra_price: number
          id: string
          name: string
          option_id: string
          sort_order: number
        }
        Insert: {
          extra_price?: number
          id?: string
          name: string
          option_id: string
          sort_order?: number
        }
        Update: {
          extra_price?: number
          id?: string
          name?: string
          option_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_option_items_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          id: string
          max_choices: number
          min_choices: number
          name: string
          product_id: string
          required: boolean
          sort_order: number
          type: string
        }
        Insert: {
          id?: string
          max_choices?: number
          min_choices?: number
          name: string
          product_id: string
          required?: boolean
          sort_order?: number
          type?: string
        }
        Update: {
          id?: string
          max_choices?: number
          min_choices?: number
          name?: string
          product_id?: string
          required?: boolean
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_promo: boolean
          name: string
          price: number
          promo_price: number | null
          sort_order: number
          weight_label: string | null
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_promo?: boolean
          name: string
          price: number
          promo_price?: number | null
          sort_order?: number
          weight_label?: string | null
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_promo?: boolean
          name?: string
          price?: number
          promo_price?: number | null
          sort_order?: number
          weight_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          banner_url: string | null
          banner_url_desktop: string | null
          banner_url_mobile: string | null
          business_hours: string | null
          delivery_fee_city: number
          delivery_fee_outside: number
          id: number
          logo_url: string | null
          prep_time_max: number
          prep_time_min: number
          store_open: boolean
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          banner_url_desktop?: string | null
          banner_url_mobile?: string | null
          business_hours?: string | null
          delivery_fee_city?: number
          delivery_fee_outside?: number
          id?: number
          logo_url?: string | null
          prep_time_max?: number
          prep_time_min?: number
          store_open?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          banner_url_desktop?: string | null
          banner_url_mobile?: string | null
          business_hours?: string | null
          delivery_fee_city?: number
          delivery_fee_outside?: number
          id?: number
          logo_url?: string | null
          prep_time_max?: number
          prep_time_min?: number
          store_open?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: {
      app_role: "admin"
      delivery_type: "pickup" | "city" | "outside"
      order_status:
        | "received"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      payment_method: "tpa" | "qr_code" | "unitel_money" | "cash"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      delivery_type: ["pickup", "city", "outside"],
      order_status: [
        "received",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      payment_method: ["tpa", "qr_code", "unitel_money", "cash"],
    },
  },
} as const
