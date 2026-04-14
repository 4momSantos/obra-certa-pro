

# Fix: Página de Documentos — UX do Funil Documental

## Problema
O campo `status_correto` contém centenas de valores únicos (incluindo títulos de documentos sendo tratados como status), gerando uma barra de funil ilegível e uma lista enorme de legendas que ocupa a tela inteira.

## Solução

### 1. Limitar o Funil aos Top 5 status (`src/pages/DocumentsPage.tsx`)
- Mostrar apenas os 5 status com mais documentos na barra visual
- Agrupar o restante como "Outros (N)"
- Substituir a lista de texto solta por uma legenda compacta com bolinhas coloridas, máximo 6 itens (5 + Outros)

### 2. Melhorar a seção de KPIs
- O card "Top Status" já mostra 3 status — manter como está
- Remover redundância entre KPI e funil

### 3. Layout visual do funil
- Manter a barra horizontal (stacked bar) mas só com 5-6 segmentos
- Legenda abaixo com layout grid 2-3 colunas, cada item com bolinha de cor + nome + count
- Texto truncado para status com nomes longos

### Arquivo: `src/pages/DocumentsPage.tsx`
- Linhas 95-117: Refatorar seção do funil para limitar a 5 status + "Outros"
- Trocar `flex flex-wrap gap-3` de spans soltos por grid compacto com indicadores visuais

Nenhum outro arquivo precisa mudar.

