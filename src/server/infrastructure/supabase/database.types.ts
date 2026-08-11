export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          action: string
          request_count: number
          subject_hash: string
          window_started_at: string
        }
        Insert: {
          action: string
          request_count: number
          subject_hash: string
          window_started_at: string
        }
        Update: {
          action?: string
          request_count?: number
          subject_hash?: string
          window_started_at?: string
        }
        Relationships: []
      }
      file_share_requests: {
        Row: {
          created_at: string
          file_id: string
          grantee_id: string | null
          id: string
          recipient_email: string
          recipient_email_normalized: string | null
        }
        Insert: {
          created_at?: string
          file_id: string
          grantee_id?: string | null
          id?: string
          recipient_email: string
          recipient_email_normalized?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          grantee_id?: string | null
          id?: string
          recipient_email?: string
          recipient_email_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_share_requests_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          created_at: string
          file_id: string
          grantee_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          grantee_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          grantee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          cleanup_claimed_at: string | null
          content_type: string | null
          created_at: string
          declared_mime: string
          declared_size_bytes: number
          deleted_at: string | null
          finalized_at: string | null
          id: string
          object_path: string
          original_name: string
          owner_id: string
          size_bytes: number | null
          status: string
        }
        Insert: {
          cleanup_claimed_at?: string | null
          content_type?: string | null
          created_at?: string
          declared_mime: string
          declared_size_bytes: number
          deleted_at?: string | null
          finalized_at?: string | null
          id: string
          object_path: string
          original_name: string
          owner_id: string
          size_bytes?: number | null
          status?: string
        }
        Update: {
          cleanup_claimed_at?: string | null
          content_type?: string | null
          created_at?: string
          declared_mime?: string
          declared_size_bytes?: number
          deleted_at?: string | null
          finalized_at?: string | null
          id?: string
          object_path?: string
          original_name?: string
          owner_id?: string
          size_bytes?: number | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          email_normalized: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_normalized?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_normalized?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_file_cleanup_candidates: {
        Args: {
          p_deleted_before: string
          p_limit: number
          p_pending_before: string
          p_rejected_before: string
          p_retry_before: string
        }
        Returns: {
          claimed_at: string
          id: string
          object_path: string
        }[]
      }
      consume_api_rate_limit: {
        Args: {
          p_action: string
          p_limit: number
          p_subject_hash: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      request_file_share: {
        Args: {
          p_file_id: string
          p_owner_id: string
          p_recipient_email: string
        }
        Returns: {
          created_at: string
          recipient_email: string
          share_id: string
        }[]
      }
      reserve_file_upload: {
        Args: {
          p_declared_mime: string
          p_declared_size_bytes: number
          p_id: string
          p_object_path: string
          p_original_name: string
          p_owner_id: string
        }
        Returns: undefined
      }
      revoke_file_share_request: {
        Args: { p_file_id: string; p_owner_id: string; p_share_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
