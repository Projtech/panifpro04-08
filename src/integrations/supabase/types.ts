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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          force_password_change: boolean
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          force_password_change?: boolean
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          force_password_change?: boolean
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
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
      production_list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "production_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          all_days: boolean | null
          code: string | null
          cost: number
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string
          kg_weight: number | null
          min_stock: number
          monday: boolean | null
          name: string
          recipe_id: string | null
          saturday: boolean | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          type: Database["public"]["Enums"]["product_type"] | null
          unit: string
          unit_price: number | null
          unit_weight: number | null
          wednesday: boolean | null
        }
        Insert: {
          all_days?: boolean | null
          code?: string | null
          cost: number
          current_stock?: number | null
          friday?: boolean | null
          group_id?: string | null
          id?: string
          kg_weight?: number | null
          min_stock: number
          monday?: boolean | null
          name: string
          recipe_id?: string | null
          saturday?: boolean | null
          sku?: string | null
          subgroup_id?: string | null
          sunday?: boolean | null
          supplier?: string | null
          thursday?: boolean | null
          tuesday?: boolean | null
          type?: Database["public"]["Enums"]["product_type"] | null
          unit: string
          unit_price?: number | null
          unit_weight?: number | null
          wednesday?: boolean | null
        }
        Update: {
          all_days?: boolean | null
          code?: string | null
          cost?: number
          current_stock?: number | null
          friday?: boolean | null
          group_id?: string | null
          id?: string
          kg_weight?: number | null
          min_stock?: number
          monday?: boolean | null
          name?: string
          recipe_id?: string | null
          saturday?: boolean | null
          sku?: string | null
          subgroup_id?: string | null
          sunday?: boolean | null
          supplier?: string | null
          thursday?: boolean | null
          tuesday?: boolean | null
          type?: Database["public"]["Enums"]["product_type"] | null
          unit?: string
          unit_price?: number | null
          unit_weight?: number | null
          wednesday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
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
          all_days: boolean | null
          code: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          friday: boolean | null
          gif_url: string | null
          group_id: string | null
          id: string
          instructions: string | null
          monday: boolean | null
          name: string
          photo_url: string | null
          saturday: boolean | null
          subgroup_id: string | null
          sunday: boolean | null
          thursday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
          yield_kg: number
          yield_units: number | null
        }
        Insert: {
          all_days?: boolean | null
          code?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          monday?: boolean | null
          name: string
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          yield_kg: number
          yield_units?: number | null
        }
        Update: {
          all_days?: boolean | null
          code?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          monday?: boolean | null
          name?: string
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          yield_kg?: number
          yield_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      subgroups: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_products_by_weekday: {
        Args: { weekday: string }
        Returns: {
          all_days: boolean | null
          code: string | null
          cost: number
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string
          kg_weight: number | null
          min_stock: number
          monday: boolean | null
          name: string
          recipe_id: string | null
          saturday: boolean | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          type: Database["public"]["Enums"]["product_type"] | null
          unit: string
          unit_price: number | null
          unit_weight: number | null
          wednesday: boolean | null
        }[]
      }
    }
    Enums: {
      product_type: "materia_prima" | "embalagem" | "subreceita" | "decoracao"
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
    Enums: {
      product_type: ["materia_prima", "embalagem", "subreceita", "decoracao"],
    },
  },
} as const
