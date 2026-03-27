
-- RLS para todas as novas tabelas
ALTER TABLE ppu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE classificacao_ppu ENABLE ROW LEVEL SECURITY;
ALTER TABLE eac_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterio_medicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE sigem_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scon_components ENABLE ROW LEVEL SECURITY;

-- Policies: leitura para autenticados, escrita via batch owner
CREATE POLICY "Read all" ON ppu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON ppu_items FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON classificacao_ppu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON classificacao_ppu FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON eac_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON eac_items FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON criterio_medicao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON criterio_medicao FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON sigem_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON sigem_documents FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON rel_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON rel_eventos FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON scon_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write via batch" ON scon_components FOR ALL TO authenticated USING (owns_import_batch(batch_id, auth.uid())) WITH CHECK (owns_import_batch(batch_id, auth.uid()));

-- Views de cruzamento
CREATE OR REPLACE VIEW vw_scon_por_ppu AS
SELECT
  item_wbs,
  COUNT(*) AS total_componentes,
  COUNT(*) FILTER (WHERE avanco_ponderado >= 100) AS concluidos,
  COUNT(*) FILTER (WHERE avanco_ponderado > 0 AND avanco_ponderado < 100) AS em_andamento,
  COUNT(*) FILTER (WHERE avanco_ponderado = 0) AS nao_iniciados,
  ROUND(AVG(avanco_ponderado)::numeric, 2) AS avg_avanco,
  SUM(qtde_etapa) AS qtde_programada,
  SUM(qtde_etapa_exec_acum) AS qtde_executada
FROM scon_components
WHERE item_wbs IS NOT NULL AND item_wbs != ''
GROUP BY item_wbs;

CREATE OR REPLACE VIEW vw_sigem_por_ppu AS
SELECT
  ppu,
  COUNT(*) AS total_docs,
  COUNT(*) FILTER (WHERE status_correto IN ('Sem Comentários', 'Para Construção')) AS docs_ok,
  COUNT(*) FILTER (WHERE status_correto = 'Recusado') AS docs_recusados,
  COUNT(*) FILTER (WHERE status_correto = 'Em Workflow') AS docs_workflow,
  COUNT(*) FILTER (WHERE status_correto = 'Com Comentários') AS docs_comentarios
FROM sigem_documents
WHERE ppu IS NOT NULL AND ppu != ''
GROUP BY ppu;

CREATE OR REPLACE VIEW vw_gitec_por_ppu AS
SELECT
  item_ppu,
  COUNT(*) AS total_eventos,
  COUNT(*) FILTER (WHERE etapa = 'Concluída') AS eventos_concluidos,
  COUNT(*) FILTER (WHERE etapa != 'Concluída') AS eventos_pendentes,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS status_aprovado,
  COUNT(*) FILTER (WHERE status LIKE 'Pendente%') AS status_pendente,
  COALESCE(SUM(quantidade_ponderada), 0) AS valor_ponderado_total,
  COALESCE(SUM(quantidade_ponderada) FILTER (WHERE etapa = 'Concluída'), 0) AS valor_ponderado_concluido,
  COALESCE(SUM(valor), 0) AS valor_total,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Aprovado'), 0) AS valor_aprovado,
  COALESCE(SUM(valor) FILTER (WHERE status LIKE 'Pendente%'), 0) AS valor_pendente
FROM rel_eventos
WHERE item_ppu IS NOT NULL AND item_ppu != ''
GROUP BY item_ppu;

CREATE OR REPLACE VIEW vw_fiscais AS
SELECT
  fiscal_responsavel,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE status LIKE 'Pendente%') AS pendentes,
  COALESCE(SUM(valor) FILTER (WHERE status LIKE 'Pendente%'), 0) AS valor_pendente,
  COALESCE(SUM(valor) FILTER (WHERE status = 'Aprovado'), 0) AS valor_aprovado
FROM rel_eventos
WHERE fiscal_responsavel IS NOT NULL AND fiscal_responsavel != ''
GROUP BY fiscal_responsavel;
