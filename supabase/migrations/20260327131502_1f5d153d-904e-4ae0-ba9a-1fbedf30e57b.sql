
-- 1. ÁRVORE EAP
CREATE TABLE cronograma_tree (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  nivel TEXT NOT NULL,
  ippu TEXT DEFAULT '',
  nome TEXT NOT NULL DEFAULT '',
  valor NUMERIC(18,2) DEFAULT 0,
  acumulado NUMERIC(18,2) DEFAULT 0,
  saldo NUMERIC(18,2) DEFAULT 0,
  fase_nome TEXT DEFAULT '',
  subfase_nome TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crono_tree_nivel ON cronograma_tree(nivel);
CREATE INDEX idx_crono_tree_ippu ON cronograma_tree(ippu);
CREATE INDEX idx_crono_tree_batch ON cronograma_tree(batch_id);
CREATE INDEX idx_crono_tree_fase ON cronograma_tree(fase_nome);

-- 2. VALORES POR BM
CREATE TABLE cronograma_bm_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  tree_id UUID REFERENCES cronograma_tree(id) ON DELETE CASCADE,
  ippu TEXT DEFAULT '',
  bm_name TEXT NOT NULL,
  bm_number INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  valor NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crono_bm_ippu ON cronograma_bm_values(ippu);
CREATE INDEX idx_crono_bm_name ON cronograma_bm_values(bm_name);
CREATE INDEX idx_crono_bm_tipo ON cronograma_bm_values(tipo);
CREATE INDEX idx_crono_bm_tree ON cronograma_bm_values(tree_id);
CREATE INDEX idx_crono_bm_batch ON cronograma_bm_values(batch_id);

-- 3. CURVA S
CREATE TABLE curva_s (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  col_index INTEGER NOT NULL,
  previsto_acum NUMERIC(18,2) DEFAULT 0,
  projetado_acum NUMERIC(18,2) DEFAULT 0,
  realizado_acum NUMERIC(18,2) DEFAULT 0,
  previsto_mensal NUMERIC(18,2) DEFAULT 0,
  projetado_mensal NUMERIC(18,2) DEFAULT 0,
  realizado_mensal NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_curva_batch ON curva_s(batch_id);

-- 4. VIEWS
CREATE OR REPLACE VIEW vw_cronograma_bm_por_ippu AS
SELECT
  ippu,
  bm_name,
  bm_number,
  COALESCE(SUM(valor) FILTER (WHERE tipo = 'Previsto'), 0) AS previsto,
  COALESCE(SUM(valor) FILTER (WHERE tipo = 'Projetado'), 0) AS projetado,
  COALESCE(SUM(valor) FILTER (WHERE tipo = 'Realizado'), 0) AS realizado
FROM cronograma_bm_values
WHERE ippu IS NOT NULL AND ippu != ''
GROUP BY ippu, bm_name, bm_number
ORDER BY ippu, bm_number;

CREATE OR REPLACE VIEW vw_ultimo_bm_realizado AS
SELECT MAX(bm_number) AS ultimo_bm
FROM cronograma_bm_values
WHERE tipo = 'Realizado' AND valor > 0;

CREATE OR REPLACE VIEW vw_cronograma_tree_completo AS
SELECT
  t.*,
  COALESCE(bm_agg.total_previsto, 0) AS total_previsto_bm,
  COALESCE(bm_agg.total_projetado, 0) AS total_projetado_bm,
  COALESCE(bm_agg.total_realizado, 0) AS total_realizado_bm
FROM cronograma_tree t
LEFT JOIN (
  SELECT ippu,
    SUM(valor) FILTER (WHERE tipo = 'Previsto') AS total_previsto,
    SUM(valor) FILTER (WHERE tipo = 'Projetado') AS total_projetado,
    SUM(valor) FILTER (WHERE tipo = 'Realizado') AS total_realizado
  FROM cronograma_bm_values
  GROUP BY ippu
) bm_agg ON bm_agg.ippu = t.ippu
ORDER BY t.sort_order;

-- 5. RLS
ALTER TABLE cronograma_tree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Write via batch" ON cronograma_tree FOR ALL
  TO authenticated
  USING (owns_import_batch(batch_id, auth.uid()))
  WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON cronograma_tree FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE cronograma_bm_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Write via batch" ON cronograma_bm_values FOR ALL
  TO authenticated
  USING (owns_import_batch(batch_id, auth.uid()))
  WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON cronograma_bm_values FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE curva_s ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Write via batch" ON curva_s FOR ALL
  TO authenticated
  USING (owns_import_batch(batch_id, auth.uid()))
  WITH CHECK (owns_import_batch(batch_id, auth.uid()));

CREATE POLICY "Read all" ON curva_s FOR SELECT
  TO authenticated
  USING (true);
