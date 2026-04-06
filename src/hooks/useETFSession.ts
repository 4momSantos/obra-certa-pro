import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ETFColaborador {
  id?: string;
  session_id?: string;
  chapa: string;
  nome: string;
  funcao: string | null;
  limite_m7: string | null;
  horas_total: number;
  horas_extras: number;
  faltas: number;
  status: 'ATIVO' | 'AUSENTE' | 'SUBSTITUIDO';
  horas_diarias: Array<{ data: string; horas: number; tipo: string }>;
}

export interface ETFSessionKpis {
  headcount_etf: number;
  headcount_total: number;
  horas_trabalhadas: number;
  horas_disponiveis: number;
  horas_extras: number;
  eficiencia_pct: number;
  absenteismo_pct: number;
  feriados_trabalhados: number;
}

export interface ETFSession extends ETFSessionKpis {
  id: string;
  competencia: string;
  bm_id: string | null;
  bm_numero: number;
  arquivo_nome: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at?: string;
  colaboradores?: ETFColaborador[];
}

export interface ETFSessionInput {
  competencia: string;
  bm_id: string;
  bm_numero: number;
  arquivo_nome?: string | null;
  kpis: ETFSessionKpis;
  colaboradores: ETFColaborador[];
}

export function useETFSession() {
  const [sessions, setSessions] = useState<ETFSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('etf_sessions')
        .select('*')
        .order('competencia', { ascending: false })
        .order('bm_numero', { ascending: false });
      if (err) throw err;
      setSessions((data ?? []) as ETFSession[]);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar sessões');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessionDetail = useCallback(async (id: string): Promise<ETFSession | null> => {
    setError(null);
    try {
      const { data: sess, error: errSess } = await (supabase as any)
        .from('etf_sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (errSess) throw errSess;

      const { data: cols, error: errCols } = await (supabase as any)
        .from('etf_colaboradores')
        .select('*')
        .eq('session_id', id)
        .order('nome', { ascending: true });
      if (errCols) throw errCols;

      return { ...(sess as ETFSession), colaboradores: (cols ?? []) as ETFColaborador[] };
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar detalhe');
      return null;
    }
  }, []);

  const saveSession = useCallback(async (payload: ETFSessionInput): Promise<{ ok: boolean; sessionId?: string; error?: string }> => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('save-etf-session', {
        body: payload,
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      await loadSessions();
      return { ok: true, sessionId: data?.session_id };
    } catch (e: any) {
      const msg = e.message ?? 'Erro ao salvar sessão';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [loadSessions]);

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await (supabase as any)
        .from('etf_sessions')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setSessions(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Erro ao excluir sessão');
      return false;
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return { sessions, loading, saving, error, loadSessions, loadSessionDetail, saveSession, deleteSession };
}
