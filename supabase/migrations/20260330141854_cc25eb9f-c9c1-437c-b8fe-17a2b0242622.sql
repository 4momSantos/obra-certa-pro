
-- ============================================================
-- SPLAN Tables: Full data model for BM management
-- ============================================================

-- 1. splan_eap — EAP hierarchy
CREATE TABLE public.splan_eap (
  codigo_eap TEXT PRIMARY KEY,
  descricao TEXT,
  nivel INTEGER DEFAULT 1,
  pai_codigo_eap TEXT REFERENCES public.splan_eap(codigo_eap) ON DELETE SET NULL,
  disciplina TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 2. splan_ppu_items — PPU master data
CREATE TABLE public.splan_ppu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_ppu TEXT NOT NULL UNIQUE,
  codigo_eap TEXT REFERENCES public.splan_eap(codigo_eap) ON DELETE SET NULL,
  descricao TEXT,
  disciplina TEXT,
  fase TEXT,
  subfase TEXT,
  agrupamento TEXT,
  unidade TEXT,
  valor_contratual NUMERIC(15,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 3. splan_cronograma_financeiro — Financial schedule per BM
CREATE TABLE public.splan_cronograma_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_eap TEXT REFERENCES public.splan_eap(codigo_eap) ON DELETE SET NULL,
  item_ppu TEXT,
  boletim TEXT NOT NULL,
  mes_referencia DATE,
  valor_baseline NUMERIC(15,2) DEFAULT 0,
  valor_projetado NUMERIC(15,2) DEFAULT 0,
  valor_desafio NUMERIC(15,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 4. splan_medicao_mensal — Monthly measurement per PPU per BM
CREATE TABLE public.splan_medicao_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_ppu TEXT,
  boletim TEXT NOT NULL,
  valor_previsto NUMERIC(15,2) DEFAULT 0,
  valor_executado NUMERIC(15,2) DEFAULT 0,
  valor_sigem NUMERIC(15,2) DEFAULT 0,
  valor_gitec NUMERIC(15,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 5. splan_curva_s — S-Curve data
CREATE TABLE public.splan_curva_s (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boletim TEXT NOT NULL,
  col_index INTEGER DEFAULT 0,
  previsto_acum NUMERIC(15,2) DEFAULT 0,
  realizado_acum NUMERIC(15,2) DEFAULT 0,
  projetado_acum NUMERIC(15,2) DEFAULT 0,
  previsto_mensal NUMERIC(15,2) DEFAULT 0,
  realizado_mensal NUMERIC(15,2) DEFAULT 0,
  projetado_mensal NUMERIC(15,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 6. splan_gitec_eventos — Individual GITEC measurement events
CREATE TABLE public.splan_gitec_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_eap TEXT REFERENCES public.splan_eap(codigo_eap) ON DELETE SET NULL,
  item_ppu TEXT,
  agrupamento TEXT,
  tag TEXT,
  etapa TEXT,
  status TEXT NOT NULL,
  valor NUMERIC(15,2) DEFAULT 0,
  data_execucao DATE,
  data_inf_execucao DATE,
  data_aprovacao DATE,
  executado_por TEXT,
  fiscal_responsavel TEXT,
  numero_evidencias TEXT,
  comentario TEXT,
  boletim TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  source_id TEXT
);

-- 7. splan_evidencias — Evidence documents linked to GITEC events
CREATE TABLE public.splan_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_evidencia TEXT NOT NULL,
  titulo TEXT,
  tipo_documento TEXT,
  status TEXT,
  revisao TEXT,
  data_inclusao DATE,
  nivel_2 TEXT,
  nivel_3 TEXT,
  boletim TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  source_id TEXT
);

-- 8. sync_log — Sync operation log
CREATE TABLE public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registros INTEGER DEFAULT 0,
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. anotacoes — User annotations
CREATE TABLE public.anotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  referencia TEXT,
  tipo TEXT,
  texto TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_splan_gitec_boletim ON public.splan_gitec_eventos(boletim);
CREATE INDEX idx_splan_gitec_status ON public.splan_gitec_eventos(status);
CREATE INDEX idx_splan_gitec_eap ON public.splan_gitec_eventos(codigo_eap);
CREATE INDEX idx_splan_gitec_ppu ON public.splan_gitec_eventos(item_ppu);
CREATE INDEX idx_splan_gitec_fiscal ON public.splan_gitec_eventos(fiscal_responsavel);
CREATE UNIQUE INDEX idx_splan_gitec_source ON public.splan_gitec_eventos(source_id) WHERE source_id IS NOT NULL;

CREATE INDEX idx_splan_evid_numero ON public.splan_evidencias(numero_evidencia);
CREATE INDEX idx_splan_evid_boletim ON public.splan_evidencias(boletim);
CREATE INDEX idx_splan_evid_status ON public.splan_evidencias(status);
CREATE UNIQUE INDEX idx_splan_evid_source ON public.splan_evidencias(source_id) WHERE source_id IS NOT NULL;

CREATE INDEX idx_splan_crono_fin_boletim ON public.splan_cronograma_financeiro(boletim);
CREATE INDEX idx_splan_medicao_boletim ON public.splan_medicao_mensal(boletim);
CREATE INDEX idx_splan_medicao_ppu ON public.splan_medicao_mensal(item_ppu);

-- ============================================================
-- RLS — Enable + Policies
-- ============================================================

ALTER TABLE public.splan_eap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_ppu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_cronograma_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_medicao_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_curva_s ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_gitec_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splan_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated on all tables
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'splan_eap','splan_ppu_items','splan_cronograma_financeiro',
    'splan_medicao_mensal','splan_curva_s','splan_gitec_eventos',
    'splan_evidencias','sync_log','anotacoes'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)', t
    );
  END LOOP;
END $$;

-- INSERT/UPDATE/DELETE for anotacoes (user owns)
CREATE POLICY "Users manage own notes" ON public.anotacoes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT for sync_log (any authenticated can log)
CREATE POLICY "Authenticated insert sync_log" ON public.sync_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- View: vw_bm_resumo — Consolidated BM summary
-- ============================================================

CREATE OR REPLACE VIEW public.vw_bm_resumo WITH (security_invoker = on) AS
SELECT
  cf.boletim,
  MIN(cf.mes_referencia) as mes_referencia,
  SUM(cf.valor_baseline) as total_baseline,
  SUM(cf.valor_projetado) as total_projetado,
  SUM(cf.valor_desafio) as total_desafio,
  COALESCE(med.total_previsto, 0) as total_previsto,
  COALESCE(med.total_executado, 0) as total_executado,
  COALESCE(med.total_sigem, 0) as total_sigem,
  COALESCE(med.total_gitec, 0) as total_gitec,
  COALESCE(git.qtd_total, 0) as gitec_eventos_total,
  COALESCE(git.qtd_aprovado, 0) as gitec_aprovados,
  COALESCE(git.qtd_pend_verif, 0) as gitec_pend_verificacao,
  COALESCE(git.qtd_pend_aprov, 0) as gitec_pend_aprovacao,
  COALESCE(git.qtd_recusado, 0) as gitec_recusados,
  COALESCE(git.valor_aprovado, 0) as gitec_valor_aprovado,
  COALESCE(git.valor_pend_verif, 0) as gitec_valor_pend_verif,
  COALESCE(git.valor_pend_aprov, 0) as gitec_valor_pend_aprov,
  COALESCE(ev.total_evidencias, 0) as evidencias_total,
  COALESCE(ev.evidencias_pendentes, 0) as evidencias_pendentes,
  COALESCE(ev.evidencias_aprovadas, 0) as evidencias_aprovadas
FROM public.splan_cronograma_financeiro cf
LEFT JOIN (
  SELECT boletim,
    SUM(valor_previsto) as total_previsto,
    SUM(valor_executado) as total_executado,
    SUM(valor_sigem) as total_sigem,
    SUM(valor_gitec) as total_gitec
  FROM public.splan_medicao_mensal GROUP BY boletim
) med ON med.boletim = cf.boletim
LEFT JOIN (
  SELECT boletim,
    COUNT(*) as qtd_total,
    COUNT(*) FILTER (WHERE status = 'Aprovado') as qtd_aprovado,
    COUNT(*) FILTER (WHERE status = 'Pendente de Verificação') as qtd_pend_verif,
    COUNT(*) FILTER (WHERE status = 'Pendente de Aprovação') as qtd_pend_aprov,
    COUNT(*) FILTER (WHERE status = 'Recusado') as qtd_recusado,
    SUM(valor) FILTER (WHERE status = 'Aprovado') as valor_aprovado,
    SUM(valor) FILTER (WHERE status = 'Pendente de Verificação') as valor_pend_verif,
    SUM(valor) FILTER (WHERE status = 'Pendente de Aprovação') as valor_pend_aprov
  FROM public.splan_gitec_eventos GROUP BY boletim
) git ON git.boletim = cf.boletim
LEFT JOIN (
  SELECT boletim,
    COUNT(*) as total_evidencias,
    COUNT(*) FILTER (WHERE status = 'Pendente') as evidencias_pendentes,
    COUNT(*) FILTER (WHERE status = 'Aprovado') as evidencias_aprovadas
  FROM public.splan_evidencias GROUP BY boletim
) ev ON ev.boletim = cf.boletim
GROUP BY cf.boletim, med.total_previsto, med.total_executado,
  med.total_sigem, med.total_gitec, git.qtd_total, git.qtd_aprovado,
  git.qtd_pend_verif, git.qtd_pend_aprov, git.qtd_recusado,
  git.valor_aprovado, git.valor_pend_verif, git.valor_pend_aprov,
  ev.total_evidencias, ev.evidencias_pendentes, ev.evidencias_aprovadas
ORDER BY cf.boletim;
