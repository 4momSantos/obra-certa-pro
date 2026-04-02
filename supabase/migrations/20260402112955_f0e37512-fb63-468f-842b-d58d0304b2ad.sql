
-- Drop table with CASCADE (drops dependent views too)
DROP TABLE IF EXISTS scon_programacao CASCADE;

CREATE TABLE scon_programacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  contrato_id UUID REFERENCES contratos(id),
  -- IDENTIFICAÇÃO DO COMPONENTE
  planta TEXT DEFAULT '',
  cwp TEXT DEFAULT '',
  componente TEXT DEFAULT '',
  descricao TEXT DEFAULT '',
  pacote TEXT DEFAULT '',
  proposito TEXT DEFAULT '',
  -- ETAPA E ATIVIDADE
  etapa TEXT DEFAULT '',
  atividade TEXT DEFAULT '',
  -- SEMANA E PERÍODO
  semana TEXT DEFAULT '',
  data_inicio DATE,
  data_fim DATE,
  -- EQUIPE
  equipe TEXT DEFAULT '',
  equipe_desc TEXT DEFAULT '',
  tamanho_equipe INTEGER DEFAULT 0,
  -- RESPONSÁVEIS (com matrícula e CPF)
  encarregado TEXT DEFAULT '',
  encarregado_mat TEXT DEFAULT '',
  encarregado_cpf TEXT DEFAULT '',
  supervisor TEXT DEFAULT '',
  supervisor_mat TEXT DEFAULT '',
  supervisor_cpf TEXT DEFAULT '',
  engenheiro TEXT DEFAULT '',
  engenheiro_mat TEXT DEFAULT '',
  engenheiro_cpf TEXT DEFAULT '',
  gerente TEXT DEFAULT '',
  gerente_mat TEXT DEFAULT '',
  gerente_cpf TEXT DEFAULT '',
  -- PROGRAMAÇÃO E DISTRIBUIÇÃO
  programacao NUMERIC(18,6) DEFAULT 0,
  distribuicao TEXT DEFAULT '',
  -- DISCIPLINA E UNIDADE
  disciplina TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  unit_valor NUMERIC(18,6) DEFAULT 0,
  unit_unid_medida TEXT DEFAULT '',
  -- PROGRAMADO
  programado_componente NUMERIC(18,6) DEFAULT 0,
  programado_pacote NUMERIC(18,6) DEFAULT 0,
  -- PLANEJADO POR DIA DA SEMANA
  plan_segunda NUMERIC(18,6) DEFAULT 0,
  plan_terca NUMERIC(18,6) DEFAULT 0,
  plan_quarta NUMERIC(18,6) DEFAULT 0,
  plan_quinta NUMERIC(18,6) DEFAULT 0,
  plan_sexta NUMERIC(18,6) DEFAULT 0,
  plan_sabado NUMERIC(18,6) DEFAULT 0,
  plan_domingo NUMERIC(18,6) DEFAULT 0,
  -- EXECUTADO POR DIA DA SEMANA
  exec_segunda NUMERIC(18,6) DEFAULT 0,
  exec_terca NUMERIC(18,6) DEFAULT 0,
  exec_quarta NUMERIC(18,6) DEFAULT 0,
  exec_quinta NUMERIC(18,6) DEFAULT 0,
  exec_sexta NUMERIC(18,6) DEFAULT 0,
  exec_sabado NUMERIC(18,6) DEFAULT 0,
  exec_domingo NUMERIC(18,6) DEFAULT 0,
  -- TOTAIS DE EXECUÇÃO
  total_exec_semana NUMERIC(18,6) DEFAULT 0,
  total_exec_geral NUMERIC(18,6) DEFAULT 0,
  -- TIMESTAMPS E CONTROLE
  datahora TIMESTAMPTZ,
  conta_custo TEXT DEFAULT '',
  -- ÍNDICES E PESOS
  indice_rop NUMERIC(18,6) DEFAULT 0,
  classe TEXT DEFAULT '',
  peso_custcode NUMERIC(18,6) DEFAULT 0,
  indice_atual NUMERIC(18,6) DEFAULT 0,
  -- IDs DO SISTEMA FONTE
  componente_objuid TEXT DEFAULT '',
  guid_model TEXT DEFAULT '',
  id_primavera TEXT DEFAULT '',
  -- WBS E TIPO (CHAVE DE CRUZAMENTO)
  item_wbs TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  -- MAIS IDs
  cwts_objuid TEXT DEFAULT '',
  peso_stagecode NUMERIC(18,6) DEFAULT 0,
  id_componente_etapas TEXT DEFAULT '',
  modulo TEXT DEFAULT '',
  units NUMERIC(18,6) DEFAULT 0,
  conta_custo_programacao TEXT DEFAULT '',
  iwp_objuid TEXT DEFAULT '',
  -- DOCUMENTO E PESOS
  documento TEXT DEFAULT '',
  peso_absoluto NUMERIC(18,6) DEFAULT 0,
  kpi TEXT DEFAULT '',
  nota TEXT DEFAULT '',
  recebimento TEXT DEFAULT '',
  -- TAG E CÓDIGOS
  tag_id_proj TEXT DEFAULT '',
  codigo_grupo TEXT DEFAULT '',
  codigo_frente TEXT DEFAULT '',
  codigo_tarefa TEXT DEFAULT '',
  -- MERGE E OPERAÇÃO
  dt_merge TIMESTAMPTZ,
  ultima_oper TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES ESSENCIAIS
