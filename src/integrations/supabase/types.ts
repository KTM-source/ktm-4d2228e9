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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          count: number
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          count?: number
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          count?: number
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      challenge_completions: {
        Row: {
          challenge_id: string | null
          completed_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "user_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_projects: {
        Row: {
          created_at: string
          files: Json
          id: string
          is_public: boolean | null
          name: string
          share_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          share_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          share_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          category: string
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
        }
        Insert: {
          category: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      game_comments: {
        Row: {
          content: string
          created_at: string
          game_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          game_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_comments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_ratings: {
        Row: {
          created_at: string
          game_id: string
          id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          rating: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_ratings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          game_name: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          game_name: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          game_name?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          additional_files: Json[] | null
          ai_review: string | null
          ai_review_status: string | null
          background_image: string | null
          category: string
          created_at: string
          description: string
          developer: string | null
          download_link: string | null
          features: string[] | null
          genre: string | null
          id: string
          image: string
          platforms: string[] | null
          rating: number | null
          release_date: string
          screenshots: string[] | null
          size: string
          slug: string
          system_requirements_minimum: Json | null
          system_requirements_recommended: Json | null
          title: string
          trailer_url: string | null
          translations: Json | null
          updated_at: string
          version: string
          views: number
        }
        Insert: {
          additional_files?: Json[] | null
          ai_review?: string | null
          ai_review_status?: string | null
          background_image?: string | null
          category: string
          created_at?: string
          description: string
          developer?: string | null
          download_link?: string | null
          features?: string[] | null
          genre?: string | null
          id?: string
          image: string
          platforms?: string[] | null
          rating?: number | null
          release_date?: string
          screenshots?: string[] | null
          size: string
          slug: string
          system_requirements_minimum?: Json | null
          system_requirements_recommended?: Json | null
          title: string
          trailer_url?: string | null
          translations?: Json | null
          updated_at?: string
          version?: string
          views?: number
        }
        Update: {
          additional_files?: Json[] | null
          ai_review?: string | null
          ai_review_status?: string | null
          background_image?: string | null
          category?: string
          created_at?: string
          description?: string
          developer?: string | null
          download_link?: string | null
          features?: string[] | null
          genre?: string | null
          id?: string
          image?: string
          platforms?: string[] | null
          rating?: number | null
          release_date?: string
          screenshots?: string[] | null
          size?: string
          slug?: string
          system_requirements_minimum?: Json | null
          system_requirements_recommended?: Json | null
          title?: string
          trailer_url?: string | null
          translations?: Json | null
          updated_at?: string
          version?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          is_permanently_verified: boolean | null
          is_verified: boolean | null
          last_name: string | null
          last_username_change: string | null
          totp_enabled: boolean | null
          totp_secret: string | null
          updated_at: string
          user_id: string
          username: string
          verified_until: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          is_permanently_verified?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          last_username_change?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
          user_id: string
          username: string
          verified_until?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_permanently_verified?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          last_username_change?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verified_until?: string | null
        }
        Relationships: []
      }
      published_websites: {
        Row: {
          created_at: string
          files: Json
          id: string
          project_id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_websites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "coding_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string
          email: string
          full_name: string
          game_name: string
          id: string
          issue_type: string
        }
        Insert: {
          created_at?: string
          description: string
          email: string
          full_name: string
          game_name: string
          id?: string
          issue_type: string
        }
        Update: {
          created_at?: string
          description?: string
          email?: string
          full_name?: string
          game_name?: string
          id?: string
          issue_type?: string
        }
        Relationships: []
      }
      site_announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_icon: string
          achievement_name: string
          achievement_type: string
          id: string
          unlocked_at: string
          user_id: string | null
        }
        Insert: {
          achievement_icon: string
          achievement_name: string
          achievement_type: string
          id?: string
          unlocked_at?: string
          user_id?: string | null
        }
        Update: {
          achievement_icon?: string
          achievement_name?: string
          achievement_type?: string
          id?: string
          unlocked_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_description: string | null
          challenge_hash: string
          challenge_text: string
          challenge_type: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          is_completed: boolean | null
          user_id: string | null
        }
        Insert: {
          challenge_description?: string | null
          challenge_hash: string
          challenge_text: string
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_completed?: boolean | null
          user_id?: string | null
        }
        Update: {
          challenge_description?: string | null
          challenge_hash?: string
          challenge_text?: string
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_completed?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          collection_name: string | null
          created_at: string
          game_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          game_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          collection_name?: string | null
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          chat_messages_sent: number | null
          favorites_count: number | null
          first_visit: string
          games_downloaded: number | null
          games_viewed: number | null
          id: string
          last_visit: string
          longest_streak: number | null
          streak_days: number | null
          total_time_spent: number | null
          user_id: string | null
        }
        Insert: {
          chat_messages_sent?: number | null
          favorites_count?: number | null
          first_visit?: string
          games_downloaded?: number | null
          games_viewed?: number | null
          id?: string
          last_visit?: string
          longest_streak?: number | null
          streak_days?: number | null
          total_time_spent?: number | null
          user_id?: string | null
        }
        Update: {
          chat_messages_sent?: number | null
          favorites_count?: number | null
          first_visit?: string
          games_downloaded?: number | null
          games_viewed?: number | null
          id?: string
          last_visit?: string
          longest_streak?: number | null
          streak_days?: number | null
          total_time_spent?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_game_average_rating: { Args: { game_uuid: string }; Returns: number }
      get_game_rating_count: { Args: { game_uuid: string }; Returns: number }
      increment_views: { Args: { game_id: string }; Returns: undefined }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      is_website_username_available: {
        Args: { check_username: string }
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
