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
      bookings: {
        Row: {
          created_at: string
          guests: number
          id: string
          notes: string | null
          provider_id: string | null
          service_id: string
          status: string
          total_price: number
          travel_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          guests?: number
          id?: string
          notes?: string | null
          provider_id?: string | null
          service_id: string
          status?: string
          total_price?: number
          travel_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          guests?: number
          id?: string
          notes?: string | null
          provider_id?: string | null
          service_id?: string
          status?: string
          total_price?: number
          travel_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          related_booking_id: string | null
          related_message_id: string | null
          related_service_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          related_booking_id?: string | null
          related_message_id?: string | null
          related_service_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          related_booking_id?: string | null
          related_message_id?: string | null
          related_service_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_message_id_fkey"
            columns: ["related_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          error_code: string | null
          error_description: string | null
          id: string
          method: string
          payment_method: string | null
          provider_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          method?: string
          payment_method?: string | null
          provider_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          method?: string
          payment_method?: string | null
          provider_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          location?: string | null
          phone?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          is_hidden: boolean | null
          is_moderated: boolean | null
          provider_id: string | null
          provider_responded_at: string | null
          provider_response: string | null
          rating: number
          reviewer_location: string | null
          reviewer_name: string | null
          service_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_hidden?: boolean | null
          is_moderated?: boolean | null
          provider_id?: string | null
          provider_responded_at?: string | null
          provider_response?: string | null
          rating?: number
          reviewer_location?: string | null
          reviewer_name?: string | null
          service_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_hidden?: boolean | null
          is_moderated?: boolean | null
          provider_id?: string | null
          provider_responded_at?: string | null
          provider_response?: string | null
          rating?: number
          reviewer_location?: string | null
          reviewer_name?: string | null
          service_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          city: string | null
          country: string | null
          created_at: string
          currency: string
          description: string | null
          destination: string
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          max_guests: number | null
          price: number
          provider_id: string | null
          rating: number
          review_count: number
          state: string | null
          title: string
        }
        Insert: {
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          max_guests?: number | null
          price?: number
          provider_id?: string | null
          rating?: number
          review_count?: number
          state?: string | null
          title: string
        }
        Update: {
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          max_guests?: number | null
          price?: number
          provider_id?: string | null
          rating?: number
          review_count?: number
          state?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
      trip_plans: {
        Row: {
          budget_tier: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          days_count: number
          destination: string
          destination_slug: string | null
          end_date: string | null
          estimated_total_cost: number | null
          id: string
          interests: string[] | null
          is_public: boolean | null
          start_date: string | null
          status: string | null
          summary: string | null
          title: string
          travel_style: string | null
          travelers_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget_tier?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          days_count?: number
          destination: string
          destination_slug?: string | null
          end_date?: string | null
          estimated_total_cost?: number | null
          id?: string
          interests?: string[] | null
          is_public?: boolean | null
          start_date?: string | null
          status?: string | null
          summary?: string | null
          title: string
          travel_style?: string | null
          travelers_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget_tier?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          days_count?: number
          destination?: string
          destination_slug?: string | null
          end_date?: string | null
          estimated_total_cost?: number | null
          id?: string
          interests?: string[] | null
          is_public?: boolean | null
          start_date?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          travel_style?: string | null
          travelers_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      itinerary_items: {
        Row: {
          booking_url: string | null
          created_at: string
          day_number: number
          description: string | null
          estimated_cost: number | null
          external_reference_id: string | null
          id: string
          image_url: string | null
          is_booked: boolean | null
          item_type: string
          location: string | null
          notes: string | null
          order_index: number
          rating: number | null
          service_id: string | null
          time_slot: string
          title: string
          trip_plan_id: string
          updated_at: string
        }
        Insert: {
          booking_url?: string | null
          created_at?: string
          day_number: number
          description?: string | null
          estimated_cost?: number | null
          external_reference_id?: string | null
          id?: string
          image_url?: string | null
          is_booked?: boolean | null
          item_type: string
          location?: string | null
          notes?: string | null
          order_index?: number
          rating?: number | null
          service_id?: string | null
          time_slot: string
          title: string
          trip_plan_id: string
          updated_at?: string
        }
        Update: {
          booking_url?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          estimated_cost?: number | null
          external_reference_id?: string | null
          id?: string
          image_url?: string | null
          is_booked?: boolean | null
          item_type?: string
          location?: string | null
          notes?: string | null
          order_index?: number
          rating?: number | null
          service_id?: string | null
          time_slot?: string
          title?: string
          trip_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_plan_id_fkey"
            columns: ["trip_plan_id"]
            isOneToOne: false
            referencedRelation: "trip_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          item_type: "destination" | "hotel" | "restaurant" | "experience" | "tour" | "guide"
          item_id: string
          item_title: string
          item_image: string | null
          item_category: string | null
          destination: string | null
          city: string | null
          state: string | null
          price: number | null
          currency: string
          rating: number | null
          review_count: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_type: "destination" | "hotel" | "restaurant" | "experience" | "tour" | "guide"
          item_id: string
          item_title: string
          item_image?: string | null
          item_category?: string | null
          destination?: string | null
          city?: string | null
          state?: string | null
          price?: number | null
          currency?: string
          rating?: number | null
          review_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_type?: "destination" | "hotel" | "restaurant" | "experience" | "tour" | "guide"
          item_id?: string
          item_title?: string
          item_image?: string | null
          item_category?: string | null
          destination?: string | null
          city?: string | null
          state?: string | null
          price?: number | null
          currency?: string
          rating?: number | null
          review_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      packing_lists: {
        Row: {
          created_at: string
          destination: string
          id: string
          packed_items: number
          title: string
          total_items: number
          trip_plan_id: string | null
          updated_at: string
          user_id: string | null
          weather_summary: string | null
        }
        Insert: {
          created_at?: string
          destination: string
          id?: string
          packed_items?: number
          title: string
          total_items?: number
          trip_plan_id?: string | null
          updated_at?: string
          user_id?: string | null
          weather_summary?: string | null
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          packed_items?: number
          title?: string
          total_items?: number
          trip_plan_id?: string | null
          updated_at?: string
          user_id?: string | null
          weather_summary?: string | null
        }
        Relationships: []
      }
      packing_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_custom: boolean
          is_packed: boolean
          name: string
          packing_list_id: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_custom?: boolean
          is_packed?: boolean
          name: string
          packing_list_id: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_custom?: boolean
          is_packed?: boolean
          name?: string
          packing_list_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "tourist" | "provider" | "admin"
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
      app_role: ["tourist", "provider", "admin"],
    },
  },
} as const
