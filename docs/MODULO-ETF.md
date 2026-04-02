# Modulo ETF Semanal (Efetivo Tecnico e Funcional)

---

## 1. Visao Geral

O modulo ETF e um wizard de 6 etapas que processa dados de ponto eletronico, efetivo tecnico e programacao semanal para gerar relatorios consolidados de efetivo por funcao, equipe e periodo. Ele importa planilhas Excel (.xlsx), cruza informacoes de multiplas fontes, e exporta relatorios prontos para apresentacao.

**Rota:** `/etf`  
**Arquivo principal:** `src/pages/ETF.tsx` (164 linhas)  
**Contexto:** `src/contexts/ETFContext.tsx` (144 linhas)  
**Tipos:** `src/types/etf.ts` (217 linhas)  
**Motor de processamento:** `src/lib/etf-processing.ts` (756 linhas)  
**Componentes:** `src/components/etf/` (6 arquivos, ~1034 linhas total)

---

## 2. Wizard - Visao Geral das Etapas

| Etapa | Componente | Linhas | Descricao |
|-------|-----------|--------|-----------|
| 1 | `ETFWizardUpload.tsx` | 181 | Upload de arquivos Excel |
| 2 | `ETFWizardConfig.tsx` | 162 | Configuracao de filtros e periodo |
| 3 | `ETFWizardEquipGrid.tsx` | 180 | Grid de equipamentos por dia |
| 4 | `ETFWizardProcess.tsx` | 60 | Barra de progresso e logs |
| 5 | `ETFWizardResults.tsx` | 356 | Visualizacao de resultados em abas |
| 6 | `ETFWizardExport.tsx` | 95 | Exportacao para Excel |

```
[1 Upload] → [2 Config] → [3 Equipamentos*] → [4 Processar] → [5 Resultados] → [6 Exportar]
                                    ↑
                          * Condicional: so aparece se
                            houver arquivo de equipamentos
```

---

## 3. ETFContext (Provider)

**Arquivo:** `src/contexts/ETFContext.tsx`

### 3.1 Estado Completo

```typescript
{
  step: WizardStep;                    // 1 a 6
  files: WizardFiles;                  // Refs aos 5 arquivos
  workbooks: WizardWorkbooks;          // Workbooks parseados (xlsx)
  config: WizardConfig;                // Configuracao do processamento
  equipamentos: EquipamentoInfo[];     // Lista de equipamentos detectados
  equipGrid: EquipGridRow[];           // Grid dia-a-dia de equipamentos
  feriados: Set<string>;               // Datas marcadas como feriado
  logs: LogEntry[];                    // Log do processamento
  progress: number;                    // 0-100
  isProcessing: boolean;               // Flag de processamento ativo
  results: ProcessingResults | null;   // Resultado final
}
```

**Nota:** O estado do ETF NAO e persistido. E mantido apenas em memoria e resetado ao recarregar a pagina.

### 3.2 Configuracao Padrao

```typescript
{
  semana: <semana atual do ano>,   // Calculado automaticamente
  inicio: '',                       // Detectado do arquivo Ponto
  fim: '',                          // Detectado do arquivo Ponto
  filtroAprovado: true,             // Incluir registros "Aprovado"
  filtroPendente: true,             // Incluir "Pendente" com "esqueci"
  filtroInvalido: false,            // Nao incluir "Invalido" por padrao
  canteiroLocs: new Set(),          // Localizacoes de canteiro
  allAsCanteiro: false,             // Tratar todos como canteiro
  noLocationData: false,            // Sem coluna de localizacao
  liderEquip: 'VALDINEY WILSON DOS SANTOS',
  equipeEquip: 'ETF_APOIO',
}
```

### 3.3 Acoes Disponiveis

| Acao | Descricao |
|------|-----------|
| `setStep(s)` | Navega para etapa especifica |
| `setFiles(f)` | Atualiza arquivos selecionados |
| `setWorkbooks(w)` | Atualiza workbooks parseados |
| `setConfig(c)` | Atualiza configuracao |
| `setEquipamentos(e)` | Define lista de equipamentos |
| `setEquipGrid(g)` | Atualiza grid de equipamentos |
| `setFeriados(f)` | Define set de feriados |
| `startProcessing()` | Inicia pipeline de processamento |
| `resetWizard()` | Reseta todo o estado para valores iniciais |

