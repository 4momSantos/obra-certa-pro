

# Plano: Integrar Lógica de Processamento do Wizard ETF v8

## O que será construído

Migrar o sistema completo de processamento do Wizard ETF (HTML/JS) para o módulo React/TypeScript, transformando-o em um **wizard multi-step** com a mesma lógica de negócios:

1. **Upload de 5 arquivos** (Ponto Bruto, Efetivo ETF, Programação, Modelo DE PARA, Equipamentos)
2. **Configuração** (semana, datas, filtros de status, localizações canteiro, feriados)
3. **Grade de Equipamentos × Dias** (edição inline de quantidades por dia)
4. **Processamento** com barra de progresso e log em tempo real
5. **Resultados** com 8 abas (Distribuição por Função, Planejamento, Apontamento MO, Faltas, Substituídos, Ausentes, Ponto Consolidado, Resumo Semanal)
6. **Exportação Excel** formatada com ExcelJS (Relatório ETF + Ponto Consolidado)

## Arquitetura

```text
src/
  types/etf.ts              — Ampliar com interfaces completas (PontoRaw, Consolidated, Planejamento, etc.)
  lib/etf-processing.ts     — Core de processamento (steps 1-7 do wizard) como funções puras
  lib/etf-export.ts          — Geração de workbooks ExcelJS formatados
  contexts/ETFContext.tsx     — Ampliar com estado do wizard (files, config, results)
  pages/ETF.tsx              — Reescrever como wizard multi-step
  components/etf/
    ETFWizardUpload.tsx      — Step 1: Upload dos 5 arquivos com drag-and-drop
    ETFWizardConfig.tsx      — Step 2: Configuração de semana, filtros, localizações
    ETFWizardEquipGrid.tsx   — Step 3: Grade equipamentos × dias
    ETFWizardProcess.tsx     — Step 4: Barra de progresso + log
    ETFWizardResults.tsx     — Step 5: Tabs com tabelas de resultados
    ETFWizardExport.tsx      — Step 6: Cards de exportação Excel
```

## Lógica de processamento a migrar (`lib/etf-processing.ts`)

Todas as funções do wizard original, convertidas para TypeScript puro:

- **step1_parseEfetivo**: Ler aba de efetivo, removidos, e aprovação PB. Mapear chapa → info com auto-detecção de colunas. Fallback hardcoded para DE PARA e Aprovados PB.
- **step2_parsePonto**: Filtrar por status (Aprovado, Pendente+"esqueci", Inválido), período, e parsear datas no formato "HH:MM dia dd/mm/yyyy".
- **step3_parseProgramacao**: Varrer todas as abas buscando colunas SEMANA/EQUIPE/PACOTE e filtrar pela semana alvo.
- **step4_parseModelo**: Ler DE PARA de modelo opcional, com fallback hardcoded.
- **step5_consolidate**: Agrupar ponto por matrícula+dia, calcular HH (entrada→saída), separar canteiro/fora por localização.
- **step6_generateOutputs**: Montar PLANEJAMENTO (ativos + substituição diária de removidos), APONTAMENTO MO, AUSENTES, DISTRIBUIÇÃO POR FUNÇÃO, FALTAS.
- **step7_buildWorkbooks**: Gerar Excel formatado via ExcelJS com headers azuis, alternância de linhas, badges de status.

## Lógica de substituição diária (core business logic)

A lógica mais complexa: para cada dia, verificar se o número de ativos por função está abaixo do aprovado PB. Se sim, preencher com removidos que têm ponto naquele dia, respeitando o limite aprovado. Isso gera substituições parciais (pessoa X substitui nos dias 1 e 3, mas não no dia 2).

## Exportação Excel (`lib/etf-export.ts`)

Gerar 2 workbooks com ExcelJS:
- **Relatório ETF**: 8 abas (DISTRIBUIÇÃO POR FUNÇÃO, Planilha1, PLANEJAMENTO ETF, APONTAMENTO MO. ETF, FALTAS, SUBSTITUÍDOS, DISTRIBUIÇÃO POR EQUIPAMENTO, APONTAMENTO EQP. ETF, AUSENTES, DE PARA)
- **Ponto Consolidado**: 3 abas (Efetivo Canteiro, Fora do Canteiro, Resumo Semanal)

Formatação: header azul escuro (#1F3864), alternância cinza, badges ✓/✗ coloridos, bordas finas, fontes Aptos Narrow/Segoe UI.

## Modific