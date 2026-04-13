

# Plano Definitivo: Importação PPU com Mapeamento Correto

## Problema Atual
O parser legado assume posições fixas de colunas (ex: Agrupamento na coluna G/índice 6), mas a planilha real tem layout diferente (ex: Agrupamento na coluna K). O fuzzy matching já foi implementado, mas precisa de ajustes nos hints regex para cobrir melhor os headers reais da planilha.

## Diagnóstico
- A planilha PPU começa na linha 5 (`range: 4`) — as 4 primeiras linhas são cabeçalho/metadados
- O parser legado mapeia 21 colunas em posições fixas (A=flag até U=data_fim)
- A planilha real tem colunas em posições diferentes (confirmado pelo usuário: Agrupamento está na coluna K, não na E)

## Plano de Ação

### 1. Melhorar Regex Hints nos PPU_FIELDS (`src/lib/config-fields.ts`)
Atualizar os patterns de auto-detecção para serem mais abrangentes e cobrir variações comuns de headers em planilhas PPU:

| Campo | Hint Atual | Hint Melhorado |
|-------|-----------|----------------|
| flag | `flag` | `flag\|sinaliz` |
| item_ppu | `item.*ppu\|i\\.?ppu` | `item.*ppu\|i\\.?ppu\|^ppu$\|cod.*ppu` |
| descricao | `descri` | `descri[çc]\|descricao\|servi[çc]o` |
| valor_total | `valor.*total\|v\\.?total` | `valor.*total\|v\\.?total\|total.*r\\$\|vlr.*total` |
| preco_unit | `pre.o.*unit\|p\\.?u\\.?` | `pre[çc]o.*unit\|p\\.?u\\.?\|custo.*unit` |
| valor_medido | `valor.*medido\|v\\.?medido` | `valor.*medido\|v\\.?medido\|acumulado\|med.*acum` |
| unid_medida | `unid\|u\\.?m\\.?` | `unid.*med\|u\\.?m\\.?\|^un$\|^und$` |

### 2. Adicionar Match Score Visual no ColumnMapperDialog (`src/components/config/ColumnMapperDialog.tsx`)
Mostrar um indicador de confiança do match ao lado de cada campo mapeado automaticamente:
- **Verde** (●): Match por regex hint (alta confiança)
- **Amarelo** (●): Match por similaridade fuzzy (média confiança)
- **Cinza** (○): Não mapeado

Isso permite ao usuário ver rapidamente quais campos precisam de atenção.

### 3. Adicionar Botão "Re-detectar" no Mapper
Quando o usuário ajusta manualmente e quer voltar à detecção automática, um botão "Auto-detectar" re-executa o `autoDetectMapping` limpando o mapping manual.

### 4. Validação Pós-Mapeamento (warning inteligente)
Após confirmar o mapeamento, antes de enviar ao banco, verificar:
- Se `valor_total` tem pelo menos 50% dos valores > 0 (evitar importar coluna errada)
- Se `item_ppu` tem strings com 3+ caracteres (evitar artefatos como "x", "Prev")
- Mostrar warning com contagem: "823 itens válidos, 60 itens ignorados (item_ppu curto)"

### Arquivos Modificados
1. **`src/lib/config-fields.ts`** — Melhorar hints regex em PPU_FIELDS e demais campos
2. **`src/components/config/ColumnMapperDialog.tsx`** — Indicador de confiança + botão re-detectar
3. **`src/pages/Configuracao.tsx`** — Adicionar validação pós-mapeamento com warnings inteligentes

### Resultado Esperado
Ao fazer upload da planilha PPU.xlsx:
1. O mapper abre e pré-seleciona automaticamente as colunas corretas (mesmo com headers diferentes)
2. O usuário vê visualmente quais matches são de alta vs. baixa confiança
3. O preview confirma que os dados estão corretos antes de importar
4. Se o mapeamento for salvo, da próxima vez já vem pré-preenchido sem precisar confirmar novamente

