

# Diagnóstico e Correção do Parser REL_EVENTO

## Problema

O parser detecta 5.978 linhas mas todos os valores estão zerados (Concluídos=0, Valor=R$0.00M). Isso indica que os `findCol` estão retornando -1 para colunas-chave (etapa, valor, status), provavelmente porque a detecção dinâmica de cabeçalho está acertando a **linha errada** — as linhas de filtro do relatório contêm as palavras "estrutura" e "etapa" como nomes de filtro, antes da linha real de cabeçalhos.

## Causa Raiz

A condição `rowStr.includes("estrutura") && rowStr.includes("etapa")` é muito genérica. A linha de filtros "Tipo: STATUS ATUAL | Etapa: Não selecionado | Estrutura: Todos" contém ambas as palavras, fazendo `headerIdx` apontar para a linha de filtros ao invés da linha 5 (real). Quando isso acontece, nenhum `findCol` encontra as colunas corretas, e todos retornam -1.

## Solução em `src/hooks/useImport.ts`

### 1. Tornar a detecção de cabeçalho mais precisa

Exigir pelo menos 5 colunas conhecidas na mesma linha (não apenas 2 palavras soltas):

```typescript
const knownCols = ["estrutura", "fase", "agrupamento", "tag", "etapa", "status", "valor"];
for (let i = 0; i < Math.min(raw.length, 20); i++) {
  const rowHeaders = (raw[i] || []).map(h => normalizeHeader(str(h)));
  const matches = knownCols.filter(kc => rowHeaders.some(rh => rh === kc));
  if (matches.length >= 5) { headerIdx = i; break; }
}
```

### 2. Adicionar debug de mapeamento nos warnings

Após os `findCol`, adicionar um warning mostrando quais colunas foram encontradas e quais não:

```typescript
const colMap = { cEstrutura, cFase, cSubfase, cAgrup, cTag, cEtapa, cStatus, cValor, cFiscal };
const found = Object.entries(colMap).filter(([,v]) => v >= 0).map(([k,v]) => `${k}=${v}`);
const notFound = Object.entries(colMap).filter(([,v]) => v < 0).map(([k]) => k);
warnings.push(`Colunas mapeadas: ${found.join(", ")}`);
if (notFound.length) warnings.push(`⚠ Colunas NÃO encontradas: ${notFound.join(", ")}`);
```

### 3. Debug da primeira linha de dados

Após processar a primeira linha, logar os valores extraídos:

```typescript
if (rows.length === 1) {
  const r0 = rows[0];
  console.log("[REL_EVENTO] Primeira linha:", { etapa: r0.etapa, status: r0.status, valor: r0.valor, tag: r0.tag, item_ppu: r0.item_ppu });
}
```

## Arquivo Alterado

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImport.ts` | Detecção de cabeçalho com 5+ colunas conhecidas, warnings de debug de mapeamento, log da primeira linha |

