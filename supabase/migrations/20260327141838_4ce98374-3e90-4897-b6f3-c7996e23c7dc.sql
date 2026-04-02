CREATE TABLE scon_programacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  componente TEXT DEFAULT '',
  etapa TEXT DEFAULT '',
  atividade TEXT DEFAULT '',
  semana TEXT DEFAULT '',
  data_inicio DATE,
  data_fim DATE,
  equipe TEXT DEFAULT '',
  equipe_desc TEXT DEFAULT '',
  encarregado TEXT DEFAULT '',
  supervisor TEXT DEFAULT '',
  engenheiro TEXT DEFAULT '',
  gerente TEXT DEFAULT '',
  programado_componente NUMERIC(18,6) DEFAULT 0,
  total_exec_semana NUMERIC(18,6) DEFAULT 0,
  total_exec_geral NUMERIC(18,6) DEFAULT 0,
  peso_stagecode NUMERIC(10,6) DEFAULT 0,
  cwp TEXT DEFAULT '',
  disciplina TEXT DEFAULT '',
  classe TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  tag_id_proj TEXT DEFAULT '',
  documento TEXT DEFAULT '',
  pacote TEXT DEFAULT '',
  proposito TEXT DEFAULT '',
  id_primavera TEXT DEFAULT '',
  unit_valor NUMERIC(18,6) DEFAULT 0,
  unit TEXT DEFAULT '',
  indice_rop NUMERIC(10,6) DEFAULT 0,
  peso_custcode NUMERIC(10,6) DEFAULT 0,
  indice_atual NUMERIC(10,6) DEFAULT 0,
  item_wbs TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sconp_componente ON scon_programacao(componente);
CREATE INDEX idx_sconp_equipe ON scon_programacao(equipe_desc);
CREATE INDEX idx_sconp_disciplina ON scon_programacao(disciplina);
CREATE INDEX idx_sconp_wbs ON scon_programacao(item_wbs);
CREATE INDEX idx_sconp_batch ON scon_programacao(batch_id);
CREATE INDEX idx_sconp_semana ON scon_programacao(semana);

CREATE OR REPLACE VIEW vw_scon_componentes AS
SELECT
  componente, cwp, disciplina, classe, tipo, tag_id_proj, item_wbs, documento,
  MAX(encarregado) AS encarregado,
  MAX(supervisor) AS supervisor,
  MAX(engenheiro) AS engenheiro,
  MAX(gerente) AS gerente,
  MAX(unit_valor) AS unit_valor,
  MAX(indice_rop) AS indice_rop,
  MAX(peso_custcode) AS peso_custcode,
  COUNT(DISTINCT etapa) AS total_etapas,
  COUNT(DISTINCT semana) AS total_semanas,
  CASE WHEN MAX(programado_componente) > 0
    THEN LEAST(MAX(total_exec_geral) / MAX(programado_componente), 1.0)
    ELSE 0
  END AS avanco
FROM scon_programacao
GROUP BY componente, cwp, disciplina, classe, tipo, tag_id_proj, item_wbs, documento;

CREATE OR REPLACE VIEW vw_equipes AS
SELECT
  equipe_desc AS equipe,
  array_agg(DISTINCT encarregado) FILTER (WHERE encarregado != '') AS encarregados,
  array_agg(DISTINCT supervisor) FILTER (WHERE supervisor != '') AS supervisores,
  array_agg(DISTINCT disciplina) FILTER (WHERE disciplina != '') AS disciplinas,
  COUNT(DISTINCT componente) AS total_componentes,
  COUNT(DISTINCT semana) AS total_semanas,
  COUNT(*) AS total_linhas,
  ROUND(COUNT(DISTINCT componente)::numeric / NULLIF(COUNT(DISTINCT semana), 0), 1) AS comps_por_semana
FROM scon_programacao
WHERE equipe_desc IS NOT NULL AND equipe_desc != '' AND equipe_desc != 'N/A'
GROUP BY equipe_desc;

CREATE OR REPLACE VIEW vw_disciplinas AS
SELECT
  disciplina,
  COUNT(DISTINCT componente) AS total_componentes,
  COUNT(DISTINCT componente) FILTER (WHERE total_exec_geral >= programado_componente AND programado_componente > 0) AS concluidos,
  COUNT(*) AS total_linhas,
  COUNT(DISTINCT item_wbs) AS total_ppu
FROM scon_programacao
WHERE disciplina IS NOT NULL AND disciplina != ''
GROUP BY disciplina;

ALTER TABLE scon_programacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Write via batch" ON scon_programacao
  FOR ALL USING (owns_import_batch(batch_id, auth.uid()))
  WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON scon_programacao
  FOR SELECT USING (auth.role() = 'authenticated');