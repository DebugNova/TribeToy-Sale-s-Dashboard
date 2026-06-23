// Generated from the Supabase schema via the Supabase MCP (`generate_typescript_types`).
// Re-generate whenever the database schema changes (see CLAUDE.md working rules).

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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line: string | null
          city: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
        }
        Relationships: []
      }
      intake_events: {
        Row: {
          channel: Database["public"]["Enums"]["order_channel"]
          created_at: string
          id: string
          message: string | null
          order_no: string | null
          payload: Json | null
          source_order_id: string | null
          status: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          id?: string
          message?: string | null
          order_no?: string | null
          payload?: Json | null
          source_order_id?: string | null
          status: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          id?: string
          message?: string | null
          order_no?: string | null
          payload?: Json | null
          source_order_id?: string | null
          status?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          damaged: number
          id: string
          location: string | null
          low_stock_threshold: number
          on_hand: number
          product_id: string
          reserved: number
          updated_at: string
        }
        Insert: {
          damaged?: number
          id?: string
          location?: string | null
          low_stock_threshold?: number
          on_hand?: number
          product_id: string
          reserved?: number
          updated_at?: string
        }
        Update: {
          damaged?: number
          id?: string
          location?: string | null
          low_stock_threshold?: number
          on_hand?: number
          product_id?: string
          reserved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          discount: number
          fulfillment_status: Database["public"]["Enums"]["fulfillment_state"]
          id: string
          line_total: number
          name: string | null
          order_id: string
          product_id: string | null
          qty: number
          sku: string | null
          tax: number
          unit_price: number
        }
        Insert: {
          discount?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          line_total?: number
          name?: string | null
          order_id: string
          product_id?: string | null
          qty: number
          sku?: string | null
          tax?: number
          unit_price?: number
        }
        Update: {
          discount?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          line_total?: number
          name?: string | null
          order_id?: string
          product_id?: string | null
          qty?: number
          sku?: string | null
          tax?: number
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
          channel: Database["public"]["Enums"]["order_channel"]
          created_at: string
          currency: string
          customer_id: string | null
          discount: number
          id: string
          notes: string | null
          order_no: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          ship_address: string | null
          ship_city: string | null
          ship_name: string | null
          ship_phone: string | null
          ship_pincode: string | null
          ship_state: string | null
          shipping_charge: number
          source_order_id: string | null
          source_payload: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_no: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          ship_address?: string | null
          ship_city?: string | null
          ship_name?: string | null
          ship_phone?: string | null
          ship_pincode?: string | null
          ship_state?: string | null
          shipping_charge?: number
          source_order_id?: string | null
          source_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_no?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          ship_address?: string | null
          ship_city?: string | null
          ship_name?: string | null
          ship_phone?: string | null
          ship_pincode?: string | null
          ship_state?: string | null
          shipping_charge?: number
          source_order_id?: string | null
          source_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
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
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          order_id: string
          refund_amount: number
          settlement_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          txn_ref: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          order_id: string
          refund_amount?: number
          settlement_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          txn_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string
          refund_amount?: number
          settlement_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          txn_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          cost: number
          created_at: string
          description: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          length_cm: number | null
          name: string
          price: number
          sku: string
          tax_rate: number
          updated_at: string
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          length_cm?: number | null
          name: string
          price?: number
          sku: string
          tax_rate?: number
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          length_cm?: number | null
          name?: string
          price?: number
          sku?: string
          tax_rate?: number
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          default_courier: Database["public"]["Enums"]["courier_type"]
          id: number
          sender_address: string
          sender_city: string
          sender_name: string
          sender_phone: string
          sender_pincode: string
          sender_state: string
          updated_at: string
        }
        Insert: {
          default_courier?: Database["public"]["Enums"]["courier_type"]
          id?: number
          sender_address?: string
          sender_city?: string
          sender_name?: string
          sender_phone?: string
          sender_pincode?: string
          sender_state?: string
          updated_at?: string
        }
        Update: {
          default_courier?: Database["public"]["Enums"]["courier_type"]
          id?: number
          sender_address?: string
          sender_city?: string
          sender_name?: string
          sender_phone?: string
          sender_pincode?: string
          sender_state?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          awb: string | null
          courier: Database["public"]["Enums"]["courier_type"]
          created_at: string
          created_by: string | null
          dispatch_date: string | null
          id: string
          label_pdf_url: string | null
          label_template: string
          order_id: string
          pickup_info: Json | null
          tracking_status: string | null
        }
        Insert: {
          awb?: string | null
          courier?: Database["public"]["Enums"]["courier_type"]
          created_at?: string
          created_by?: string | null
          dispatch_date?: string | null
          id?: string
          label_pdf_url?: string | null
          label_template?: string
          order_id: string
          pickup_info?: Json | null
          tracking_status?: string | null
        }
        Update: {
          awb?: string | null
          courier?: Database["public"]["Enums"]["courier_type"]
          created_at?: string
          created_by?: string | null
          dispatch_date?: string | null
          id?: string
          label_pdf_url?: string | null
          label_template?: string
          order_id?: string
          pickup_info?: Json | null
          tracking_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_available: {
        Row: {
          available: number | null
          damaged: number | null
          id: string | null
          location: string | null
          low_stock_threshold: number | null
          on_hand: number | null
          product_id: string | null
          reserved: number | null
          updated_at: string | null
        }
        Insert: {
          available?: never
          damaged?: number | null
          id?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          on_hand?: number | null
          product_id?: string | null
          reserved?: number | null
          updated_at?: string | null
        }
        Update: {
          available?: never
          damaged?: number | null
          id?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          on_hand?: number | null
          product_id?: string | null
          reserved?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_channel_split: {
        Row: {
          channel: Database["public"]["Enums"]["order_channel"] | null
          orders: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_daily_sales: {
        Row: {
          day: string | null
          orders: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_top_skus: {
        Row: {
          margin: number | null
          name: string | null
          product_id: string | null
          qty: number | null
          revenue: number | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      dashboard_channel_split: {
        Args: {
          p_category?: string
          p_city?: string
          p_customer_type?: Database["public"]["Enums"]["customer_type"]
          p_from: string
          p_to: string
        }
        Returns: {
          channel: Database["public"]["Enums"]["order_channel"]
          orders: number
          revenue: number
        }[]
      }
      dashboard_daily_sales: {
        Args: {
          p_category?: string
          p_channel?: Database["public"]["Enums"]["order_channel"]
          p_city?: string
          p_customer_type?: Database["public"]["Enums"]["customer_type"]
          p_from: string
          p_to: string
        }
        Returns: {
          day: string
          orders: number
          revenue: number
        }[]
      }
      dashboard_kpis: {
        Args: {
          p_category?: string
          p_channel?: Database["public"]["Enums"]["order_channel"]
          p_city?: string
          p_customer_type?: Database["public"]["Enums"]["customer_type"]
          p_from: string
          p_to: string
        }
        Returns: {
          aov: number
          orders: number
          pending_fulfillment: number
          returns: number
          revenue: number
          shipments_today: number
        }[]
      }
      dashboard_top_skus: {
        Args: {
          p_category?: string
          p_channel?: Database["public"]["Enums"]["order_channel"]
          p_city?: string
          p_customer_type?: Database["public"]["Enums"]["customer_type"]
          p_from: string
          p_limit?: number
          p_sort?: string
          p_to: string
        }
        Returns: {
          category: string
          margin: number
          name: string
          product_id: string
          qty: number
          revenue: number
          sku: string
        }[]
      }
      dispatch_order_inventory: {
        Args: { p_actor: string; p_order_id: string }
        Returns: undefined
      }
      low_stock_alerts: {
        Args: never
        Returns: {
          available: number
          category: string
          low_stock_threshold: number
          name: string
          on_hand: number
          product_id: string
          reserved: number
          sku: string
        }[]
      }
      release_order_inventory: {
        Args: { p_actor: string; p_order_id: string }
        Returns: undefined
      }
      reserve_order_inventory: {
        Args: { p_actor: string; p_order_id: string }
        Returns: undefined
      }
      return_order_inventory: {
        Args: { p_actor: string; p_order_id: string; p_restock?: boolean }
        Returns: undefined
      }
    }
    Enums: {
      courier_type: "speedpost" | "delhivery" | "other"
      customer_type: "b2c" | "b2b"
      fulfillment_state:
        | "pending"
        | "packed"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
      order_channel:
        | "website"
        | "amazon"
        | "instagram"
        | "whatsapp"
        | "phone"
        | "manual"
        | "b2b"
      order_status:
        | "created"
        | "validated"
        | "payment_confirmed"
        | "cod_approved"
        | "reserved"
        | "packed"
        | "label_generated"
        | "dispatched"
        | "in_transit"
        | "delivered"
        | "returned"
        | "refunded"
        | "cancelled"
      payment_status: "unpaid" | "paid" | "partially_paid" | "refunded"
      payment_type: "prepaid" | "cod" | "pending"
      user_role: "admin" | "ops" | "warehouse" | "sales" | "finance"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      courier_type: ["speedpost", "delhivery", "other"],
      customer_type: ["b2c", "b2b"],
      fulfillment_state: [
        "pending",
        "packed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      order_channel: [
        "website",
        "amazon",
        "instagram",
        "whatsapp",
        "phone",
        "manual",
        "b2b",
      ],
      order_status: [
        "created",
        "validated",
        "payment_confirmed",
        "cod_approved",
        "reserved",
        "packed",
        "label_generated",
        "dispatched",
        "in_transit",
        "delivered",
        "returned",
        "refunded",
        "cancelled",
      ],
      payment_status: ["unpaid", "paid", "partially_paid", "refunded"],
      payment_type: ["prepaid", "cod", "pending"],
      user_role: ["admin", "ops", "warehouse", "sales", "finance"],
    },
  },
} as const
