
-- View: execução SCON agregada por item_wbs com critério de medição
-- Cada linha = 1 componente executado numa semana, com seu critério vinculado
CREATE OR REPLACE VIEW public.vw_scon_execucao_por_bm AS
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
  -- Derive bm_name from data_fim using 26→25 rule
  CASE
    WHEN sp.data_fim IS NOT NULL THEN
      'BM-' || LPAD(
        (
          (EXTRACT(YEAR FROM sp.data_fim) - 2025) * 12
          + EXTRACT(MONTH FROM sp.data_fim)
          - 6
          + CASE WHEN EXTRACT(DAY FROM sp.data_fim) >= 26 THEN 1 ELSE 0 END
        )::TEXT, 2, '0'
      )
    ELSE NULL
  END AS bm_name_calc
FROM scon_programacao sp
LEFT JOIN scon_components sc
  ON sc.tag = sp.componente
  AND sc.item_wbs = sp.item_wbs
LEFT JOIN criterio_medicao cm
  ON cm.identificador = sc.item_criterio
  AND cm.nivel_estrutura = '7 - Etapa'
WHERE sp.total_exec_semana > 0;

-- View: itens executados no SCON que nunca foram previstos ou medidos
CREATE OR REPLACE VIEW public.vw_itens_nao_medidos AS
SELECT
  exec.item_wbs,
  exec.componente,
  exec.disciplina,
  exec.bm_name_calc,
  exec.criterio_nome,
  exec.item_criterio,
  exec.tag,
  exec.tag_desc,
  exec.total_exec_geral,
  exec.avanco_ponderado,
  exec.unit_valor,
  exec.dicionario_etapa
FROM vw_scon_execucao_por_bm exec
WHERE NOT EXISTS (
  SELECT 1 FROM previsao_medicao pm
  WHERE pm.ippu = exec.item_wbs
  AND pm.bm_name = exec.bm_name_calc
)
AND NOT EXISTS (
  SELECT 1 FROM boletim_itens bi
  JOIN boletins_medicao bm ON bm.id = bi.boletim_id
  WHERE bi.ippu = exec.item_wbs
  AND bm.bm_name = exec.bm_name_calc
)
AND exec.bm_name_calc IS NOT NULL;
