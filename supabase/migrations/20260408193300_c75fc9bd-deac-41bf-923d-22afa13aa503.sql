
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='snapshots_medicao' AND column_name='fechado_por_nome') THEN
    ALTER TABLE public.snapshots_medicao ADD COLUMN fechado_por_nome TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='snapshots_medicao' AND column_name='valor_sigem') THEN
    ALTER TABLE public.snapshots_medicao ADD COLUMN valor_sigem NUMERIC(18,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='snapshots_medicao' AND column_name='qtd_itens_aprovados') THEN
    ALTER TABLE public.snapshots_medicao ADD COLUMN qtd_itens_aprovados INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='snapshots_medicao' AND column_name='curva_s_snapshot') THEN
    ALTER TABLE public.snapshots_medicao ADD COLUMN curva_s_snapshot JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
