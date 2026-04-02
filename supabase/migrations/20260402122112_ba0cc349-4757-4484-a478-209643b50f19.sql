CREATE OR REPLACE VIEW vw_scon_com_criterio AS
SELECT
  sp.*,
  sc.item_criterio,
  sc.relatorio_esperado,
  sc.status_sigem,
  sc.status_gitec,
  sc.avanco_ponderado AS avanco_resumido
FROM scon_programacao sp
LEFT JOIN scon_components sc
  ON sc.tag = sp.componente
  AND sc.batch_id = sp.batch_id;