### 3.4 Fluxo de Processamento (startProcessing)

```
1. Inicializa grid de equipamentos (se necessario)
2. Chama processETF() com workbooks + config + grid
3. Atualiza progresso via callback setProgress
4. Recebe resultados → setResults(res) → setStep(5)
5. Em caso de erro → log do erro, mantém step 4
```

---

## 4. Etapa 1: Upload de Arquivos

**Arquivo:** `src/components/etf/ETFWizardUpload.tsx` (181 linhas)

### 4.1 Arquivos Aceitos

| Slot | Nome | Obrigatorio | Descricao |
|------|------|-------------|-----------|
| `ponto` | Ponto Bruto | Sim | Registros de entrada/saida do relogio de ponto |
| `efetivo` | Efetivo ETF | Sim | Cadastro de funcionarios com funcao, equipe, etc. |
| `prog` | Programacao | Sim | Programacao semanal por equipe e pacote |
| `modelo` | Modelo DE PARA | Nao | Mapeamento funcao CONSAG → funcao contrato |
| `equip` | Equipamentos | Nao | Lista de equipamentos alocados |

### 4.2 Comportamento

- **Upload:** Drag-and-drop ou click em cada slot
- **Parsing:** Cada arquivo e lido com `XLSX.read()` ao ser selecionado
- **Deteccao automatica:** Datas de inicio/fim extraidas do arquivo Ponto via `autoDetectDates()`
- **Equipamentos:** Se fornecido, auto-detecta colunas (TAG, PLACA, FABRICANTE, NOME EQUIP, NOME ETF, LOCADOR, MODELO, LIDER, EQUIPE)
- **Validacao:** Botao "Proximo" so habilitado quando 3 arquivos obrigatorios carregados

### 4.3 Visual

- Cards com borda tracejada quando vazio
- Borda verde quando arquivo carregado
- Nome do arquivo e badge com contagem de equipamentos

---

## 5. Etapa 2: Configuracao

**Arquivo:** `src/components/etf/ETFWizardConfig.tsx` (162 linhas)

### 5.1 Campos de Configuracao

| Campo | Tipo | Descricao |
|-------|------|-----------|
| Semana | Input numerico | Numero da semana do ano |
| Inicio | Input date | Data inicio do periodo |
| Fim | Input date | Data fim do periodo |
| Filtro Aprovado | Checkbox | Incluir registros com status "Aprovado" |
| Filtro Pendente | Checkbox | Incluir "Pendente" com motivo "esqueci" |
| Filtro Invalido | Checkbox | Incluir registros "Invalido" |
| Localizacoes | Multi-select | Selecionar quais locais sao "Canteiro" |

### 5.2 Deteccao de Localizacoes

A funcao `detectLocations()` le o workbook Ponto e extrai valores unicos da coluna de localizacao. Localizacoes contendo "CANTEIRO", "AVANCADO" ou "AVANCADO" sao auto-selecionadas como canteiro.

### 5.3 Navegacao Condicional

Ao clicar "Proximo":
- Se ha equipamentos → Vai para Etapa 3 (Grid de equipamentos)
- Se nao ha equipamentos → Pula direto para processamento (Etapa 4)

---

## 6. Etapa 3: Grid de Equipamentos

**Arquivo:** `src/components/etf/ETFWizardEquipGrid.tsx` (180 linhas)

### 6.1 Estrutura do Grid

```
         │ 01/15 Seg │ 01/16 Ter │ 01/17 Qua │ ... │ Total
─────────┼───────────┼───────────┼───────────┼─────┼──────
Equip A  │    1      │    1      │    0 *    │     │   5
Equip B  │    2      │    2      │    2      │     │  14
─────────┴───────────┴───────────┴───────────┴─────┴──────
                               * feriado (cinza)
```

### 6.2 Funcionalidades

- **Feriados:** Toggle por data, zera automaticamente as quantidades
- **Edicao inline:** Input numerico por celula (equipamento x dia)
- **Operacoes em lote:** "Todos = 1" e "Zerar" por equipamento
- **Exclusao:** Botao X por equipamento
- **Estatisticas:** Total de equipamentos, tipos, equipamento-dias, feriados

