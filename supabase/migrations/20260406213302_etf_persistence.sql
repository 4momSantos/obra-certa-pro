-- ETF Persistence: sessões e colaboradores processados pelo Wizard ETF
-- 1 sessão = 1 competência (mês) + 1 BM
-- N colaboradores por sessão

CREATE TABLE IF NOT EXISTS public.etf_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL, -- primeiro dia do mês (YYYY-MM-01)
  bm_id uuid REFERENCES public.bm_periodos(id) ON DELETE SET NULL,
  bm_numero integer NOT NULL,
  -- KPIs agregados
  headcount_etf integer NOT NULL DEFAULT 0,
  headcount_total integer NOT NULL DEFAULT 0,
  horas_trabalhadas numeric(12,2) NOT NULL DEFAULT 0,
  horas_disponiveis numeric(12,2) NOT NULL DEFAULT 0,
  horas_extras numeric(12,2) NOT NULL DEFAULT 0,
  eficiencia_pct numeric(6,2) NOT NULL DEFAULT 0,
  absenteismo_pct numeric(6,2) NOT NULL DEFAULT 0,
  feriados_trabalhados integer NOT NULL DEFAULT 0,
  -- Metadata
  arquivo_nome text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT etf_sessions_competencia_bm_unique UNIQUE (competencia, bm_id)
);

CREATE INDEX IF NOT EXISTS idx_etf_sessions_competencia ON public.etf_sessions (competencia DESC);
CREATE INDEX IF NOT EXISTS idx_etf_sessions_bm_id ON public.etf_sessions (bm_id);
CREATE INDEX IF NOT EXISTS idx_etf_sessions_uploaded_by ON public.etf_sessions (uploaded_by);

CREATE TABLE IF NOT EXISTS public.etf_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.etf_sessions(id) ON DELETE CASCADE,
  chapa text NOT NULL,
  nome text NOT NULL,
  funcao text,
  limite_m7 text,
  horas_total numeric(10,2) NOT NULL DEFAULT 0,
  horas_extras numeric(10,2) NOT NULL DEFAULT 0,
  faltas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ATIVO', -- ATIVO | AUSENTE | SUBSTITUIDO
  horas_diarias jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ data, horas, tipo }]
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etf_colaboradores_session_id ON public.etf_colaboradores (session_id);
CREATE INDEX IF NOT EXISTS idx_etf_colaboradores_chapa ON public.etf_colaboradores (chapa);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_etf_sessions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_etf_sessions_updated_at ON public.etf_sessions;
CREATE TRIGGER trg_etf_sessions_updated_at
  BEFORE UPDATE ON public.etf_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_etf_sessions_updated_at();

-- RLS
ALTER TABLE public.etf_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_colaboradores ENABLE ROW LEVEL SECURITY;

-- Sessions: leitura para autenticados, escrita pelo dono
DROP POLICY IF EXISTS "etf_sessions_select_auth" ON public.etf_sessions;
CREATE POLICY "etf_sessions_select_auth" ON public.etf_sessions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "etf_sessions_insert_owner" ON public.etf_sessions;
CREATE POLICY "etf_sessions_insert_owner" ON public.etf_sessions
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "etf_sessions_update_owner" ON public.etf_sessions;
CREATE POLICY "etf_sessions_update_owner" ON public.etf_sessions
  FOR UPDATE TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "etf_sessions_delete_owner" ON public.etf_sessions;
CREATE POLICY "etf_sessions_delete_owner" ON public.etf_sessions
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- Colaboradores: leitura para autenticados, escrita herda do dono da sessão
DROP POLICY IF EXISTS "etf_colaboradores_select_auth" ON public.etf_colaboradores;
CREATE POLICY "etf_colaboradores_select_auth" ON public.etf_colaboradores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "etf_colaboradores_insert_owner" ON public.etf_colaboradores;
CREATE POLICY "etf_colaboradores_insert_owner" ON public.etf_colaboradores
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.etf_sessions s WHERE s.id = session_id AND s.uploaded_by = auth.uid())
  );

DROP POLICY IF EXISTS "etf_colaboradores_delete_owner" ON public.etf_colaboradores;
CREATE POLICY "etf_colaboradores_delete_owner" ON public.etf_colaboradores
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.etf_sessions s WHERE s.id = session_id AND s.uploaded_by = auth.uid())
  );
