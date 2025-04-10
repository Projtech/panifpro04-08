export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          photo_url: string | null
          gif_url: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          yield_kg: number
          yield_units: number | null
          group_id: string | null
          subgroup_id: string | null
          created_at: string
          all_days: boolean | null
          monday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
          thursday: boolean | null
          friday: boolean | null
          saturday: boolean | null
          sunday: boolean | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          photo_url?: string | null
          gif_url?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          yield_kg: number
          yield_units?: number | null
          group_id?: string | null
          subgroup_id?: string | null
          created_at?: string
          all_days?: boolean | null
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          photo_url?: string | null
          gif_url?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          yield_kg?: number
          yield_units?: number | null
          group_id?: string | null
          subgroup_id?: string | null
          created_at?: string
          all_days?: boolean | null
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subgroup_id_fkey"
            columns: ["subgroup_id"]
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: string
          name: string
          code: string | null
          instructions: string | null
          photo_url: string | null
          gif_url: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          yield_kg: number
          yield_units: number | null
          created_at: string
          group_id: string | null
          subgroup_id: string | null
          all_days: boolean | null
          monday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
          thursday: boolean | null
          friday: boolean | null
          saturday: boolean | null
          sunday: boolean | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          instructions?: string | null
          photo_url?: string | null
          gif_url?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          yield_kg: number
          yield_units?: number | null
          created_at?: string
          group_id?: string | null
          subgroup_id?: string | null
          all_days?: boolean | null
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          instructions?: string | null
          photo_url?: string | null
          gif_url?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          yield_kg?: number
          yield_units?: number | null
          created_at?: string
          group_id?: string | null
          subgroup_id?: string | null
          all_days?: boolean | null
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          }
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          product_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          }
        ]
      }
      production_orders: {
        Row: {
          id: string
          date: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          status: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      production_order_items: {
        Row: {
          id: string
          production_order_id: string
          recipe_id: string
          quantity: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          production_order_id: string
          recipe_id: string
          quantity: number
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          production_order_id?: string
          recipe_id?: string
          quantity?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_transactions: {
        Row: {
          id: string
          date: string
          type: string
          product_id: string
          quantity: number
          cost: number
          reason: string
          invoice: string
          notes: string
          production_order_id: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          type: string
          product_id: string
          quantity: number
          cost: number
          reason: string
          invoice: string
          notes: string
          production_order_id: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          type?: string
          product_id?: string
          quantity?: number
          cost?: number
          reason?: string
          invoice?: string
          notes?: string
          production_order_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_production_order_id_fkey"
            columns: ["production_order_id"]
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