---

## 7. Etapa 4: Processamento

**Arquivo:** `src/components/etf/ETFWizardProcess.tsx` (60 linhas)

### 7.1 Interface

- Barra de progresso (0-100%)
- Area de log com scroll automatico (altura fixa 400px)
- Logs coloridos por tipo:
  - `info` → Azul
  - `ok` → Verde
  - `warn` → Amarelo
  - `err` → Vermelho
- Indicador de conclusao com checkmark

---

## 8. Pipeline de Processamento

**Arquivo:** `src/lib/etf-processing.ts` (756 linhas)

### 8.1 Funcao Principal: processETF()

```typescript
async function processETF(
  workbooks: { ponto, efetivo, prog, modelo },
  config: WizardConfig,
  equipGrid: EquipGridRow[],
  log: Logger,
  setProgress: (n: number) => void
): Promise<ProcessingResults>
```

### 8.2 Steps do Pipeline

| Step | Funcao | Descricao |
|------|--------|-----------|
| 1 | `step1_parseEfetivo()` | Parse da planilha Efetivo: chapas ativas, removidos, aprovados PB |
| 2 | `step2_parsePonto()` | Parse do Ponto Bruto: filtra por status e periodo |
| 3 | `step3_parseProgramacao()` | Parse da Programacao: mapeia equipe → pacote por semana |
| 4 | `step4_parseModelo()` | Parse do Modelo DE PARA: funcao CONSAG → funcao contrato |
| 5 | `step5_consolidate()` | Consolida ponto: agrupa por matricula+dia, calcula HH, classifica canteiro/fora |
| 6 | `step6_buildPlanejamento()` | Gera planejamento, apontamento, ausentes, substitutos |
| 7 | `step7_distFuncao()` | Distribuicao por funcao com totais diarios |
| 8 | `step8_faltas()` | Detecta faltas: dias sem ponto dentro do periodo |

### 8.3 Step 1: Parse Efetivo

**Entrada:** Workbook Efetivo ETF  
**Saida:** `efetivoETF` (Map), `removidos` (Map), `aprovPB` (Map)

- Detecta colunas automaticamente por header (CHAPA, CPF, NOME, FUNCAO, etc.)
- Fallback para indices fixos se headers nao encontrados
- Le aba principal de efetivo ativo
- Le aba "Removidos" (se existir)
- Le aba "Aprov" para aprovados PB
- Fallback para `HARDCODED_APROV_PB` (31 funcoes com quantidades)

### 8.4 Step 2: Parse Ponto

**Entrada:** Workbook Ponto Bruto + config  
**Saida:** `PontoRaw[]`

- Comeca na linha 6 (pula header de 5 linhas)
- Filtra por status (Aprovado/Pendente/Invalido conforme config)
- Filtra por periodo (inicio ≤ data ≤ fim)
- Parse de data via `parsePontoDate()`: suporta formato "HH:MM DDD DD/MM/YYYY"
- Loga estatisticas: total lidos, filtrados, dentro do periodo, validos

### 8.5 Step 3: Parse Programacao

**Entrada:** Workbook Programacao + semana alvo  
**Saida:** `progLookup` (Map equipe → pacote)

- Percorre todas as abas do workbook
- Detecta colunas PACOTE, SEMANA, EQUIPE por header
- Filtra registros da semana alvo
- Mapeia equipe → pacote (primeiro pacote encontrado)

### 8.6 Step 4: Parse Modelo

**Entrada:** Workbook Modelo (opcional)  
**Saida:** `dePara` (Map funcao CONSAG → funcao contrato)

- Procura aba "DE PARA" no workbook
- Fallback para `HARDCODED_DE_PARA` (36 mapeamentos)
- Usado para converter funcoes do sistema CONSAG para nomenclatura contratual

### 8.7 Step 5: Consolidacao

**Entrada:** `PontoRaw[]` + config  
**Saida:** `consolidated`, `canteiro`, `fora`

- Agrupa registros por matricula + dia
- Para cada grupo:
  - Primeira entrada → `entrada`
  - Ultima saida → `saida`
  - HH = (saida - entrada) em horas (cap: 0 a 14h)
