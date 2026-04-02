CREATE OR REPLACE VIEW vw_sigem_por_ppu AS
SELECT
  ge.ippu AS ppu,
  COUNT(DISTINCT sd.id) AS total_docs,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto IN ('Sem Comentários', 'Para Construção')
  ) AS docs_ok,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Recusado'
  ) AS docs_recusados,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Em Workflow'
  ) AS docs_workflow,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Com Comentários'
  ) AS docs_comentarios
FROM gitec_events ge
CROSS JOIN LATERAL unnest(
  string_to_array(ge.evidencias, ';')
) AS ev(doc_num)
JOIN sigem_documents sd
  ON trim(ev.doc_num) = sd.documento
WHERE ge.ippu IS NOT NULL
  AND ge.ippu != ''
  AND ge.evidencias IS NOT NULL
  AND ge.evidencias != ''
GROUP BY ge.ippu;