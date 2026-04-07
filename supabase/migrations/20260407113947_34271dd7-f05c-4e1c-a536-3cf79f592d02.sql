
CREATE TABLE public.snapshots_medicao (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boletim         TEXT NOT NULL,
    bm_number       INTEGER,
    fechado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fechado_por     UUID,
    fechado_por_nome TEXT,
    valor_previsto  NUMERIC(18,2),
    valor_sigem     NUMERIC(18,2),
    valor_gitec     NUMERIC(18,2),
    valor_scon      NUMERIC(18,2),
    valor_aprovado  NUMERIC(18,2),
    qtd_itens       INTEGER,
    qtd_itens_aprovados INTEGER,
    itens_snapshot  JSONB,
    curva_s_snapshot JSONB,
    observacoes     TEXT,
    contrato_id     UUID REFERENCES public.contratos(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (boletim, contrato_id)
);

CREATE INDEX idx_snapshots_medicao_boletim ON public.snapshots_medicao (boletim);
CREATE INDEX idx_snapshots_medicao_fechado_em ON public.snapshots_medicao (fechado_em DESC);

ALTER TABLE public.snapshots_medicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_snapshots" ON public.snapshots_medicao
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_snapshots" ON public.snapshots_medicao
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
