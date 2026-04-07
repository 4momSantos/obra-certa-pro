
CREATE TABLE public.splan_tarefas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boletim         TEXT NOT NULL,
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    tipo            TEXT DEFAULT 'checklist',
    status          TEXT DEFAULT 'aberta',
    prioridade      TEXT DEFAULT 'normal',
    responsavel_id  UUID,
    responsavel_nome TEXT,
    item_ppu        TEXT,
    prazo           DATE,
    concluida_em    TIMESTAMPTZ,
    concluida_por   UUID,
    contrato_id     UUID REFERENCES public.contratos(id),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_splan_tarefas_boletim ON public.splan_tarefas (boletim);
CREATE INDEX idx_splan_tarefas_status ON public.splan_tarefas (status);
CREATE INDEX idx_splan_tarefas_responsavel ON public.splan_tarefas (responsavel_id);

ALTER TABLE public.splan_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_tarefas" ON public.splan_tarefas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "manage_tarefas" ON public.splan_tarefas
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_splan_tarefas_updated_at
    BEFORE UPDATE ON public.splan_tarefas
    FOR EACH ROW EXECUTE FUNCTION public.trg_updated_at();
