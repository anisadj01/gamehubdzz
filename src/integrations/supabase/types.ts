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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity: string
          id: string
          user_id: string | null
          user_name: string
          venue_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity?: string
          id?: string
          user_id?: string | null
          user_name?: string
          venue_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity?: string
          id?: string
          user_id?: string | null
          user_name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          category_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          receipt_url: string | null
          spent_on: string
          venue_id: string | null
        }
        Insert: {
          amount?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          spent_on?: string
          venue_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          spent_on?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      game_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          product_id: string | null
          product_name: string
          reason: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          product_id?: string | null
          product_name?: string
          reason?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          product_id?: string | null
          product_name?: string
          reason?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      license_events: {
        Row: {
          created_at: string
          details: string | null
          event: string
          id: string
          license_id: string
          machine_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          event: string
          id?: string
          license_id: string
          machine_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          event?: string
          id?: string
          license_id?: string
          machine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activated_at: string | null
          created_at: string
          customer_name: string
          expires_at: string | null
          id: string
          license_key: string
          machine_id: string | null
          notes: string | null
          status: string
          updated_at: string
          venue_id: string | null
          venue_name: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          customer_name?: string
          expires_at?: string | null
          id?: string
          license_key: string
          machine_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
          venue_name?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          customer_name?: string
          expires_at?: string | null
          id?: string
          license_key?: string
          machine_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          email: string
          id: string
          ip_address: string | null
          machine_id: string | null
          os: string | null
          user_agent: string | null
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          machine_id?: string | null
          os?: string | null
          user_agent?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          machine_id?: string | null
          os?: string | null
          user_agent?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          price: number
          stock: number
          venue_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          price?: number
          stock?: number
          venue_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          stock?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          shift_minutes: number
          venue_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id: string
          shift_minutes?: number
          venue_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          shift_minutes?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          duration_minutes: number
          id: string
          notes: string | null
          phone: string | null
          start_at: string
          station_id: string | null
          status: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          phone?: string | null
          start_at: string
          station_id?: string | null
          status?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          phone?: string | null
          start_at?: string
          station_id?: string | null
          status?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      session_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          session_id: string
          total: number
          unit_price: number
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          session_id: string
          total?: number
          unit_price?: number
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          session_id?: string
          total?: number
          unit_price?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          category_name: string | null
          created_at: string
          customer_name: string | null
          duration_minutes: number
          employee_id: string | null
          employee_name: string
          ended_at: string | null
          game_amount: number
          game_rate: number
          games_count: number
          hourly_rate: number
          id: string
          mode: string
          planned_minutes: number | null
          products_amount: number
          started_at: string
          station_id: string | null
          station_name: string
          status: string
          ticket_no: number
          total_amount: number
          venue_id: string | null
        }
        Insert: {
          category_name?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number
          employee_id?: string | null
          employee_name?: string
          ended_at?: string | null
          game_amount?: number
          game_rate?: number
          games_count?: number
          hourly_rate?: number
          id?: string
          mode?: string
          planned_minutes?: number | null
          products_amount?: number
          started_at?: string
          station_id?: string | null
          station_name?: string
          status?: string
          ticket_no?: number
          total_amount?: number
          venue_id?: string | null
        }
        Update: {
          category_name?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number
          employee_id?: string | null
          employee_name?: string
          ended_at?: string | null
          game_amount?: number
          game_rate?: number
          games_count?: number
          hourly_rate?: number
          id?: string
          mode?: string
          planned_minutes?: number | null
          products_amount?: number
          started_at?: string
          station_id?: string | null
          station_name?: string
          status?: string
          ticket_no?: number
          total_amount?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stations: {
        Row: {
          category_id: string | null
          color: string
          created_at: string
          game_rate: number | null
          hourly_rate: number
          id: string
          image_url: string | null
          name: string
          sort_order: number
          status: string
          venue_id: string | null
        }
        Insert: {
          category_id?: string | null
          color?: string
          created_at?: string
          game_rate?: number | null
          hourly_rate?: number
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
          status?: string
          venue_id?: string | null
        }
        Update: {
          category_id?: string | null
          color?: string
          created_at?: string
          game_rate?: number | null
          hourly_rate?: number
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          status?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      work_shifts: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number
          started_at: string
          user_id: string
          user_name: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          started_at?: string
          user_id: string
          user_name?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          started_at?: string
          user_id?: string
          user_name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_venue_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_developer: { Args: never; Returns: boolean }
      owns_venue: { Args: { _venue: string }; Returns: boolean }
      same_venue: { Args: { _venue: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee" | "developer"
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
      app_role: ["admin", "employee", "developer"],
    },
  },
} as const
