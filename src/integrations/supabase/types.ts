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
      anotacoes: {
        Row: {
          autor_id: string
          autor_nome: string | null
          categoria: string | null
          contexto: string
          contrato_id: string | null
          created_at: string | null
          id: string
          referencia: string
          texto: string
        }
        Insert: {
          autor_id: string
          autor_nome?: string | null
          categoria?: string | null
          contexto: string
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          referencia: string
          texto: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string | null
          categoria?: string | null
          contexto?: string
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          referencia?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          contrato_id: string | null
          created_at: string | null
          detalhes: Json | null
          entidade: string
          id: string
          referencia: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          contrato_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          entidade: string
          id?: string
          referencia?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          contrato_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          entidade?: string
          id?: string
          referencia?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_periodos: {
        Row: {
          bm_name: string
          bm_number: number
          contrato_id: string | null
          created_at: string | null
          data_abertura: string | null
          data_fechamento: string | null
          fechado_por: string | null
          id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string | null
          updated_at: string | null
          valor_medido: number | null
          valor_previsto: number | null
        }
        Insert: {
          bm_name: string
          bm_number: number
          contrato_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string | null
          updated_at?: string | null
          valor_medido?: number | null
          valor_previsto?: number | null
        }
        Update: {
          bm_name?: string
          bm_number?: number
          contrato_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string | null
          updated_at?: string | null
          valor_medido?: number | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bm_periodos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletim_itens: {
        Row: {
          boletim_id: string | null
          contrato_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          ippu: string
          observacao: string | null
          valor_aprovado: number | null
          valor_executado_scon: number | null
          valor_medido_gitec: number | null
          valor_postado_sigem: number | null
          valor_previsto: number | null
        }
        Insert: {
          boletim_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ippu: string
          observacao?: string | null
          valor_aprovado?: number | null
          valor_executado_scon?: number | null
          valor_medido_gitec?: number | null
          valor_postado_sigem?: number | null
          valor_previsto?: number | null
        }
        Update: {
          boletim_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ippu?: string
          observacao?: string | null
          valor_aprovado?: number | null
          valor_executado_scon?: number | null
          valor_medido_gitec?: number | null
          valor_postado_sigem?: number | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletim_itens_boletim_id_fkey"
            columns: ["boletim_id"]
            isOneToOne: false
            referencedRelation: "boletins_medicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletim_itens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletins_medicao: {
        Row: {
          aprovado_em: string | null
          bm_name: string
          contrato_id: string | null
          created_at: string | null
          enviado_em: string | null
          finalizado_em: string | null
          gerado_em: string | null
          gerado_por: string | null
          id: string
          numero: string
          observacoes: string | null
          qtd_itens: number | null
          status: string | null
          valor_total: number | null
        }
        Insert: {
          aprovado_em?: string | null
          bm_name: string
          contrato_id?: string | null
          created_at?: string | null
          enviado_em?: string | null
          finalizado_em?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          qtd_itens?: number | null
          status?: string | null
          valor_total?: number | null
        }
        Update: {
          aprovado_em?: string | null
          bm_name?: string
          contrato_id?: string | null
          created_at?: string | null
          enviado_em?: string | null
          finalizado_em?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          qtd_itens?: number | null
          status?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletins_medicao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      classificacao_ppu: {
        Row: {
          agrupamento: string | null
          batch_id: string | null
          contrato_id: string | null
          created_at: string | null
          disciplina: string | null
          fase: string | null
          id: string
          item_eap: string | null
          item_gitec: string | null
          item_ppu: string
          subfase: string | null
        }
        Insert: {
          agrupamento?: string | null
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          fase?: string | null
          id?: string
          item_eap?: string | null
          item_gitec?: string | null
          item_ppu: string
          subfase?: string | null
        }
        Update: {
          agrupamento?: string | null
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          fase?: string | null
          id?: string
          item_eap?: string | null
          item_gitec?: string | null
          item_ppu?: string
          subfase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classificacao_ppu_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacao_ppu_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      contrato_usuarios: {
        Row: {
          ativo: boolean | null
          contrato_id: string
          created_at: string | null
          disciplinas: string[] | null
          id: string
          modulos_acesso: string[] | null
          role: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          contrato_id: string
          created_at?: string | null
          disciplinas?: string[] | null
          id?: string
          modulos_acesso?: string[] | null
          role?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          contrato_id?: string
          created_at?: string | null
          disciplinas?: string[] | null
          id?: string
          modulos_acesso?: string[] | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_usuarios_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          alerta_aging_dias: number | null
          alerta_dados_desatualizados: number | null
          alerta_scon_minimo: number | null
          ativo: boolean | null
          bm_dia_fim: number | null
          bm_dia_inicio: number | null
          bm_mes_referencia: string | null
          bm_total: number | null
          codigo: string
          cor_primaria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          logo_url: string | null
          nome: string
          numero_contrato: string | null
          unidade: string | null
          updated_at: string | null
          valor_contratual: number
        }
        Insert: {
          alerta_aging_dias?: number | null
          alerta_dados_desatualizados?: number | null
          alerta_scon_minimo?: number | null
          ativo?: boolean | null
          bm_dia_fim?: number | null
          bm_dia_inicio?: number | null
          bm_mes_referencia?: string | null
          bm_total?: number | null
          codigo: string
          cor_primaria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          numero_contrato?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_contratual: number
        }
        Update: {
          alerta_aging_dias?: number | null
          alerta_dados_desatualizados?: number | null
          alerta_scon_minimo?: number | null
          ativo?: boolean | null
          bm_dia_fim?: number | null
          bm_dia_inicio?: number | null
          bm_mes_referencia?: string | null
          bm_total?: number | null
          codigo?: string
          cor_primaria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          numero_contrato?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_contratual?: number
        }
        Relationships: []
      }
      criterio_medicao: {
        Row: {
          batch_id: string | null
          contrato_id: string | null
          created_at: string | null
          dicionario_etapa: string | null
          id: string
          identificador: string | null
          item_ppu: string | null
          nivel_estrutura: string | null
          nome: string | null
          peso_absoluto: number | null
          peso_fisico_fin: number | null
        }
        Insert: {
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          dicionario_etapa?: string | null
          id?: string
          identificador?: string | null
          item_ppu?: string | null
          nivel_estrutura?: string | null
          nome?: string | null
          peso_absoluto?: number | null
          peso_fisico_fin?: number | null
        }
        Update: {
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          dicionario_etapa?: string | null
          id?: string
          identificador?: string | null
          item_ppu?: string | null
          nivel_estrutura?: string | null
          nome?: string | null
          peso_absoluto?: number | null
          peso_fisico_fin?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "criterio_medicao_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterio_medicao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_bm_values: {
        Row: {
          batch_id: string
          bm_name: string
          bm_number: number
          contrato_id: string | null
          created_at: string | null
          id: string
          ippu: string | null
          tipo: string
          tree_id: string | null
          valor: number | null
        }
        Insert: {
          batch_id: string
          bm_name: string
          bm_number: number
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          ippu?: string | null
          tipo: string
          tree_id?: string | null
          valor?: number | null
        }
        Update: {
          batch_id?: string
          bm_name?: string
          bm_number?: number
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          ippu?: string | null
          tipo?: string
          tree_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_bm_values_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_bm_values_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_bm_values_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_bm_values_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "vw_cronograma_tree_completo"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_tree: {
        Row: {
          acumulado: number | null
          batch_id: string
          contrato_id: string | null
          created_at: string | null
          fase_nome: string | null
          id: string
          ippu: string | null
          nivel: string
          nome: string
          saldo: number | null
          sort_order: number | null
          subfase_nome: string | null
          valor: number | null
        }
        Insert: {
          acumulado?: number | null
          batch_id: string
          contrato_id?: string | null
          created_at?: string | null
          fase_nome?: string | null
          id?: string
          ippu?: string | null
          nivel: string
          nome?: string
          saldo?: number | null
          sort_order?: number | null
          subfase_nome?: string | null
          valor?: number | null
        }
        Update: {
          acumulado?: number | null
          batch_id?: string
          contrato_id?: string | null
          created_at?: string | null
          fase_nome?: string | null
          id?: string
          ippu?: string | null
          nivel?: string
          nome?: string
          saldo?: number | null
          sort_order?: number | null
          subfase_nome?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_tree_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tree_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      curva_s: {
        Row: {
          batch_id: string
          col_index: number
          contrato_id: string | null
          created_at: string | null
          id: string
          label: string
          previsto_acum: number | null
          previsto_mensal: number | null
          projetado_acum: number | null
          projetado_mensal: number | null
          realizado_acum: number | null
          realizado_mensal: number | null
        }
        Insert: {
          batch_id: string
          col_index: number
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          label: string
          previsto_acum?: number | null
          previsto_mensal?: number | null
          projetado_acum?: number | null
          projetado_mensal?: number | null
          realizado_acum?: number | null
          realizado_mensal?: number | null
        }
        Update: {
          batch_id?: string
          col_index?: number
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          label?: string
          previsto_acum?: number | null
          previsto_mensal?: number | null
          projetado_acum?: number | null
          projetado_mensal?: number | null
          realizado_acum?: number | null
          realizado_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curva_s_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curva_s_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
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
      doc_acompanhamento: {
        Row: {
          acao: string | null
          contrato_id: string | null
          created_at: string | null
          criado_por: string | null
          documento: string
          id: string
          prazo: string | null
          prioridade: string | null
          resolvido: boolean | null
          resolvido_em: string | null
          responsavel: string | null
          status_atual: string | null
          updated_at: string | null
        }
        Insert: {
          acao?: string | null
          contrato_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          documento: string
          id?: string
          prazo?: string | null
          prioridade?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          responsavel?: string | null
          status_atual?: string | null
          updated_at?: string | null
        }
        Update: {
          acao?: string | null
          contrato_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          documento?: string
          id?: string
          prazo?: string | null
          prioridade?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          responsavel?: string | null
          status_atual?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_acompanhamento_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
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
      eac_items: {
        Row: {
          agrupamento: string | null
          batch_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_inicio: string | null
          data_termino: string | null
          estrutura: string | null
          fase: string | null
          id: string
          med_acumulada: number | null
          peso_fisico: number | null
          ppu: string
          ppu_agrup: string | null
          previsto: number | null
          qtd_escopo: number | null
          qtd_prevista: number | null
          qtd_utilizada_medicao: string | null
          realizado: number | null
          sistema: string | null
          subfase: string | null
          tipo_curva: string | null
          um: string | null
          up: string | null
          up_id: string | null
          valor_financeiro: number | null
          valor_saldo: number | null
          vlr_medido: number | null
        }
        Insert: {
          agrupamento?: string | null
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          estrutura?: string | null
          fase?: string | null
          id?: string
          med_acumulada?: number | null
          peso_fisico?: number | null
          ppu: string
          ppu_agrup?: string | null
          previsto?: number | null
          qtd_escopo?: number | null
          qtd_prevista?: number | null
          qtd_utilizada_medicao?: string | null
          realizado?: number | null
          sistema?: string | null
          subfase?: string | null
          tipo_curva?: string | null
          um?: string | null
          up?: string | null
          up_id?: string | null
          valor_financeiro?: number | null
          valor_saldo?: number | null
          vlr_medido?: number | null
        }
        Update: {
          agrupamento?: string | null
          batch_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          estrutura?: string | null
          fase?: string | null
          id?: string
          med_acumulada?: number | null
          peso_fisico?: number | null
          ppu?: string
          ppu_agrup?: string | null
          previsto?: number | null
          qtd_escopo?: number | null
          qtd_prevista?: number | null
          qtd_utilizada_medicao?: string | null
          realizado?: number | null
          sistema?: string | null
          subfase?: string | null
          tipo_curva?: string | null
          um?: string | null
          up?: string | null
          up_id?: string | null
          valor_financeiro?: number | null
          valor_saldo?: number | null
          vlr_medido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eac_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eac_items_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_membros: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          disciplinas: string[] | null
          equipe_id: string
          funcao: string | null
          id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          disciplinas?: string[] | null
          equipe_id: string
          funcao?: string | null
          id?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          disciplinas?: string[] | null
          equipe_id?: string
          funcao?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          ativa: boolean | null
          contrato_id: string
          created_at: string | null
          disciplina: string | null
          id: string
          lider_id: string | null
          lider_nome: string | null
          nome: string
          tipo: string | null
        }
        Insert: {
          ativa?: boolean | null
          contrato_id: string
          created_at?: string | null
          disciplina?: string | null
          id?: string
          lider_id?: string | null
          lider_nome?: string | null
          nome: string
          tipo?: string | null
        }
        Update: {
          ativa?: boolean | null
          contrato_id?: string
          created_at?: string | null
          disciplina?: string | null
          id?: string
          lider_id?: string | null
          lider_nome?: string | null
          nome?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
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
          contrato_id: string | null
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
          contrato_id?: string | null
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
          contrato_id?: string | null
          created_at?: string | null
          errors?: Json | null
          filename?: string
          id?: string
          row_count?: number | null
          source?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_modulo: {
        Row: {
          id: string
          modulo: string
          pode_criar: boolean | null
          pode_editar: boolean | null
          pode_excluir: boolean | null
          pode_exportar: boolean | null
          pode_ver: boolean | null
          role: string
        }
        Insert: {
          id?: string
          modulo: string
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_exportar?: boolean | null
          pode_ver?: boolean | null
          role: string
        }
        Update: {
          id?: string
          modulo?: string
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_exportar?: boolean | null
          pode_ver?: boolean | null
          role?: string
        }
        Relationships: []
      }
      ppu_items: {
        Row: {
          agrupamento: string | null
          batch_id: string | null
          carac: string | null
          contrato_id: string | null
          created_at: string | null
          criterio_medicao_ref: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          disc: string | null
          fam: string | null
          fase: string | null
          flag: string | null
          id: string
          item_eap: string | null
          item_gitec: string | null
          item_lc: string | null
          item_ppu: string
          preco_unit: number | null
          qtd: number | null
          reajuste: string | null
          subfase: string | null
          unid_medida: string | null
          valor_medido: number | null
          valor_total: number | null
        }
        Insert: {
          agrupamento?: string | null
          batch_id?: string | null
          carac?: string | null
          contrato_id?: string | null
          created_at?: string | null
          criterio_medicao_ref?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          disc?: string | null
          fam?: string | null
          fase?: string | null
          flag?: string | null
          id?: string
          item_eap?: string | null
          item_gitec?: string | null
          item_lc?: string | null
          item_ppu: string
          preco_unit?: number | null
          qtd?: number | null
          reajuste?: string | null
          subfase?: string | null
          unid_medida?: string | null
          valor_medido?: number | null
          valor_total?: number | null
        }
        Update: {
          agrupamento?: string | null
          batch_id?: string | null
          carac?: string | null
          contrato_id?: string | null
          created_at?: string | null
          criterio_medicao_ref?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          disc?: string | null
          fam?: string | null
          fase?: string | null
          flag?: string | null
          id?: string
          item_eap?: string | null
          item_gitec?: string | null
          item_lc?: string | null
          item_ppu?: string
          preco_unit?: number | null
          qtd?: number | null
          reajuste?: string | null
          subfase?: string | null
          unid_medida?: string | null
          valor_medido?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ppu_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppu_items_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      previsao_historico: {
        Row: {
          alterado_por: string | null
          alterado_por_nome: string | null
          bm_name: string
          contrato_id: string | null
          created_at: string | null
          id: string
          ippu: string
          justificativa: string | null
          previsao_id: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          alterado_por?: string | null
          alterado_por_nome?: string | null
          bm_name: string
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          ippu: string
          justificativa?: string | null
          previsao_id?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          alterado_por?: string | null
          alterado_por_nome?: string | null
          bm_name?: string
          contrato_id?: string | null
          created_at?: string | null
          id?: string
          ippu?: string
          justificativa?: string | null
          previsao_id?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "previsao_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previsao_historico_previsao_id_fkey"
            columns: ["previsao_id"]
            isOneToOne: false
            referencedRelation: "previsao_medicao"
            referencedColumns: ["id"]
          },
        ]
      }
      previsao_medicao: {
        Row: {
          bm_name: string
          contrato_id: string | null
          created_at: string | null
          disciplina: string | null
          id: string
          ippu: string
          justificativa: string | null
          qtd_prevista: number | null
          qtd_realizada: number | null
          responsavel_id: string
          responsavel_nome: string | null
          status: string
          updated_at: string | null
          valor_previsto: number | null
          valor_realizado: number | null
        }
        Insert: {
          bm_name: string
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          id?: string
          ippu: string
          justificativa?: string | null
          qtd_prevista?: number | null
          qtd_realizada?: number | null
          responsavel_id: string
          responsavel_nome?: string | null
          status?: string
          updated_at?: string | null
          valor_previsto?: number | null
          valor_realizado?: number | null
        }
        Update: {
          bm_name?: string
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          id?: string
          ippu?: string
          justificativa?: string | null
          qtd_prevista?: number | null
          qtd_realizada?: number | null
          responsavel_id?: string
          responsavel_nome?: string | null
          status?: string
          updated_at?: string | null
          valor_previsto?: number | null
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "previsao_medicao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
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
      rel_eventos: {
        Row: {
          agrupamento: string | null
          batch_id: string
          caracteristica: string | null
          comentario: string | null
          contrato_id: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_execucao: string | null
          data_inf_execucao: string | null
          estrutura: string | null
          etapa: string | null
          executado_por: string | null
          fase: string | null
          fiscal_responsavel: string | null
          id: string
          item_ppu: string | null
          necessita_evidencias: string | null
          numero_evidencias: string | null
          peso_financeiro: number | null
          peso_fisico: number | null
          qtd: number | null
          quantidade_ponderada: number | null
          rel_status: string | null
          rel_status_item: string | null
          status: string | null
          subfase: string | null
          tag: string | null
          tag_agrup: string | null
          um: string | null
          valor: number | null
        }
        Insert: {
          agrupamento?: string | null
          batch_id: string
          caracteristica?: string | null
          comentario?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          estrutura?: string | null
          etapa?: string | null
          executado_por?: string | null
          fase?: string | null
          fiscal_responsavel?: string | null
          id?: string
          item_ppu?: string | null
          necessita_evidencias?: string | null
          numero_evidencias?: string | null
          peso_financeiro?: number | null
          peso_fisico?: number | null
          qtd?: number | null
          quantidade_ponderada?: number | null
          rel_status?: string | null
          rel_status_item?: string | null
          status?: string | null
          subfase?: string | null
          tag?: string | null
          tag_agrup?: string | null
          um?: string | null
          valor?: number | null
        }
        Update: {
          agrupamento?: string | null
          batch_id?: string
          caracteristica?: string | null
          comentario?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          estrutura?: string | null
          etapa?: string | null
          executado_por?: string | null
          fase?: string | null
          fiscal_responsavel?: string | null
          id?: string
          item_ppu?: string | null
          necessita_evidencias?: string | null
          numero_evidencias?: string | null
          peso_financeiro?: number | null
          peso_fisico?: number | null
          qtd?: number | null
          quantidade_ponderada?: number | null
          rel_status?: string | null
          rel_status_item?: string | null
          status?: string | null
          subfase?: string | null
          tag?: string | null
          tag_agrup?: string | null
          um?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rel_eventos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rel_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      scon_components: {
        Row: {
          avanco_ponderado: number | null
          batch_id: string
          classe: string | null
          contrato_id: string | null
          created_at: string | null
          disciplina: string | null
          id: string
          item_criterio: string | null
          item_wbs: string | null
          obra_desc: string | null
          qtde_etapa: number | null
          qtde_etapa_exec_acum: number | null
          relatorio_esperado: string | null
          status_gitec: string | null
          status_sigem: string | null
          tag: string | null
          tag_desc: string | null
          tag_id_proj: string | null
          tipo: string | null
        }
        Insert: {
          avanco_ponderado?: number | null
          batch_id: string
          classe?: string | null
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          id?: string
          item_criterio?: string | null
          item_wbs?: string | null
          obra_desc?: string | null
          qtde_etapa?: number | null
          qtde_etapa_exec_acum?: number | null
          relatorio_esperado?: string | null
          status_gitec?: string | null
          status_sigem?: string | null
          tag?: string | null
          tag_desc?: string | null
          tag_id_proj?: string | null
          tipo?: string | null
        }
        Update: {
          avanco_ponderado?: number | null
          batch_id?: string
          classe?: string | null
          contrato_id?: string | null
          created_at?: string | null
          disciplina?: string | null
          id?: string
          item_criterio?: string | null
          item_wbs?: string | null
          obra_desc?: string | null
          qtde_etapa?: number | null
          qtde_etapa_exec_acum?: number | null
          relatorio_esperado?: string | null
          status_gitec?: string | null
          status_sigem?: string | null
          tag?: string | null
          tag_desc?: string | null
          tag_id_proj?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scon_components_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scon_components_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      scon_programacao: {
        Row: {
          atividade: string | null
          batch_id: string
          classe: string | null
          codigo_frente: string | null
          codigo_grupo: string | null
          codigo_tarefa: string | null
          componente: string | null
          componente_objuid: string | null
          conta_custo: string | null
          conta_custo_programacao: string | null
          contrato_id: string | null
          created_at: string | null
          cwp: string | null
          cwts_objuid: string | null
          data_fim: string | null
          data_inicio: string | null
          datahora: string | null
          descricao: string | null
          disciplina: string | null
          distribuicao: string | null
          documento: string | null
          dt_merge: string | null
          encarregado: string | null
          encarregado_cpf: string | null
          encarregado_mat: string | null
          engenheiro: string | null
          engenheiro_cpf: string | null
          engenheiro_mat: string | null
          equipe: string | null
          equipe_desc: string | null
          etapa: string | null
          exec_domingo: number | null
          exec_quarta: number | null
          exec_quinta: number | null
          exec_sabado: number | null
          exec_segunda: number | null
          exec_sexta: number | null
          exec_terca: number | null
          gerente: string | null
          gerente_cpf: string | null
          gerente_mat: string | null
          guid_model: string | null
          id: string
          id_componente_etapas: string | null
          id_primavera: string | null
          indice_atual: number | null
          indice_rop: number | null
          item_wbs: string | null
          iwp_objuid: string | null
          kpi: string | null
          modulo: string | null
          nota: string | null
          pacote: string | null
          peso_absoluto: number | null
          peso_custcode: number | null
          peso_stagecode: number | null
          plan_domingo: number | null
          plan_quarta: number | null
          plan_quinta: number | null
          plan_sabado: number | null
          plan_segunda: number | null
          plan_sexta: number | null
          plan_terca: number | null
          planta: string | null
          programacao: number | null
          programado_componente: number | null
          programado_pacote: number | null
          proposito: string | null
          recebimento: string | null
          semana: string | null
          supervisor: string | null
          supervisor_cpf: string | null
          supervisor_mat: string | null
          tag_id_proj: string | null
          tamanho_equipe: number | null
          tipo: string | null
          total_exec_geral: number | null
          total_exec_semana: number | null
          ultima_oper: string | null
          unit: string | null
          unit_unid_medida: string | null
          unit_valor: number | null
          units: number | null
        }
        Insert: {
          atividade?: string | null
          batch_id: string
          classe?: string | null
          codigo_frente?: string | null
          codigo_grupo?: string | null
          codigo_tarefa?: string | null
          componente?: string | null
          componente_objuid?: string | null
          conta_custo?: string | null
          conta_custo_programacao?: string | null
          contrato_id?: string | null
          created_at?: string | null
          cwp?: string | null
          cwts_objuid?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          datahora?: string | null
          descricao?: string | null
          disciplina?: string | null
          distribuicao?: string | null
          documento?: string | null
          dt_merge?: string | null
          encarregado?: string | null
          encarregado_cpf?: string | null
          encarregado_mat?: string | null
          engenheiro?: string | null
          engenheiro_cpf?: string | null
          engenheiro_mat?: string | null
          equipe?: string | null
          equipe_desc?: string | null
          etapa?: string | null
          exec_domingo?: number | null
          exec_quarta?: number | null
          exec_quinta?: number | null
          exec_sabado?: number | null
          exec_segunda?: number | null
          exec_sexta?: number | null
          exec_terca?: number | null
          gerente?: string | null
          gerente_cpf?: string | null
          gerente_mat?: string | null
          guid_model?: string | null
          id?: string
          id_componente_etapas?: string | null
          id_primavera?: string | null
          indice_atual?: number | null
          indice_rop?: number | null
          item_wbs?: string | null
          iwp_objuid?: string | null
          kpi?: string | null
          modulo?: string | null
          nota?: string | null
          pacote?: string | null
          peso_absoluto?: number | null
          peso_custcode?: number | null
          peso_stagecode?: number | null
          plan_domingo?: number | null
          plan_quarta?: number | null
          plan_quinta?: number | null
          plan_sabado?: number | null
          plan_segunda?: number | null
          plan_sexta?: number | null
          plan_terca?: number | null
          planta?: string | null
          programacao?: number | null
          programado_componente?: number | null
          programado_pacote?: number | null
          proposito?: string | null
          recebimento?: string | null
          semana?: string | null
          supervisor?: string | null
          supervisor_cpf?: string | null
          supervisor_mat?: string | null
          tag_id_proj?: string | null
          tamanho_equipe?: number | null
          tipo?: string | null
          total_exec_geral?: number | null
          total_exec_semana?: number | null
          ultima_oper?: string | null
          unit?: string | null
          unit_unid_medida?: string | null
          unit_valor?: number | null
          units?: number | null
        }
        Update: {
          atividade?: string | null
          batch_id?: string
          classe?: string | null
          codigo_frente?: string | null
          codigo_grupo?: string | null
          codigo_tarefa?: string | null
          componente?: string | null
          componente_objuid?: string | null
          conta_custo?: string | null
          conta_custo_programacao?: string | null
          contrato_id?: string | null
          created_at?: string | null
          cwp?: string | null
          cwts_objuid?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          datahora?: string | null
          descricao?: string | null
          disciplina?: string | null
          distribuicao?: string | null
          documento?: string | null
          dt_merge?: string | null
          encarregado?: string | null
          encarregado_cpf?: string | null
          encarregado_mat?: string | null
          engenheiro?: string | null
          engenheiro_cpf?: string | null
          engenheiro_mat?: string | null
          equipe?: string | null
          equipe_desc?: string | null
          etapa?: string | null
          exec_domingo?: number | null
          exec_quarta?: number | null
          exec_quinta?: number | null
          exec_sabado?: number | null
          exec_segunda?: number | null
          exec_sexta?: number | null
          exec_terca?: number | null
          gerente?: string | null
          gerente_cpf?: string | null
          gerente_mat?: string | null
          guid_model?: string | null
          id?: string
          id_componente_etapas?: string | null
          id_primavera?: string | null
          indice_atual?: number | null
          indice_rop?: number | null
          item_wbs?: string | null
          iwp_objuid?: string | null
          kpi?: string | null
          modulo?: string | null
          nota?: string | null
          pacote?: string | null
          peso_absoluto?: number | null
          peso_custcode?: number | null
          peso_stagecode?: number | null
          plan_domingo?: number | null
          plan_quarta?: number | null
          plan_quinta?: number | null
          plan_sabado?: number | null
          plan_segunda?: number | null
          plan_sexta?: number | null
          plan_terca?: number | null
          planta?: string | null
          programacao?: number | null
          programado_componente?: number | null
          programado_pacote?: number | null
          proposito?: string | null
          recebimento?: string | null
          semana?: string | null
          supervisor?: string | null
          supervisor_cpf?: string | null
          supervisor_mat?: string | null
          tag_id_proj?: string | null
          tamanho_equipe?: number | null
          tipo?: string | null
          total_exec_geral?: number | null
          total_exec_semana?: number | null
          ultima_oper?: string | null
          unit?: string | null
          unit_unid_medida?: string | null
          unit_valor?: number | null
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scon_programacao_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scon_programacao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      sigem_documents: {
        Row: {
          batch_id: string
          contrato_id: string | null
          created_at: string | null
          documento: string
          documento_revisao: string | null
          id: string
          incluido_em: string | null
          ppu: string | null
          revisao: string | null
          status: string | null
          status_correto: string | null
          status_gitec: string | null
          titulo: string | null
          up: string | null
        }
        Insert: {
          batch_id: string
          contrato_id?: string | null
          created_at?: string | null
          documento: string
          documento_revisao?: string | null
          id?: string
          incluido_em?: string | null
          ppu?: string | null
          revisao?: string | null
          status?: string | null
          status_correto?: string | null
          status_gitec?: string | null
          titulo?: string | null
          up?: string | null
        }
        Update: {
          batch_id?: string
          contrato_id?: string | null
          created_at?: string | null
          documento?: string
          documento_revisao?: string | null
          id?: string
          incluido_em?: string | null
          ppu?: string | null
          revisao?: string | null
          status?: string | null
          status_correto?: string | null
          status_gitec?: string | null
          titulo?: string | null
          up?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sigem_documents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sigem_documents_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      splan_cronograma_financeiro: {
        Row: {
          boletim: string
          codigo_eap: string | null
          id: string
          item_ppu: string | null
          mes_referencia: string | null
          synced_at: string | null
          valor_baseline: number | null
          valor_desafio: number | null
          valor_projetado: number | null
        }
        Insert: {
          boletim: string
          codigo_eap?: string | null
          id?: string
          item_ppu?: string | null
          mes_referencia?: string | null
          synced_at?: string | null
          valor_baseline?: number | null
          valor_desafio?: number | null
          valor_projetado?: number | null
        }
        Update: {
          boletim?: string
          codigo_eap?: string | null
          id?: string
          item_ppu?: string | null
          mes_referencia?: string | null
          synced_at?: string | null
          valor_baseline?: number | null
          valor_desafio?: number | null
          valor_projetado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "splan_cronograma_financeiro_codigo_eap_fkey"
            columns: ["codigo_eap"]
            isOneToOne: false
            referencedRelation: "splan_eap"
            referencedColumns: ["codigo_eap"]
          },
        ]
      }
      splan_curva_s: {
        Row: {
          boletim: string
          col_index: number | null
          id: string
          previsto_acum: number | null
          previsto_mensal: number | null
          projetado_acum: number | null
          projetado_mensal: number | null
          realizado_acum: number | null
          realizado_mensal: number | null
          synced_at: string | null
        }
        Insert: {
          boletim: string
          col_index?: number | null
          id?: string
          previsto_acum?: number | null
          previsto_mensal?: number | null
          projetado_acum?: number | null
          projetado_mensal?: number | null
          realizado_acum?: number | null
          realizado_mensal?: number | null
          synced_at?: string | null
        }
        Update: {
          boletim?: string
          col_index?: number | null
          id?: string
          previsto_acum?: number | null
          previsto_mensal?: number | null
          projetado_acum?: number | null
          projetado_mensal?: number | null
          realizado_acum?: number | null
          realizado_mensal?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      splan_eap: {
        Row: {
          codigo_eap: string
          descricao: string | null
          disciplina: string | null
          nivel: number | null
          pai_codigo_eap: string | null
          synced_at: string | null
        }
        Insert: {
          codigo_eap: string
          descricao?: string | null
          disciplina?: string | null
          nivel?: number | null
          pai_codigo_eap?: string | null
          synced_at?: string | null
        }
        Update: {
          codigo_eap?: string
          descricao?: string | null
          disciplina?: string | null
          nivel?: number | null
          pai_codigo_eap?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splan_eap_pai_codigo_eap_fkey"
            columns: ["pai_codigo_eap"]
            isOneToOne: false
            referencedRelation: "splan_eap"
            referencedColumns: ["codigo_eap"]
          },
        ]
      }
      splan_evidencias: {
        Row: {
          boletim: string | null
          data_inclusao: string | null
          id: string
          nivel_2: string | null
          nivel_3: string | null
          numero_evidencia: string
          revisao: string | null
          source_id: string | null
          status: string | null
          synced_at: string | null
          tipo_documento: string | null
          titulo: string | null
        }
        Insert: {
          boletim?: string | null
          data_inclusao?: string | null
          id?: string
          nivel_2?: string | null
          nivel_3?: string | null
          numero_evidencia: string
          revisao?: string | null
          source_id?: string | null
          status?: string | null
          synced_at?: string | null
          tipo_documento?: string | null
          titulo?: string | null
        }
        Update: {
          boletim?: string | null
          data_inclusao?: string | null
          id?: string
          nivel_2?: string | null
          nivel_3?: string | null
          numero_evidencia?: string
          revisao?: string | null
          source_id?: string | null
          status?: string | null
          synced_at?: string | null
          tipo_documento?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      splan_gitec_eventos: {
        Row: {
          agrupamento: string | null
          boletim: string | null
          codigo_eap: string | null
          comentario: string | null
          data_aprovacao: string | null
          data_execucao: string | null
          data_inf_execucao: string | null
          etapa: string | null
          executado_por: string | null
          fiscal_responsavel: string | null
          id: string
          item_ppu: string | null
          numero_evidencias: string | null
          source_id: string | null
          status: string
          synced_at: string | null
          tag: string | null
          valor: number | null
        }
        Insert: {
          agrupamento?: string | null
          boletim?: string | null
          codigo_eap?: string | null
          comentario?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          etapa?: string | null
          executado_por?: string | null
          fiscal_responsavel?: string | null
          id?: string
          item_ppu?: string | null
          numero_evidencias?: string | null
          source_id?: string | null
          status: string
          synced_at?: string | null
          tag?: string | null
          valor?: number | null
        }
        Update: {
          agrupamento?: string | null
          boletim?: string | null
          codigo_eap?: string | null
          comentario?: string | null
          data_aprovacao?: string | null
          data_execucao?: string | null
          data_inf_execucao?: string | null
          etapa?: string | null
          executado_por?: string | null
          fiscal_responsavel?: string | null
          id?: string
          item_ppu?: string | null
          numero_evidencias?: string | null
          source_id?: string | null
          status?: string
          synced_at?: string | null
          tag?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "splan_gitec_eventos_codigo_eap_fkey"
            columns: ["codigo_eap"]
            isOneToOne: false
            referencedRelation: "splan_eap"
            referencedColumns: ["codigo_eap"]
          },
        ]
      }
      splan_medicao_mensal: {
        Row: {
          boletim: string
          id: string
          item_ppu: string | null
          synced_at: string | null
          valor_executado: number | null
          valor_gitec: number | null
          valor_previsto: number | null
          valor_sigem: number | null
        }
        Insert: {
          boletim: string
          id?: string
          item_ppu?: string | null
          synced_at?: string | null
          valor_executado?: number | null
          valor_gitec?: number | null
          valor_previsto?: number | null
          valor_sigem?: number | null
        }
        Update: {
          boletim?: string
          id?: string
          item_ppu?: string | null
          synced_at?: string | null
          valor_executado?: number | null
          valor_gitec?: number | null
          valor_previsto?: number | null
          valor_sigem?: number | null
        }
        Relationships: []
      }
      splan_ppu_items: {
        Row: {
          agrupamento: string | null
          codigo_eap: string | null
          descricao: string | null
          disciplina: string | null
          fase: string | null
          id: string
          item_ppu: string
          subfase: string | null
          synced_at: string | null
          unidade: string | null
          valor_contratual: number | null
        }
        Insert: {
          agrupamento?: string | null
          codigo_eap?: string | null
          descricao?: string | null
          disciplina?: string | null
          fase?: string | null
          id?: string
          item_ppu: string
          subfase?: string | null
          synced_at?: string | null
          unidade?: string | null
          valor_contratual?: number | null
        }
        Update: {
          agrupamento?: string | null
          codigo_eap?: string | null
          descricao?: string | null
          disciplina?: string | null
          fase?: string | null
          id?: string
          item_ppu?: string
          subfase?: string | null
          synced_at?: string | null
          unidade?: string | null
          valor_contratual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "splan_ppu_items_codigo_eap_fkey"
            columns: ["codigo_eap"]
            isOneToOne: false
            referencedRelation: "splan_eap"
            referencedColumns: ["codigo_eap"]
          },
        ]
      }
      sync_log: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          id: string
          operacao: string
          registros: number | null
          tabela: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          operacao: string
          registros?: number | null
          tabela: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          operacao?: string
          registros?: number | null
          tabela?: string
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
      vw_bm_resumo: {
        Row: {
          boletim: string | null
          evidencias_aprovadas: number | null
          evidencias_pendentes: number | null
          evidencias_total: number | null
          gitec_aprovados: number | null
          gitec_eventos_total: number | null
          gitec_pend_aprovacao: number | null
          gitec_pend_verificacao: number | null
          gitec_recusados: number | null
          gitec_valor_aprovado: number | null
          gitec_valor_pend_aprov: number | null
          gitec_valor_pend_verif: number | null
          mes_referencia: string | null
          total_baseline: number | null
          total_desafio: number | null
          total_executado: number | null
          total_gitec: number | null
          total_previsto: number | null
          total_projetado: number | null
          total_sigem: number | null
        }
        Relationships: []
      }
      vw_cronograma_bm_por_ippu: {
        Row: {
          bm_name: string | null
          bm_number: number | null
          ippu: string | null
          previsto: number | null
          projetado: number | null
          realizado: number | null
        }
        Relationships: []
      }
      vw_cronograma_tree_completo: {
        Row: {
          acumulado: number | null
          batch_id: string | null
          created_at: string | null
          fase_nome: string | null
          id: string | null
          ippu: string | null
          nivel: string | null
          nome: string | null
          saldo: number | null
          sort_order: number | null
          subfase_nome: string | null
          total_previsto_bm: number | null
          total_projetado_bm: number | null
          total_realizado_bm: number | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_tree_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_disciplinas: {
        Row: {
          concluidos: number | null
          disciplina: string | null
          total_componentes: number | null
          total_linhas: number | null
          total_ppu: number | null
        }
        Relationships: []
      }
      vw_equipes: {
        Row: {
          comps_por_semana: number | null
          disciplinas: string[] | null
          encarregados: string[] | null
          equipe: string | null
          supervisores: string[] | null
          total_componentes: number | null
          total_linhas: number | null
          total_semanas: number | null
        }
        Relationships: []
      }
      vw_fiscais: {
        Row: {
          aprovados: number | null
          fiscal_responsavel: string | null
          pendentes: number | null
          total: number | null
          valor_aprovado: number | null
          valor_pendente: number | null
        }
        Relationships: []
      }
      vw_gitec_por_ppu: {
        Row: {
          eventos_concluidos: number | null
          eventos_pendentes: number | null
          item_ppu: string | null
          status_aprovado: number | null
          status_pendente: number | null
          total_eventos: number | null
          valor_aprovado: number | null
          valor_pendente: number | null
          valor_ponderado_concluido: number | null
          valor_ponderado_total: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_itens_nao_medidos: {
        Row: {
          avanco_ponderado: number | null
          bm_name_calc: string | null
          componente: string | null
          criterio_nome: string | null
          dicionario_etapa: string | null
          disciplina: string | null
          item_criterio: string | null
          item_wbs: string | null
          tag: string | null
          tag_desc: string | null
          total_exec_geral: number | null
          unit_valor: number | null
        }
        Relationships: []
      }
      vw_previsao_por_bm: {
        Row: {
          bm_name: string | null
          cancelados: number | null
          confirmados: number | null
          medidos: number | null
          postergados: number | null
          previstos: number | null
          total_itens: number | null
          valor_ativo: number | null
          valor_postergado: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_previsao_por_disciplina: {
        Row: {
          ativos: number | null
          bm_name: string | null
          disciplina: string | null
          postergados: number | null
          responsavel_nome: string | null
          total_itens: number | null
          valor_ativo: number | null
          valor_postergado: number | null
        }
        Relationships: []
      }
      vw_scon_com_criterio: {
        Row: {
          atividade: string | null
          avanco_resumido: number | null
          batch_id: string | null
          classe: string | null
          codigo_frente: string | null
          codigo_grupo: string | null
          codigo_tarefa: string | null
          componente: string | null
          componente_objuid: string | null
          conta_custo: string | null
          conta_custo_programacao: string | null
          contrato_id: string | null
          created_at: string | null
          cwp: string | null
          cwts_objuid: string | null
          data_fim: string | null
          data_inicio: string | null
          datahora: string | null
          descricao: string | null
          disciplina: string | null
          distribuicao: string | null
          documento: string | null
          dt_merge: string | null
          encarregado: string | null
          encarregado_cpf: string | null
          encarregado_mat: string | null
          engenheiro: string | null
          engenheiro_cpf: string | null
          engenheiro_mat: string | null
          equipe: string | null
          equipe_desc: string | null
          etapa: string | null
          exec_domingo: number | null
          exec_quarta: number | null
          exec_quinta: number | null
          exec_sabado: number | null
          exec_segunda: number | null
          exec_sexta: number | null
          exec_terca: number | null
          gerente: string | null
          gerente_cpf: string | null
          gerente_mat: string | null
          guid_model: string | null
          id: string | null
          id_componente_etapas: string | null
          id_primavera: string | null
          indice_atual: number | null
          indice_rop: number | null
          item_criterio: string | null
          item_wbs: string | null
          iwp_objuid: string | null
          kpi: string | null
          modulo: string | null
          nota: string | null
          pacote: string | null
          peso_absoluto: number | null
          peso_custcode: number | null
          peso_stagecode: number | null
          plan_domingo: number | null
          plan_quarta: number | null
          plan_quinta: number | null
          plan_sabado: number | null
          plan_segunda: number | null
          plan_sexta: number | null
          plan_terca: number | null
          planta: string | null
          programacao: number | null
          programado_componente: number | null
          programado_pacote: number | null
          proposito: string | null
          recebimento: string | null
          relatorio_esperado: string | null
          semana: string | null
          status_gitec: string | null
          status_sigem: string | null
          supervisor: string | null
          supervisor_cpf: string | null
          supervisor_mat: string | null
          tag_id_proj: string | null
          tamanho_equipe: number | null
          tipo: string | null
          total_exec_geral: number | null
          total_exec_semana: number | null
          ultima_oper: string | null
          unit: string | null
          unit_unid_medida: string | null
          unit_valor: number | null
          units: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scon_programacao_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scon_programacao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_scon_componentes: {
        Row: {
          avanco: number | null
          classe: string | null
          componente: string | null
          cwp: string | null
          disciplina: string | null
          encarregado: string | null
          equipe: string | null
          equipe_desc: string | null
          item_wbs: string | null
          programado: number | null
          tag_id_proj: string | null
          tipo: string | null
          total_etapas: number | null
          total_exec: number | null
          total_semanas: number | null
        }
        Relationships: []
      }
      vw_scon_execucao_por_bm: {
        Row: {
          avanco_ponderado: number | null
          bm_name_calc: string | null
          classe: string | null
          componente: string | null
          criterio_nome: string | null
          data_fim: string | null
          data_inicio: string | null
          dicionario_etapa: string | null
          disciplina: string | null
          equipe: string | null
          equipe_desc: string | null
          exec_domingo: number | null
          exec_quarta: number | null
          exec_quinta: number | null
          exec_sabado: number | null
          exec_segunda: number | null
          exec_sexta: number | null
          exec_terca: number | null
          indice_rop: number | null
          item_criterio: string | null
          item_wbs: string | null
          peso_absoluto: number | null
          peso_fisico_fin: number | null
          plan_domingo: number | null
          plan_quarta: number | null
          plan_quinta: number | null
          plan_sabado: number | null
          plan_segunda: number | null
          plan_sexta: number | null
          plan_terca: number | null
          scon_etapa: string | null
          scon_prog_id: string | null
          semana: string | null
          status_gitec: string | null
          tag: string | null
          tag_desc: string | null
          tipo: string | null
          total_exec_geral: number | null
          total_exec_semana: number | null
          unit_valor: number | null
          valor_exec_semana: number | null
        }
        Relationships: []
      }
      vw_scon_por_ppu: {
        Row: {
          avg_avanco: number | null
          concluidos: number | null
          em_andamento: number | null
          item_wbs: string | null
          nao_iniciados: number | null
          qtde_executada: number | null
          qtde_programada: number | null
          total_componentes: number | null
        }
        Relationships: []
      }
      vw_sigem_por_ppu: {
        Row: {
          docs_comentarios: number | null
          docs_ok: number | null
          docs_recusados: number | null
          docs_workflow: number | null
          ppu: string | null
          total_docs: number | null
        }
        Relationships: []
      }
      vw_ultimo_bm_realizado: {
        Row: {
          ultimo_bm: number | null
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
      user_contrato_ids: { Args: never; Returns: string[] }
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
