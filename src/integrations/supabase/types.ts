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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      dashboard_shares: {
        Row: {
          created_at: string | null
          dashboard_id: string
          id: string
          permission: string
          shared_with: string
        }
        Insert: {
          created_at?: string | null
          dashboard_id: string
          id?: string
          permission?: string
          shared_with: string
        }
        Update: {
          created_at?: string | null
          dashboard_id?: string
          id?: string
          permission?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_shares_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string | null
          dashboard_id: string
          id: string
          position: Json
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          dashboard_id: string
          id?: string
          position?: Json
          title?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          dashboard_id?: string
          id?: string
          position?: Json
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string | null
          description: string | null
          filters: Json | null
          id: string
          is_template: boolean | null
          layout: Json | null
          name: string
          owner_id: string
          settings: Json | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_template?: boolean | null
          layout?: Json | null
          name?: string
          owner_id: string
          settings?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_template?: boolean | null
          layout?: Json | null
          name?: string
          owner_id?: string
          settings?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_revisions: {
        Row: {
          batch_id: string
          created_at: string | null
          documento: string
          id: string
          modificado_em: string | null
          nivel2: string | null
          proposito_emissao: string | null
          revisao: string | null
          status: string | null
          texto_consolidacao: string | null
          titulo: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          documento: string
          id?: string
          modificado_em?: string | null
          nivel2?: string | null
          proposito_emissao?: string | null
          revisao?: string | null
          status?: string | null
          texto_consolidacao?: string | null
          titulo?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          documento?: string
          id?: string
          modificado_em?: string | null
          nivel2?: string | null
          proposito_emissao?: string | null
          revisao?: string | null
          status?: string | null
          texto_consolidacao?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_revisions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          batch_id: string
          created_at: string | null
          dias_corridos_wf: number | null
          documento: string
          id: string
          incluido_em: string | null
          nivel2: string | null
          nivel3: string | null
          revisao: string | null
          status: string | null
          status_workflow: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          dias_corridos_wf?: number | null
          documento: string
          id?: string
          incluido_em?: string | null
          nivel2?: string | null
          nivel3?: string | null
          revisao?: string | null
          status?: string | null
          status_workflow?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          dias_corridos_wf?: number | null
          documento?: string
          id?: string
          incluido_em?: string | null
          nivel2?: string | null
          nivel3?: string | null
          revisao?: string | null
          status?: string | null
          status_workflow?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      gitec_events: {
        Row: {
          agrupamento: string
          batch_id: string
          comentario: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_execucao: string | null
          data_inf_execucao: string | null
          etapa: string | null
          evidencias: string | null
          executado_por: string | null
          fiscal: string | null
          id: string
          ippu: string | null
          status: string
          tag: string | null
          valor: number | null
        }
        Insert: {
          agrupamento?: string
          batch_id: string
          comentario?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          etapa?: string | null
          evidencias?: string | null
          executado_por?: string | null
          fiscal?: string | null
          id?: string
          ippu?: string | null
          status?: string
          tag?: string | null
          valor?: number | null
        }
        Update: {
          agrupamento?: string
          batch_id?: string
          comentario?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          etapa?: string | null
          evidencias?: string | null
          executado_por?: string | null
          fiscal?: string | null
          id?: string
          ippu?: string | null
          status?: string
          tag?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gitec_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string | null
          errors: Json | null
          filename: string
          id: string
          row_count: number | null
          source: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          filename: string
          id?: string
          row_count?: number | null
          source: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          filename?: string
          id?: string
          row_count?: number | null
          source?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      documents_with_status: {
        Row: {
          batch_id: string | null
          created_at: string | null
          dias_corridos_wf: number | null
          documento: string | null
          has_gitec: boolean | null
          has_recusa: boolean | null
          id: string | null
          incluido_em: string | null
          nivel2: string | null
          nivel3: string | null
          revisao: string | null
          status: string | null
          status_workflow: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          dias_corridos_wf?: number | null
          documento?: string | null
          has_gitec?: never
          has_recusa?: never
          id?: string | null
          incluido_em?: string | null
          nivel2?: string | null
          nivel3?: string | null
          revisao?: string | null
          status?: string | null
          status_workflow?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          dias_corridos_wf?: number | null
          documento?: string | null
          has_gitec?: never
          has_recusa?: never
          id?: string | null
          incluido_em?: string | null
          nivel2?: string | null
          nivel3?: string | null
          revisao?: string | null
          status?: string | null
          status_workflow?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      gitec_by_fiscal: {
        Row: {
          aprovados: number | null
          fiscal: string | null
          pend_aprov: number | null
          pend_verif: number | null
          total: number | null
          val_pend_aprov: number | null
          val_pend_verif: number | null
        }
        Relationships: []
      }
      gitec_by_ippu: {
        Row: {
          aprovados: number | null
          ippu: string | null
          pend_aprovacao: number | null
          pend_verificacao: number | null
          total_eventos: number | null
          val_aprovado: number | null
          val_pend_aprov: number | null
          val_pend_verif: number | null
          val_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_dashboard_share: {
        Args: { d_id: string; u_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dashboard_owner: {
        Args: { d_id: string; u_id: string }
        Returns: boolean
      }
      owns_import_batch: {
        Args: { b_id: string; u_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "tecnico"
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
      app_role: ["admin", "gestor", "tecnico"],
    },
  },
} as const
