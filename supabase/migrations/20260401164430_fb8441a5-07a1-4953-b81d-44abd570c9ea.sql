
-- Drop existing anotacoes table (will be recreated with new schema)
DROP TABLE IF EXISTS anotacoes CASCADE;

-- ============ 1. CICLO DE BM ============
CREATE TABLE bm_periodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bm_name TEXT NOT NULL UNIQUE,
  bm_number INTEGER NOT NULL UNIQUE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT DEFAULT 'futuro',
  data_abertura TIMESTAMPTZ,
  data_fechamento TIMESTAMPTZ,
  fechado_por UUID REFERENCES auth.users(id),
  valor_previsto NUMERIC(18,2) DEFAULT 0,
  valor_medido NUMERIC(18,2) DEFAULT 0,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN bm_periodos.status IS 'futuro | aberto | em_analise | fechado';

INSERT INTO bm_periodos (bm_name, bm_number, periodo_inicio, periodo_fim, status)
SELECT
  'BM-' || LPAD(n::TEXT, 2, '0'),
  n,
  (DATE '2025-06-26' + ((n-1) * INTERVAL '1 month'))::DATE,
  (DATE '2025-07-25' + ((n-1) * INTERVAL '1 month'))::DATE,
  CASE WHEN n <= 8 THEN 'fechado' WHEN n = 9 THEN 'aberto' ELSE 'futuro' END
FROM generate_series(1, 22) AS n;

-- ============ 2. PREVISÃO DE MEDIÇÃO ============
CREATE TABLE previsao_medicao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bm_name TEXT NOT NULL,
  ippu TEXT NOT NULL,
  responsavel_id UUID REFERENCES auth.users(id) NOT NULL,
  responsavel_nome TEXT DEFAULT '',
  disciplina TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'previsto',
  qtd_prevista NUMERIC(18,6) DEFAULT 0,
  valor_previsto NUMERIC(18,2) DEFAULT 0,
  qtd_realizada NUMERIC(18,6) DEFAULT 0,
  valor_realizado NUMERIC(18,2) DEFAULT 0,
  justificativa TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bm_name, ippu)
);
COMMENT ON COLUMN previsao_medicao.status IS 'previsto | confirmado | postergado | cancelado | medido';
COMMENT ON COLUMN previsao_medicao.justificativa IS 'Campo aberto — obrigatório para postergamento e cancelamento';
CREATE INDEX idx_prev_bm ON previsao_medicao(bm_name);
CREATE INDEX idx_prev_ippu ON previsao_medicao(ippu);
CREATE INDEX idx_prev_status ON previsao_medicao(status);
CREATE INDEX idx_prev_resp ON previsao_medicao(responsavel_id);
CREATE INDEX idx_prev_disc ON previsao_medicao(disciplina);

CREATE TABLE previsao_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  previsao_id UUID REFERENCES previsao_medicao(id) ON DELETE CASCADE,
  bm_name TEXT NOT NULL,
  ippu TEXT NOT NULL,
  status_anterior TEXT DEFAULT '',
  status_novo TEXT NOT NULL,
  justificativa TEXT DEFAULT '',
  alterado_por UUID REFERENCES auth.users(id),
  alterado_por_nome TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_phist_prev ON previsao_historico(previsao_id);
CREATE INDEX idx_phist_bm ON previsao_historico(bm_name);

-- ============ 3. BOLETIM DE MEDIÇÃO ============
CREATE TABLE boletins_medicao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bm_name TEXT NOT NULL,
  numero TEXT NOT NULL,
  status TEXT DEFAULT 'rascunho',
  valor_total NUMERIC(18,2) DEFAULT 0,
  qtd_itens INTEGER DEFAULT 0,
  gerado_por UUID REFERENCES auth.users(id),
  gerado_em TIMESTAMPTZ DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN boletins_medicao.status IS 'rascunho | finalizado | enviado | aprovado';

CREATE TABLE boletim_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boletim_id UUID REFERENCES boletins_medicao(id) ON DELETE CASCADE,
  ippu TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  valor_previsto NUMERIC(18,2) DEFAULT 0,
  valor_executado_scon NUMERIC(18,2) DEFAULT 0,
  valor_postado_sigem NUMERIC(18,2) DEFAULT 0,
  valor_medido_gitec NUMERIC(18,2) DEFAULT 0,
  valor_aprovado NUMERIC(18,2) DEFAULT 0,
  observacao TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bol_bm ON boletins_medicao(bm_name);
CREATE INDEX idx_bolitens_bol ON boletim_itens(boletim_id);

-- ============ 4. ANOTAÇÕES (novo schema) ============
CREATE TABLE anotacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contexto TEXT NOT NULL,
  referencia TEXT NOT NULL,
  texto TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral',
  autor_id UUID REFERENCES auth.users(id) NOT NULL,
  autor_nome TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN anotacoes.contexto IS 'previsao | ippu | bm | documento | gitec_evento | componente';
COMMENT ON COLUMN anotacoes.categoria IS 'geral | bloqueio | acao | risco | decisao | justificativa';
CREATE INDEX idx_anot_ctx_ref ON anotacoes(contexto, referencia);
CREATE INDEX idx_anot_autor ON anotacoes(autor_id);

