export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      inventory_transactions: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          id: string
          invoice: string | null
          notes: string | null
          product_id: string | null
          production_order_id: string | null
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          id?: string
          invoice?: string | null
          notes?: string | null
          product_id?: string | null
          production_order_id?: string | null
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          id?: string
          invoice?: string | null
          notes?: string | null
          product_id?: string | null
          production_order_id?: string | null
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          actual_quantity_kg: number | null
          actual_quantity_units: number | null
          id: string
          order_id: string | null
          planned_quantity_kg: number
          planned_quantity_units: number | null
          recipe_id: string | null
          recipe_name: string
          unit: string
        }
        Insert: {
          actual_quantity_kg?: number | null
          actual_quantity_units?: number | null
          id?: string
          order_id?: string | null
          planned_quantity_kg: number
          planned_quantity_units?: number | null
          recipe_id?: string | null
          recipe_name: string
          unit: string
        }
        Update: {
          actual_quantity_kg?: number | null
          actual_quantity_units?: number | null
          id?: string
          order_id?: string | null
          planned_quantity_kg?: number
          planned_quantity_units?: number | null
          recipe_id?: string | null
          recipe_name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          adjust_materials: boolean | null
          created_at: string | null
          date: string
          id: string
          order_number: string
          status: string
        }
        Insert: {
          adjust_materials?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          order_number: string
          status: string
        }
        Update: {
          adjust_materials?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          order_number?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          code: string | null
          cost: number
          current_stock: number | null
          id: string
          min_stock: number
          name: string
          recipe_id: string | null
          sku: string | null
          supplier: string
          unit: string
          unit_price: number | null
        }
        Insert: {
          code?: string | null
          cost: number
          current_stock?: number | null
          id?: string
          min_stock: number
          name: string
          recipe_id?: string | null
          sku?: string | null
          supplier: string
          unit: string
          unit_price?: number | null
        }
        Update: {
          code?: string | null
          cost?: number
          current_stock?: number | null
          id?: string
          min_stock?: number
          name?: string
          recipe_id?: string | null
          sku?: string | null
          supplier?: string
          unit?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          cost: number
          id: string
          is_sub_recipe: boolean
          product_id: string | null
          quantity: number
          recipe_id: string | null
          sub_recipe_id: string | null
          total_cost: number
          unit: string
        }
        Insert: {
          cost: number
          id?: string
          is_sub_recipe?: boolean
          product_id?: string | null
          quantity: number
          recipe_id?: string | null
          sub_recipe_id?: string | null
          total_cost: number
          unit: string
        }
        Update: {
          cost?: number
          id?: string
          is_sub_recipe?: boolean
          product_id?: string | null
          quantity?: number
          recipe_id?: string | null
          sub_recipe_id?: string | null
          total_cost?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_sub_recipe_id_fkey"
            columns: ["sub_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          code: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          gif_url: string | null
          id: string
          instructions: string | null
          name: string
          photo_url: string | null
          yield_kg: number
          yield_units: number | null
        }
        Insert: {
          code?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          name: string
          photo_url?: string | null
          yield_kg: number
          yield_units?: number | null
        }
        Update: {
          code?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          name?: string
          photo_url?: string | null
          yield_kg?: number
          yield_units?: number | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subgroups: {
        Row: {
          id: string
          name: string
          description: string | null
          group_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          group_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          group_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
