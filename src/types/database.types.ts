export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: number
          image_url: string
          is_active: boolean
          order_no: number
          redirect_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          image_url: string
          is_active?: boolean
          order_no?: number
          redirect_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          image_url?: string
          is_active?: boolean
          order_no?: number
          redirect_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_whatsapp?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          ativo: boolean | null
          company_id: string | null
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
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
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
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
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
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_calendar_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["product_id"]
          },
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
      product_types: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      production_list_items: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          list_id: string | null
          product_id: string | null
          quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          list_id?: string | null
          product_id?: string | null
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          list_id?: string | null
          product_id?: string | null
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_list_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["list_id"]
          },
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
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_calendar_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["product_id"]
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
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          actual_quantity_kg: number | null
          actual_quantity_units: number | null
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          order_id: string | null
          planned_quantity_kg: number
          planned_quantity_units: number | null
          recipe_id: string | null
          recipe_name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          actual_quantity_kg?: number | null
          actual_quantity_units?: number | null
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          planned_quantity_kg: number
          planned_quantity_units?: number | null
          recipe_id?: string | null
          recipe_name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          actual_quantity_kg?: number | null
          actual_quantity_units?: number | null
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          planned_quantity_kg?: number
          planned_quantity_units?: number | null
          recipe_id?: string | null
          recipe_name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "active_recipes"
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
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          date: string
          id: string
          order_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          adjust_materials?: boolean | null
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          order_number: string
          status: string
          updated_at?: string | null
        }
        Update: {
          adjust_materials?: boolean | null
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          order_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          all_days: boolean | null
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost: number
          created_at: string | null
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string
          is_deleted: boolean | null
          kg_weight: number | null
          min_stock: number
          monday: boolean | null
          name: string
          product_type_id: string
          recipe_id: string | null
          saturday: boolean | null
          setor_id: string | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          unit: string
          unit_price: number | null
          unit_weight: number | null
          updated_at: string | null
          wednesday: boolean | null
        }
        Insert: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost: number
          created_at?: string | null
          current_stock?: number | null
          friday?: boolean | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kg_weight?: number | null
          min_stock: number
          monday?: boolean | null
          name: string
          product_type_id: string
          recipe_id?: string | null
          saturday?: boolean | null
          setor_id?: string | null
          sku?: string | null
          subgroup_id?: string | null
          sunday?: boolean | null
          supplier?: string | null
          thursday?: boolean | null
          tuesday?: boolean | null
          unit: string
          unit_price?: number | null
          unit_weight?: number | null
          updated_at?: string | null
          wednesday?: boolean | null
        }
        Update: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost?: number
          created_at?: string | null
          current_stock?: number | null
          friday?: boolean | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kg_weight?: number | null
          min_stock?: number
          monday?: boolean | null
          name?: string
          product_type_id?: string
          recipe_id?: string | null
          saturday?: boolean | null
          setor_id?: string | null
          sku?: string | null
          subgroup_id?: string | null
          sunday?: boolean | null
          supplier?: string | null
          thursday?: boolean | null
          tuesday?: boolean | null
          unit?: string
          unit_price?: number | null
          unit_weight?: number | null
          updated_at?: string | null
          wednesday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_type"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "active_recipes"
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
            foreignKeyName: "products_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["subgroup_id"]
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
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          force_password_change: boolean | null
          full_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          cost: number
          created_at: string | null
          etapa: string | null
          id: string
          is_sub_recipe: boolean
          product_id: string | null
          quantity: number
          recipe_id: string | null
          sub_recipe_id: string | null
          total_cost: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          cost: number
          created_at?: string | null
          etapa?: string | null
          id?: string
          is_sub_recipe?: boolean
          product_id?: string | null
          quantity: number
          recipe_id?: string | null
          sub_recipe_id?: string | null
          total_cost: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          cost?: number
          created_at?: string | null
          etapa?: string | null
          id?: string
          is_sub_recipe?: boolean
          product_id?: string | null
          quantity?: number
          recipe_id?: string | null
          sub_recipe_id?: string | null
          total_cost?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_calendar_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["product_id"]
          },
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
            referencedRelation: "active_recipes"
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
            referencedRelation: "active_recipes"
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
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          created_at: string | null
          friday: boolean | null
          gif_url: string | null
          group_id: string | null
          id: string
          instructions: string | null
          is_deleted: boolean | null
          monday: boolean | null
          name: string
          photo_url: string | null
          saturday: boolean | null
          subgroup_id: string | null
          sunday: boolean | null
          thursday: boolean | null
          tuesday: boolean | null
          updated_at: string | null
          wednesday: boolean | null
          yield_kg: number
          yield_units: number | null
        }
        Insert: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          is_deleted?: boolean | null
          monday?: boolean | null
          name: string
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          updated_at?: string | null
          wednesday?: boolean | null
          yield_kg: number
          yield_units?: number | null
        }
        Update: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          is_deleted?: boolean | null
          monday?: boolean | null
          name?: string
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          updated_at?: string | null
          wednesday?: boolean | null
          yield_kg?: number
          yield_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "recipes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["subgroup_id"]
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
      report_cache: {
        Row: {
          company_id: string
          expires_at: string
          generated_at: string
          generated_by: string
          id: string
          last_refreshed: string
          refresh_count: number
          report_data: Json
          report_type: string
        }
        Insert: {
          company_id: string
          expires_at?: string
          generated_at?: string
          generated_by: string
          id?: string
          last_refreshed?: string
          refresh_count?: number
          report_data: Json
          report_type: string
        }
        Update: {
          company_id?: string
          expires_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          last_refreshed?: string
          refresh_count?: number
          report_data?: Json
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean | null
          color: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          color?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subgroups: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["group_id"]
          },
        ]
      }
      user_table_configs: {
        Row: {
          company_id: string | null
          config: Json
          created_at: string | null
          id: string
          table_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          config: Json
          created_at?: string | null
          id?: string
          table_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          table_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_table_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_products: {
        Row: {
          all_days: boolean | null
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost: number | null
          created_at: string | null
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string | null
          is_deleted: boolean | null
          kg_weight: number | null
          min_stock: number | null
          monday: boolean | null
          name: string | null
          product_type: string | null
          product_type_id: string | null
          recipe_id: string | null
          saturday: boolean | null
          setor_id: string | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          unit: string | null
          unit_price: number | null
          unit_weight: number | null
          updated_at: string | null
          wednesday: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_type"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "active_recipes"
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
            foreignKeyName: "products_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["subgroup_id"]
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
      active_recipes: {
        Row: {
          all_days: boolean | null
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost_per_kg: number | null
          cost_per_unit: number | null
          created_at: string | null
          friday: boolean | null
          gif_url: string | null
          group_id: string | null
          id: string | null
          instructions: string | null
          is_deleted: boolean | null
          monday: boolean | null
          name: string | null
          photo_url: string | null
          saturday: boolean | null
          subgroup_id: string | null
          sunday: boolean | null
          thursday: boolean | null
          tuesday: boolean | null
          updated_at: string | null
          wednesday: boolean | null
          yield_kg: number | null
          yield_units: number | null
        }
        Insert: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string | null
          instructions?: string | null
          is_deleted?: boolean | null
          monday?: boolean | null
          name?: string | null
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          updated_at?: string | null
          wednesday?: boolean | null
          yield_kg?: number | null
          yield_units?: number | null
        }
        Update: {
          all_days?: boolean | null
          ativo?: boolean | null
          code?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          friday?: boolean | null
          gif_url?: string | null
          group_id?: string | null
          id?: string | null
          instructions?: string | null
          is_deleted?: boolean | null
          monday?: boolean | null
          name?: string | null
          photo_url?: string | null
          saturday?: boolean | null
          subgroup_id?: string | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          updated_at?: string | null
          wednesday?: boolean | null
          yield_kg?: number | null
          yield_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "recipes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "production_control_report_view"
            referencedColumns: ["subgroup_id"]
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
      company_user_details_view_test_old: {
        Row: {
          association_created_at: string | null
          company_id: string | null
          display_name: string | null
          email: string | null
          force_password_change: boolean | null
          last_sign_in_at: string | null
          profile_full_name: string | null
          role: string | null
          status: string | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      production_calendar_report: {
        Row: {
          all_days: boolean | null
          company_id: string | null
          friday: boolean | null
          group_name: string | null
          monday: boolean | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          production_schedule: string | null
          saturday: boolean | null
          subgroup_name: string | null
          sunday: boolean | null
          thursday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      production_control_report_view: {
        Row: {
          company_id: string | null
          group_id: string | null
          group_name: string | null
          list_created_at: string | null
          list_id: string | null
          list_item_id: string | null
          list_name: string | null
          list_type: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          responsible_initials: string | null
          responsible_name: string | null
          subgroup_id: string | null
          subgroup_name: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_ingredients_to_recipe: {
        Args: {
          recipe_id_param: string
          num_ingredients: number
          num_sub_recipes: number
        }
        Returns: undefined
      }
      add_ingredients_to_subreceita: {
        Args: { recipe_id_param: string; num_ingredients: number }
        Returns: undefined
      }
      add_random_ingredients_to_subreceitas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_materials_list: {
        Args: { p_company_id: string; p_order_recipes: Json }
        Returns: {
          material_id: string
          product_id: string
          product_name: string
          product_unit: string
          total_quantity: number
          unit_cost: number
          total_cost: number
          supplier: string
          current_stock: number
          min_stock: number
        }[]
      }
      calculate_pre_weighing_list: {
        Args: { p_company_id: string; p_order_recipes: Json }
        Returns: {
          item_id: string
          item_type: string
          recipe_id: string
          recipe_name: string
          product_id: string
          product_name: string
          quantity: number
          unit: string
          notes: string
          order_sequence: number
        }[]
      }
      check_if_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_user_company_access: {
        Args: { check_user_id: string; check_company_id: string }
        Returns: boolean
      }
      create_user_with_profile: {
        Args: {
          user_email: string
          user_password: string
          user_full_name: string
          user_company_id: string
          user_role?: string
          force_pwd_change?: boolean
        }
        Returns: Json
      }
      current_user_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          uid: string
          email: string
          is_admin: boolean
        }[]
      }
      debug_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          uid: string
          email: string
          is_admin: boolean
          role: string
        }[]
      }
      get_active_company_for_user: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_active_products: {
        Args: { p_company_id: string }
        Returns: {
          all_days: boolean | null
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost: number
          created_at: string | null
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string
          is_deleted: boolean | null
          kg_weight: number | null
          min_stock: number
          monday: boolean | null
          name: string
          product_type_id: string
          recipe_id: string | null
          saturday: boolean | null
          setor_id: string | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          unit: string
          unit_price: number | null
          unit_weight: number | null
          updated_at: string | null
          wednesday: boolean | null
        }[]
      }
      get_inventory_products: {
        Args: { p_company_id: string }
        Returns: {
          all_days: boolean | null
          ativo: boolean | null
          code: string | null
          company_id: string | null
          cost: number
          created_at: string | null
          current_stock: number | null
          friday: boolean | null
          group_id: string | null
          id: string
          is_deleted: boolean | null
          kg_weight: number | null
          min_stock: number
          monday: boolean | null
          name: string
          product_type_id: string
          recipe_id: string | null
          saturday: boolean | null
          setor_id: string | null
          sku: string | null
          subgroup_id: string | null
          sunday: boolean | null
          supplier: string | null
          thursday: boolean | null
          tuesday: boolean | null
          unit: string
          unit_price: number | null
          unit_weight: number | null
          updated_at: string | null
          wednesday: boolean | null
        }[]
      }
      get_my_admin_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_generate_production_calendar: {
        Args: {
          p_company_id: string
          p_user_id: string
          p_force_refresh?: boolean
        }
        Returns: Json
      }
      get_production_control_data: {
        Args: { p_list_id: string; p_company_id: string }
        Returns: {
          list_id: string
          list_name: string
          list_created_at: string
          list_type: string
          product_id: string
          product_code: string
          product_name: string
          quantity: number
          unit: string
          group_id: string
          group_name: string
          subgroup_id: string
          subgroup_name: string
          responsible_initials: string
        }[]
      }
      get_user_companies_materialized: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string
        }[]
      }
      get_user_company_data: {
        Args: { user_uuid: string }
        Returns: {
          role: string
          company_id: string
          company_name: string
        }[]
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_of_company: {
        Args: { check_company_id: string }
        Returns: boolean
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      register_company_and_set_admin: {
        Args: {
          p_company_name: string
          p_cnpj: string
          p_company_owner_name: string
          p_company_owner_phone: string
          p_company_owner_email: string
          p_company_owner_whatsapp: string
          p_admin_user_id: string
          p_admin_full_name: string
          p_force_password_change?: boolean
        }
        Returns: string
      }
      soft_delete_recipe: {
        Args: { p_recipe_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