-- ============ 5. ACOMPANHAMENTO DE DOCUMENTOS ============
CREATE TABLE doc_acompanhamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  documento TEXT NOT NULL,
  status_atual TEXT DEFAULT '',
  acao TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  prazo DATE,
  prioridade TEXT DEFAULT 'normal',
  resolvido BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN doc_acompanhamento.prioridade IS 'alta | normal | baixa';
CREATE INDEX idx_docac_doc ON doc_acompanhamento(documento);
CREATE INDEX idx_docac_resolvido ON doc_acompanhamento(resolvido);

-- ============ 6. CONFIGURAÇÕES ============
CREATE TABLE configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  tipo TEXT DEFAULT 'text',
  descricao TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES
  ('contrato_numero', '59000130759252', 'text', 'Número do contrato'),
  ('contrato_valor', '915377248.89', 'number', 'Valor total do contrato (R$)'),
  ('contrato_unidade', 'U12', 'text', 'Unidade de processo'),
  ('contrato_descricao', 'RNEST UDA U-12 — Unidade de Destilação Atmosférica', 'text', 'Descrição'),
  ('bm_inicio_referencia', '2025-07', 'text', 'Mês de referência do BM-01'),
  ('bm_total', '22', 'number', 'Total de BMs do contrato'),
  ('periodo_dia_inicio', '26', 'number', 'Dia de início do período'),
  ('periodo_dia_fim', '25', 'number', 'Dia de fim do período'),
  ('alerta_aging_dias', '60', 'number', 'Dias para alerta de aging GITEC'),
  ('alerta_scon_minimo', '50', 'number', 'SCON % mínimo para alerta de prazo'),
  ('alerta_dados_desatualizados', '7', 'number', 'Dias para considerar dados desatualizados');

-- ============ 7. AUDITORIA ============
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_nome TEXT DEFAULT '',
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  referencia TEXT DEFAULT '',
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_acao ON audit_log(acao);
CREATE INDEX idx_audit_ent ON audit_log(entidade, referencia);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_data ON audit_log(created_at DESC);

-- ============ 8. VIEWS ============
CREATE OR REPLACE VIEW vw_previsao_por_bm AS
SELECT
  bm_name,
  COUNT(*) AS total_itens,
  COUNT(*) FILTER (WHERE status = 'previsto') AS previstos,
  COUNT(*) FILTER (WHERE status = 'confirmado') AS confirmados,
  COUNT(*) FILTER (WHERE status = 'postergado') AS postergados,
  COUNT(*) FILTER (WHERE status = 'cancelado') AS cancelados,
  COUNT(*) FILTER (WHERE status = 'medido') AS medidos,
  COALESCE(SUM(valor_previsto), 0) AS valor_total,
  COALESCE(SUM(valor_previsto) FILTER (WHERE status IN ('previsto','confirmado')), 0) AS valor_ativo,
  COALESCE(SUM(valor_previsto) FILTER (WHERE status = 'postergado'), 0) AS valor_postergado
FROM previsao_medicao
GROUP BY bm_name;

CREATE OR REPLACE VIEW vw_previsao_por_disciplina AS
SELECT
  bm_name, disciplina, responsavel_nome,
  COUNT(*) AS total_itens,
  COUNT(*) FILTER (WHERE status IN ('previsto','confirmado')) AS ativos,
  COUNT(*) FILTER (WHERE status = 'postergado') AS postergados,
  COALESCE(SUM(valor_previsto) FILTER (WHERE status IN ('previsto','confirmado')), 0) AS valor_ativo,
  COALESCE(SUM(valor_previsto) FILTER (WHERE status = 'postergado'), 0) AS valor_postergado
FROM previsao_medicao
GROUP BY bm_name, disciplina, responsavel_nome;

-- ============ 9. RLS ============
ALTER TABLE bm_periodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON bm_periodos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_auth" ON bm_periodos FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE previsao_medicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON previsao_medicao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_own" ON previsao_medicao FOR INSERT WITH CHECK (auth.uid() = responsavel_id);
CREATE POLICY "update_own" ON previsao_medicao FOR UPDATE USING (auth.uid() = responsavel_id);

ALTER TABLE previsao_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON previsao_historico FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_auth" ON previsao_historico FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE boletins_medicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON boletins_medicao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_auth" ON boletins_medicao FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE boletim_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON boletim_itens FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_auth" ON boletim_itens FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON anotacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_own" ON anotacoes FOR INSERT WITH CHECK (auth.uid() = autor_id);

ALTER TABLE doc_acompanhamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON doc_acompanhamento FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_auth" ON doc_acompanhamento FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON configuracoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_auth" ON configuracoes FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_auth" ON audit_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_auth" ON audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============ 10. TRIGGER updated_at ============
CREATE OR REPLACE FUNCTION trg_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bm_periodos_upd BEFORE UPDATE ON bm_periodos FOR EACH ROW EXECUTE FUNCTION trg_updated_at();
CREATE TRIGGER previsao_upd BEFORE UPDATE ON previsao_medicao FOR EACH ROW EXECUTE FUNCTION trg_updated_at();
CREATE TRIGGER docac_upd BEFORE UPDATE ON doc_acompanhamento FOR EACH ROW EXECUTE FUNCTION trg_updated_at();
CREATE TRIGGER config_upd BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION trg_updated_at();
