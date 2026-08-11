// Mirrors the committed public schema migrations. Regenerate from a running
// local Supabase instance with `npm run supabase:types` after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      file_shares: {
        Row: {
          created_at: string;
          file_id: string;
          grantee_id: string;
        };
        Insert: {
          created_at?: string;
          file_id: string;
          grantee_id: string;
        };
        Update: {
          created_at?: string;
          file_id?: string;
          grantee_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["id"];
          },
        ];
      };
      files: {
        Row: {
          content_type: string | null;
          created_at: string;
          declared_mime: string;
          deleted_at: string | null;
          finalized_at: string | null;
          id: string;
          object_path: string;
          original_name: string;
          owner_id: string;
          size_bytes: number | null;
          status: string;
        };
        Insert: {
          content_type?: string | null;
          created_at?: string;
          declared_mime: string;
          deleted_at?: string | null;
          finalized_at?: string | null;
          id: string;
          object_path: string;
          original_name: string;
          owner_id: string;
          size_bytes?: number | null;
          status?: string;
        };
        Update: {
          content_type?: string | null;
          created_at?: string;
          declared_mime?: string;
          deleted_at?: string | null;
          finalized_at?: string | null;
          id?: string;
          object_path?: string;
          original_name?: string;
          owner_id?: string;
          size_bytes?: number | null;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
