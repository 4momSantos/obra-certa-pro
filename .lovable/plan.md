

## Diagnóstico: Filtros na Importação REL_EVENTO

### Problema identificado

O parser `parseRelEventoFile` tem **3 filtros** que podem estar descartando linhas ou distorcendo valores:

1. **Filtro de chave (linha 473)**: Descarta linhas onde `agrupamento_ippu`, `tag` e `agrupamento` são todos vazios. Se eventos legítimos não tiverem esses campos preenchidos, são ignorados silenciosamente.

2. **Filtro de pivot (linha 466)**: Descarta linhas cujo primeiro valor contenha "rótulos de", "total geral", etc. Pode acidentalmente filtrar eventos reais se o texto coincidir.

3. **Parser de números `num()` (linha 19-48)**: Converte valores monetários. Se o formato do Excel for ambíguo (ex: `1.234,56` vs `1,234.56`), pode interpretar errado.

### Plano de Correção

#### Passo 1 — Adicionar log de diagnóstico na importação

Modificar `parseRelEventoFile` para registrar nos warnings:
- Quantas linhas foram lidas no total
- Quantas foram descartadas por cada filtro (`noKey`, `pivotSkipped`)
- Amostra dos primeiros valores descartados (para o usuário validar)
- O valor da primeira e última linha importada (para conferir com a planilha)

#### Passo 2 — Relaxar o filtro de chave

Atualmente exige `agrupamento_ippu || tag || agrupamento`. Mudar para aceitar qualquer linha que tenha pelo menos **um campo significativo** (ex: `valor > 0`, ou `estrutura` preenchida, ou `etapa` preenchida), evitando descartar eventos válidos que simplesmente não têm TAG.

#### Passo 3 — Melhorar diagnóstico do `num()`

Adicionar nos warnings uma amostra do valor bruto vs. valor parseado para as primeiras 3 linhas, para que o usuário possa confirmar se a conversão está correta (ex: "Valor bruto: '1.234.567,89' → parseado: 1234567.89").

#### Passo 4 — Exibir resumo pós-parse mais detalhado

No `ImportPreview`, mostrar:
- Total de linhas lidas vs. importadas
- Soma total dos valores parseados (para conferir antes de gravar)
- Linhas descartadas por filtro

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImport.ts` | Relaxar filtro de chave, adicionar logs de diagnóstico no parser REL_EVENTO, incluir amostra de valores nos warnings |
| `src/components/import/ImportPreview.tsx` | Exibir soma total dos valores e contagem de linhas descartadas |

### Resultado esperado

Na próxima importação, o sistema mostrará um resumo detalhado antes de processar, permitindo ao usuário conferir se os valores e a contagem de eventos conferem com a planilha original. Eventos que antes eram descartados por falta de TAG/agrupamento serão mantidos.

