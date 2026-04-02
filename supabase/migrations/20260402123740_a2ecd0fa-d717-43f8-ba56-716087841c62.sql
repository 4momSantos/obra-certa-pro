
DROP VIEW IF EXISTS vw_scon_execucao_por_bm;

CREATE VIEW vw_scon_execucao_por_bm AS
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
  sp.indice_rop,
  sp.semana,
  sp.equipe,
  sp.equipe_desc,
  sp.etapa AS scon_etapa,
  sp.plan_segunda, sp.plan_terca, sp.plan_quarta, sp.plan_quinta,
  sp.plan_sexta, sp.plan_sabado, sp.plan_domingo,
  sp.exec_segunda, sp.exec_terca, sp.exec_quarta, sp.exec_quinta,
  sp.exec_sexta, sp.exec_sabado, sp.exec_domingo,
  COALESCE(sp.total_exec_semana * sp.indice_rop * sp.unit_valor, 0) AS valor_exec_semana,
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
  ON sc.tag = sp.componente AND sc.item_wbs = sp.item_wbs
LEFT JOIN criterio_medicao cm
  ON cm.identificador = sc.item_criterio
WHERE sp.total_exec_semana > 0;
