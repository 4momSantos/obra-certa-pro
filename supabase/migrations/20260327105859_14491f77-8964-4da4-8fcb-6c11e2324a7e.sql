
-- 2. PPU-PREV (cadastro, ~900 itens)
CREATE TABLE ppu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  item_eap TEXT,
  item_gitec TEXT,
  item_ppu TEXT NOT NULL,
  fase TEXT DEFAULT '',
  subfase TEXT DEFAULT '',
  agrupamento TEXT DEFAULT '',
  descricao TEXT DEFAULT '',
  criterio_medicao_ref TEXT DEFAULT '',
  item_lc TEXT DEFAULT '',
  reajuste TEXT DEFAULT '',
  unid_medida TEXT DEFAULT '',
  qtd NUMERIC(18,6) DEFAULT 0,
  preco_unit NUMERIC(18,6) DEFAULT 0,
  valor_total NUMERIC(18,2) DEFAULT 0,
  valor_medido NUMERIC(18,2) DEFAULT 0,
  carac TEXT DEFAULT '',
  disc TEXT DEFAULT '',
  fam TEXT DEFAULT '',
  data_inicio DATE,
  data_fim DATE,
  flag TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ppu_item ON ppu_items(item_ppu);
CREATE INDEX idx_ppu_gitec ON ppu_items(item_gitec);

-- 3. CLASSIFICAÇÃO PPU (cadastro, ~876 itens)
CREATE TABLE classificacao_ppu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  item_ppu TEXT NOT NULL,
  item_eap TEXT DEFAULT '',
  item_gitec TEXT DEFAULT '',
  fase TEXT DEFAULT '',
  subfase TEXT DEFAULT '',
  agrupamento TEXT DEFAULT '',
  disciplina TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_class_ppu ON classificacao_ppu(item_ppu);
CREATE INDEX idx_class_gitec ON classificacao_ppu(item_gitec);

-- 4. EAC (curva de avanço, ~874 itens)
CREATE TABLE eac_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  ppu TEXT NOT NULL,
  up TEXT DEFAULT 'U12',
  up_id TEXT DEFAULT '',
  ppu_agrup TEXT DEFAULT '',
  estrutura TEXT DEFAULT '',
  fase TEXT DEFAULT '',
  subfase TEXT DEFAULT '',
  agrupamento TEXT DEFAULT '',
  peso_fisico NUMERIC(10,4) DEFAULT 0,
  valor_financeiro NUMERIC(18,2) DEFAULT 0,
  data_inicio DATE,
  data_termino DATE,
  tipo_curva TEXT DEFAULT '',
  previsto NUMERIC(10,6) DEFAULT 0,
  realizado NUMERIC(10,6) DEFAULT 0,
  qtd_prevista NUMERIC(18,6) DEFAULT 0,
  um TEXT DEFAULT '',
  qtd_escopo NUMERIC(18,6) DEFAULT 0,
  qtd_utilizada_medicao TEXT DEFAULT '',
  med_acumulada NUMERIC(18,2) DEFAULT 0,
  sistema TEXT DEFAULT '',
  vlr_medido NUMERIC(18,2) DEFAULT 0,
  valor_saldo NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eac_ppu ON eac_items(ppu);

-- 5. CRITÉRIO DE MEDIÇÃO (Anexo III, ~1007 itens)
CREATE TABLE criterio_medicao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  identificador TEXT DEFAULT '',
  item_ppu TEXT DEFAULT '',
  nivel_estrutura TEXT DEFAULT '',
  nome TEXT DEFAULT '',
  dicionario_etapa TEXT DEFAULT '',
  peso_absoluto NUMERIC(12,6) DEFAULT 0,
  peso_fisico_fin NUMERIC(12,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crit_ppu ON criterio_medicao(item_ppu);

-- 6. SIGEM (operacional, ~22k docs)
CREATE TABLE sigem_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  documento TEXT NOT NULL,
  revisao TEXT DEFAULT '',
  incluido_em TEXT DEFAULT '',
  titulo TEXT DEFAULT '',
  status TEXT DEFAULT '',
  up TEXT DEFAULT '',
  status_correto TEXT DEFAULT '',
  ppu TEXT DEFAULT '',
  status_gitec TEXT DEFAULT '',
  documento_revisao TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sigem_doc ON sigem_documents(documento);
CREATE INDEX idx_sigem_status ON sigem_documents(status_correto);
CREATE INDEX idx_sigem_ppu ON sigem_documents(ppu);
CREATE INDEX idx_sigem_batch ON sigem_documents(batch_id);

-- 7. REL_EVENTO / GITEC (operacional, ~6k eventos)
CREATE TABLE rel_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  item_ppu TEXT DEFAULT '',
  rel_status TEXT DEFAULT '',
  rel_status_item TEXT DEFAULT '',
  tag_agrup TEXT DEFAULT '',
  quantidade_ponderada NUMERIC(18,4) DEFAULT 0,
  estrutura TEXT DEFAULT '',
  fase TEXT DEFAULT '',
  subfase TEXT DEFAULT '',
  agrupamento TEXT DEFAULT '',
  caracteristica TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  qtd NUMERIC(18,6) DEFAULT 0,
  um TEXT DEFAULT '',
  etapa TEXT DEFAULT '',
  peso_fisico NUMERIC(10,4) DEFAULT 0,
  peso_financeiro NUMERIC(10,4) DEFAULT 0,
  data_execucao DATE,
  data_inf_execucao DATE,
  executado_por TEXT DEFAULT '',
  necessita_evidencias TEXT DEFAULT '',
  numero_evidencias TEXT DEFAULT '',
  data_aprovacao DATE,
  fiscal_responsavel TEXT DEFAULT '',
  status TEXT DEFAULT '',
  valor NUMERIC(18,2) DEFAULT 0,
  comentario TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rel_item_ppu ON rel_eventos(item_ppu);
CREATE INDEX idx_rel_status ON rel_eventos(status);
CREATE INDEX idx_rel_etapa ON rel_eventos(etapa);
CREATE INDEX idx_rel_fiscal ON rel_eventos(fiscal_responsavel);
CREATE INDEX idx_rel_tag ON rel_eventos(tag);
CREATE INDEX idx_rel_batch ON rel_eventos(batch_id);

-- 8. SCON (operacional, ~1.5k componentes)
CREATE TABLE scon_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE NOT NULL,
  item_criterio TEXT DEFAULT '',
  relatorio_esperado TEXT DEFAULT '',
  status_sigem TEXT DEFAULT '',
  status_gitec TEXT DEFAULT '',
  obra_desc TEXT DEFAULT '',
  classe TEXT DEFAULT '',
  disciplina TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  item_wbs TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  tag_desc TEXT DEFAULT '',
  qtde_etapa NUMERIC(18,6) DEFAULT 0,
  qtde_etapa_exec_acum NUMERIC(18,6) DEFAULT 0,
  avanco_ponderado NUMERIC(10,4) DEFAULT 0,
  tag_id_proj TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scon_wbs ON scon_components(item_wbs);
CREATE INDEX idx_scon_disc ON scon_components(disciplina);
CREATE INDEX idx_scon_tag ON scon_components(tag);
CREATE INDEX idx_scon_batch ON scon_components(batch_id);
