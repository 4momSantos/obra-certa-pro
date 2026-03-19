

# Plano: Módulo ETF Semanal Completo

## O que será construído

Módulo completo de controle de Efetivo Técnico e Funcional (ETF) com:
- Importação de planilha Excel (.xlsx/.csv) com dados de ponto
- Processamento e categorização automática do efetivo
- Dashboard com cards resumo (total efetivo, por categoria, horas trabalhadas)
- Tabelas detalhadas por categoria profissional
- Visualização semanal com gráficos de barras
- Gerenciamento manual de registros (adicionar/editar/remover)

## Arquivos a criar/modificar

### 1. Tipos ETF (`src/types/etf.ts`)
- Interface `ETFRecord`: id, nome, categoria (enum: Engenheiro, Técnico, Encarregado, Operário, Administrativo), empresa, horasTrabalhadas, horasExtras, faltas, semana, status
- Interface `ETFWeekSummary`: semana, totalEfetivo, por categoria, totalHoras
- Interface `ETFState`: registros, semanas disponíveis, semana selecionada

### 2. Context ETF (`src/contexts/ETFContext.tsx`)
- Provider com estado global + localStorage
- Funções: importarPlanilha, addRegistro, updateRegistro, removeRegistro, getSummaryByWeek, getSummaryByCategoria
- Parsing de CSV/XLSX no client-side

### 3. Página ETF (`src/pages/ETF.tsx`) - reescrever completamente
- **Header**: Título + seletor de semana + botão importar
- **Cards resumo**: Total Efetivo, Engenheiros, Técnicos, Operários (animados com framer-motion, estilo premium igual ao Dashboard)
- **Gráfico de barras**: Efetivo por categoria (Recharts BarChart)
- **Tabela detalhada**: Todos os registros da semana com filtros por categoria, busca por nome, ordenação
- **Modal de importação**: Drag-and-drop de arquivo, preview dos dados antes de confirmar, mapeamento de colunas
- **Dialog adic