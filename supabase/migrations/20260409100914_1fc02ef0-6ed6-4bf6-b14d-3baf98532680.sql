DROP VIEW IF EXISTS public.vw_fiscais;
CREATE VIEW public.vw_fiscais AS
SELECT fiscal AS fiscal_responsavel,
    NULL::uuid AS contrato_id,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'Aprovado') AS aprovados,
    count(*) - count(*) FILTER (WHERE status = 'Aprovado') AS pendentes,
    COALESCE(sum(valor), 0::numeric) AS valor_total,
    COALESCE(sum(valor) FILTER (WHERE status = 'Aprovado'), 0::numeric) AS valor_aprovado,
    COALESCE(sum(valor) FILTER (WHERE status <> 'Aprovado'), 0::numeric) AS valor_pendente,
    avg((data_aprovacao - data_inf_execucao)::numeric) FILTER (WHERE data_aprovacao IS NOT NULL AND data_inf_execucao IS NOT NULL) AS avg_aging_dias
   FROM gitec_events
  WHERE fiscal IS NOT NULL AND fiscal <> ''
  GROUP BY fiscal;