- Classifica como canteiro ou fora conforme `canteiroLocs`
- Registros com `allAsCanteiro = true` → todos como canteiro

### 8.8 Step 6: Planejamento e Apontamento

**Entrada:** consolidated, efetivoETF, dePara, progLookup, config  
**Saida:** `planejamento`, `apontamento`, `ausentes`, `substitutos`

- Para cada chapa no efetivo:
  - Busca registros de ponto consolidados
  - Determina lider (extraido do encarregado)
  - Normaliza equipe (remove zeros a esquerda)
  - Resolve funcao ETF via `resolveFuncaoETF()` (prioridade: funcaoETF > dePara > funcaoConsag)
  - Busca pacote na programacao
  - Classifica: com ponto, substituto, ausente

### 8.9 Step 7: Distribuicao por Funcao

**Entrada:** planejamento, allDates, aprovPB  
**Saida:** `DistFuncaoRow[]`

- Agrupa por funcao ETF
- Conta presencas por dia
- Total = soma de todos os dias
- Compara com aprovados PB → calcula diferenca

### 8.10 Step 8: Faltas

**Entrada:** planejamento, allDates  
**Saida:** `FaltaRow[]`

- Para cada pessoa no planejamento:
  - Dias com ponto → presenca
  - Dias sem ponto → falta
- Filtra apenas quem tem ao menos 1 falta

### 8.11 Funcoes Utilitarias

| Funcao | Descricao |
|--------|-----------|
| `norm(s)` | Normaliza texto: trim, uppercase, remove acentos, espaco unico |
| `normChapa(s)` | Remove nao-digitos da matricula |
| `normEquipe(s)` | Remove zeros a esquerda |
| `parsePontoDate(str)` | Parse "HH:MM DDD DD/MM/YYYY" |
| `dateKey(d)` | Formata Date → "YYYY-MM-DD" |
| `fmtDate(d)` | Formata Date → "DD/MM/YYYY" |
| `fmtDateTime(d)` | Formata Date → "DD/MM/YYYY HH:MM" |
| `fmtTime(d)` | Formata Date → "HH:MM" |
| `extractLider(enc)` | Extrai nome do lider (antes de " - ") |
| `resolveFuncaoETF(...)` | Resolve funcao ETF com fallback DE PARA |
| `getAllDates(inicio, fim)` | Gera array de dateKeys no periodo |

---

## 9. Etapa 5: Resultados

**Arquivo:** `src/components/etf/ETFWizardResults.tsx` (356 linhas)

### 9.1 Cards de Estatisticas

| Card | Fonte | Descricao |
|------|-------|-----------|
| Ponto | `results.pontoRaw.length` | Total de registros de ponto |
| Chapas ETF | `results.efetivoETF.size` | Funcionarios no efetivo |
| Planejamento | `results.planejamento.length` | Registros planejados |
| Apontamento | `results.apontamento.length` | Registros apontados |
| Com/Sem Ponto | contagem filtrada | Presentes vs ausentes |
| Substitutos | `results.substitutos.length` | Substitutos alocados |

### 9.2 Abas de Resultados

| Aba | Dados | Colunas Principais | Limite |
|-----|-------|-------------------|--------|
| Distribuicao Funcao | `distFuncao` | Funcao, Datas, Total, Equipe, AprovPB, Dif | Todas |
| Planejamento | `planejamento` | Lider, Equipe, Pacote, Nome, Funcao, Chapa, Status | 500 |
| Apontamento | `apontamento` | Inicio, Fim, Lider, Equipe, Pacote, Nome, Funcao | 500 |
| Faltas | `faltas` | Chapa, Nome, Funcao, Equipe, Dias (status), Total | 500 |
| Substitutos | `substitutos` | Lider, Equipe, Nome, Funcao, Chapa, Dias | 300 |
| Ausentes | `ausentes` | Chapa, Nome, Funcao, Equipe, Lider, Motivo, Dias | Todos |
| Ponto Consolidado | `consolidated` | Matricula, Nome, Data, Entrada, Saida, HH, Local, Canteiro | 500 |

### 9.3 Badges de Status