CREATE INDEX idx_sp_componente ON scon_programacao(componente);
CREATE INDEX idx_sp_item_wbs ON scon_programacao(item_wbs);
CREATE INDEX idx_sp_equipe ON scon_programacao(equipe_desc);
CREATE INDEX idx_sp_disciplina ON scon_programacao(disciplina);
CREATE INDEX idx_sp_semana ON scon_programacao(semana);
CREATE INDEX idx_sp_etapa ON scon_programacao(etapa);
CREATE INDEX idx_sp_batch ON scon_programacao(batch_id);
CREATE INDEX idx_sp_contrato ON scon_programacao(contrato_id);
CREATE INDEX idx_sp_data_fim ON scon_programacao(data_fim);
CREATE INDEX idx_sp_tag_id ON scon_programacao(tag_id_proj);
CREATE INDEX idx_sp_classe ON scon_programacao(classe);
CREATE INDEX idx_sp_planta ON scon_programacao(planta);
CREATE INDEX idx_sp_pacote ON scon_programacao(pacote);

-- RLS
ALTER TABLE scon_programacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_contrato" ON scon_programacao
  FOR SELECT TO authenticated
  USING (contrato_id = ANY(user_contrato_ids()) OR contrato_id IS NULL);

CREATE POLICY "write_batch" ON scon_programacao
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "delete_batch" ON scon_programacao
  FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

-- Recreate dependent views

CREATE OR REPLACE VIEW vw_scon_execucao_por_bm AS
SELECT
  sp.id AS scon_prog_id,
  sp.componente,
  sp.item_wbs,
  sp.disciplina,
  sp.classe,
  sp.tipo,
  sp.data_inicio,
  sp.data_fim,
  sp.total_exec_semana,
  sp.total_exec_geral,
  sp.unit_valor,
  sp.semana,
  sp.equipe,
  sp.etapa AS scon_etapa,
  sc.item_criterio,
  sc.avanco_ponderado,
  sc.tag,
  sc.tag_desc,
  sc.status_gitec,
  cm.nome AS criterio_nome,
  cm.dicionario_etapa,
  cm.peso_absoluto,
  cm.peso_fisico_fin,
  'BM-' || LPAD(
    (
      (EXTRACT(YEAR FROM sp.data_fim) - 2025) * 12
      + EXTRACT(MONTH FROM sp.data_fim) - 6
      + CASE WHEN EXTRACT(DAY FROM sp.data_fim) >= 26 THEN 1 ELSE 0 END
    )::TEXT, 2, '0'
  ) AS bm_name_calc
FROM scon_programacao sp
LEFT JOIN scon_components sc
  ON sc.tag = sp.componente
  AND sc.item_wbs = sp.item_wbs
LEFT JOIN criterio_medicao cm
  ON cm.identificador = sc.item_criterio
WHERE sp.total_exec_semana > 0;

CREATE OR REPLACE VIEW vw_itens_nao_medidos AS
SELECT
  sp.item_wbs,
  sp.componente,
  sp.disciplina,
  'BM-' || LPAD(
    (
      (EXTRACT(YEAR FROM sp.data_fim) - 2025) * 12
      + EXTRACT(MONTH FROM sp.data_fim) - 6
      + CASE WHEN EXTRACT(DAY FROM sp.data_fim) >= 26 THEN 1 ELSE 0 END
    )::TEXT, 2, '0'
  ) AS bm_name_calc,
  cm.nome AS criterio_nome,
  sc.item_criterio,
  sc.tag,
  sc.tag_desc,
  sp.total_exec_geral,
  sc.avanco_ponderado,
  sp.unit_valor,
  cm.dicionario_etapa
FROM scon_programacao sp
LEFT JOIN scon_components sc
  ON sc.tag = sp.componente
  AND sc.item_wbs = sp.item_wbs
LEFT JOIN criterio_medicao cm
  ON cm.identificador = sc.item_criterio
WHERE sp.total_exec_geral > 0
  AND NOT EXISTS (
    SELECT 1 FROM previsao_medicao pm
    WHERE pm.ippu = sp.item_wbs
  )
  AND NOT EXISTS (
    SELECT 1 FROM boletim_itens bi
    WHERE bi.ippu = sp.item_wbs
  )
GROUP BY sp.item_wbs, sp.componente, sp.disciplina,
         sp.data_fim, cm.nome, sc.item_criterio,
         sc.tag, sc.tag_desc, sp.total_exec_geral,
         sc.avanco_ponderado, sp.unit_valor, cm.dicionario_etapa;