- **SUB** (amarelo): Substituto
- **check** (verde): Tem ponto
- **X** (vermelho): Sem ponto

---

## 10. Etapa 6: Exportacao

**Arquivo:** `src/components/etf/ETFWizardExport.tsx` (95 linhas)

### 10.1 Opcoes de Exportacao

| Botao | Funcao | Arquivo Gerado |
|-------|--------|---------------|
| Relatorio ETF | `buildRelatorioETF()` | `ETF_Semana_XX.xlsx` |
| Ponto Consolidado | `buildPontoConsolidado()` | `Ponto_Consolidado_SXX.xlsx` |
| Exportar Tudo | Ambos acima | 2 arquivos com 500ms de delay |

### 10.2 Detalhes de Exportacao

- Usa `exceljs` para geracao de Excel
- Download via `downloadWorkbook()` que cria blob e link temporario
- Feedback via toast (sucesso ou erro)
- Loading state com spinner durante download

---

## 11. Tipos Principais

### 11.1 Tipos Legado (nao usados no wizard)

```typescript
type ETFCategoria = 'Engenheiro' | 'Tecnico' | 'Encarregado' | 'Operario' | 'Administrativo';
type ETFStatus = 'Ativo' | 'Afastado' | 'Ferias' | 'Desligado';
```

### 11.2 ProcessingResults

O resultado final contem todas as estruturas geradas pelo pipeline:

```typescript
interface ProcessingResults {
  pontoRaw: PontoRaw[];                        // Ponto bruto filtrado
  efetivoETF: Map<string, EfetivoInfo>;        // Efetivo ativo
  removidos: Map<string, EfetivoInfo>;         // Efetivo removido
  dePara: Map<string, string>;                 // Mapeamento funcao
  aprovPB: Map<string, number>;                // Aprovados PB
  progLookup: Map<string, string>;             // Equipe → Pacote
  consolidated: ConsolidatedRecord[];          // Ponto consolidado
  canteiro: ConsolidatedRecord[];              // Apenas canteiro
  fora: ConsolidatedRecord[];                  // Fora do canteiro
  planejamento: PlanejamentoRow[];             // Planejamento
  apontamento: ApontamentoRow[];               // Apontamento
  ausentes: AusenteRow[];                      // Ausentes
  substitutos: PlanejamentoRow[];              // Substitutos
  subsDiarios: Map<string, Set<string>>;       // Substituicoes por dia
  distFuncao: DistFuncaoRow[];                 // Distribuicao funcao
  faltas: FaltaRow[];                          // Faltas
  equipGrid: EquipGridRow[];                   // Grid equipamentos
  allDates: string[];                          // Todas as datas
}
```

---

## 12. Mapeamentos Hardcoded

### 12.1 DE PARA (36 mapeamentos)

Usado quando o arquivo Modelo nao e fornecido. Mapeia funcoes do sistema CONSAG para nomenclatura contratual ETF. Exemplos:

| Funcao CONSAG | Funcao ETF |
|---------------|-----------|
| AJUDANTE | Ajudante |
| CALDEIREIRO I | Caldeireiro |
| ELETRICISTA MONTADOR | Eletricista Montador |
| ENCARREGADO DE TUBULACAO | Encarregado de Turma (tubulacao) |
| SOLDADOR II | Soldador Qualificado API (6G), TIG e MIG |

### 12.2 Aprovados PB (31 funcoes)

Quantidades aprovadas por funcao para comparacao. Exemplos:

| Funcao | Aprovados |
|--------|-----------|
| Ajudante | 120 |
| Montador de Andaime | 199 |
| Encanador Industrial | 56 |
| Lixador | 40 |
| Soldador Qualificado API (6G), TIG e MIG | 25 |

---

## 13. Dependencias do Modulo

| Pacote | Uso |
|--------|-----|
| `xlsx` | Leitura de arquivos Excel (.xlsx) |
| `exceljs` | Geracao de arquivos Excel para exportacao |
| `framer-motion` | Animacoes de transicao e log entries |
| `lucide-react` | Icones do wizard (Upload, Settings, Grid, Zap, etc.) |
| `sonner` | Toast de feedback na exportacao |
| Shadcn/UI | Card, Button, Badge, Input, Checkbox, Tabs, Table |
