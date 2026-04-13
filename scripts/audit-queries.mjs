#!/usr/bin/env node
/**
 * AUDIT DE QUERIES — obra-certa-pro
 * ===================================
 * Detecta duplicações de fetch nas camadas de hooks e componentes.
 *
 * Uso:
 *   npm run audit:queries
 *   npm run audit:queries -- --fail-on-violations   (retorna exit 1 se houver violações)
 *   npm run audit:queries -- --json                 (saída em JSON)
 *
 * O que é verificado:
 *  1. Tabelas/views buscadas em múltiplos arquivos diferentes (violação de canônico)
 *  2. Query keys duplicadas (mesmo string em arquivos diferentes)
 *  3. Acessos diretos às tabelas canônicas fora de useSharedData.ts
 *  4. Hooks que usam .from("tabela") mas não importam o hook canônico correspondente
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "..", "src");
const SHARED_DATA_FILE = "useSharedData.ts";

// ─── Tabelas canônicas ────────────────────────────────────────────────────────
// Mapeamento: tabela/view → hook canônico que deve ser a ÚNICA fonte
const CANONICAL_TABLES = {
  "gitec_events":         "useGitecEventsAll",
  "vw_gitec_por_ppu":     "useGitecPorPpu",
  "vw_scon_por_ppu":      "useSconPorPpu",
  "ppu_items":            "usePpuItemsAll",
  "classificacao_ppu":    "useClassificacaoPpuAll",
  "sigem_documents":      "useSigemDocumentsAll",
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "ui") {
      walkDir(fullPath, callback);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      callback(fullPath);
    }
  }
}

function extractFromCalls(content, filePath) {
  const matches = [];
  // Match: .from("table_name") or .from('table_name')
  const regex = /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split("\n").length;
    matches.push({ table: match[1], line, file: filePath });
  }
  return matches;
}

function extractQueryKeys(content, filePath) {
  const matches = [];
  // Match: queryKey: ["key", ...] or queryKey: ["key", "sub", ...]
  const regex = /queryKey\s*:\s*\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split("\n").length;
    // Extract first string element as the primary key
    const keyMatch = match[1].match(/["'`]([^"'`]+)["'`]/);
    if (keyMatch) {
      matches.push({ key: keyMatch[1], full: match[1].trim(), line, file: filePath });
    }
  }
  return matches;
}

function relativePath(fullPath) {
  return path.relative(path.join(__dirname, ".."), fullPath);
}

function isSharedDataFile(filePath) {
  return filePath.endsWith(SHARED_DATA_FILE);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const failOnViolations = process.argv.includes("--fail-on-violations");
const jsonOutput = process.argv.includes("--json");

const allFromCalls = [];     // { table, line, file }
const allQueryKeys = [];     // { key, full, line, file }

walkDir(SRC_DIR, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  allFromCalls.push(...extractFromCalls(content, filePath));
  allQueryKeys.push(...extractQueryKeys(content, filePath));
});

// ─── 1. Acessos às tabelas canônicas fora de useSharedData.ts ─────────────────

const canonicalViolations = [];

for (const [table, canonicalHook] of Object.entries(CANONICAL_TABLES)) {
  const accessesOutsideShared = allFromCalls.filter(
    c => c.table === table && !isSharedDataFile(c.file)
  );

  if (accessesOutsideShared.length > 0) {
    canonicalViolations.push({
      table,
      canonicalHook,
      violations: accessesOutsideShared.map(a => ({
        file: relativePath(a.file),
        line: a.line,
      })),
    });
  }
}

// ─── 2. Tabelas não-canônicas buscadas em múltiplos arquivos ─────────────────

const tableAccessMap = {};
for (const call of allFromCalls) {
  if (CANONICAL_TABLES[call.table]) continue; // já coberto acima
  if (!tableAccessMap[call.table]) tableAccessMap[call.table] = [];
  tableAccessMap[call.table].push(call);
}

const multipleAccessViolations = [];
for (const [table, calls] of Object.entries(tableAccessMap)) {
  const files = [...new Set(calls.map(c => c.file))];
  if (files.length > 1) {
    multipleAccessViolations.push({
      table,
      accessCount: calls.length,
      files: files.map(f => relativePath(f)),
      detail: calls.map(c => ({ file: relativePath(c.file), line: c.line })),
    });
  }
}

// ─── 3. Query keys duplicadas entre arquivos diferentes ──────────────────────

const queryKeyMap = {};
for (const qk of allQueryKeys) {
  if (!queryKeyMap[qk.key]) queryKeyMap[qk.key] = [];
  queryKeyMap[qk.key].push(qk);
}

const duplicateKeyViolations = [];
for (const [key, entries] of Object.entries(queryKeyMap)) {
  const files = [...new Set(entries.map(e => e.file))];
  if (files.length > 1) {
    duplicateKeyViolations.push({
      key,
      files: files.map(f => relativePath(f)),
      detail: entries.map(e => ({ file: relativePath(e.file), line: e.line })),
    });
  }
}

// ─── 4. Sumário de acessos por tabela ────────────────────────────────────────

const tableSummary = {};
for (const call of allFromCalls) {
  if (!tableSummary[call.table]) tableSummary[call.table] = new Set();
  tableSummary[call.table].add(relativePath(call.file));
}

const sortedTableSummary = Object.entries(tableSummary)
  .map(([table, files]) => ({ table, count: files.size, files: [...files].sort() }))
  .sort((a, b) => b.count - a.count);

// ─── Output ──────────────────────────────────────────────────────────────────

if (jsonOutput) {
  console.log(JSON.stringify({
    canonical_violations: canonicalViolations,
    multiple_access_violations: multipleAccessViolations,
    duplicate_key_violations: duplicateKeyViolations,
    table_summary: sortedTableSummary,
  }, null, 2));
  process.exit(failOnViolations && (canonicalViolations.length + multipleAccessViolations.length + duplicateKeyViolations.length) > 0 ? 1 : 0);
}

const BOLD  = "\x1b[1m";
const RED   = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW= "\x1b[33m";
const BLUE  = "\x1b[34m";
const CYAN  = "\x1b[36m";
const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";

const ok  = (s) => `${GREEN}✅ ${s}${RESET}`;
const err = (s) => `${RED}❌ ${s}${RESET}`;
const warn= (s) => `${YELLOW}⚠️  ${s}${RESET}`;
const hdr = (s) => `\n${BOLD}${BLUE}${s}${RESET}`;
const dim = (s) => `${DIM}${s}${RESET}`;

console.log(`${BOLD}${CYAN}
╔══════════════════════════════════════════════════╗
║         AUDIT DE QUERIES — obra-certa-pro        ║
╚══════════════════════════════════════════════════╝${RESET}`);

// ── Sumário de acessos ──
console.log(hdr("📊 TABELAS/VIEWS MAIS ACESSADAS (por nº de arquivos)"));
console.log(dim("─".repeat(70)));
const top = sortedTableSummary.slice(0, 20);
for (const { table, count, files } of top) {
  const isCanonical = !!CANONICAL_TABLES[table];
  const color = count > 2 ? (isCanonical ? YELLOW : RED) : GREEN;
  const tag = isCanonical ? " [canônica]" : count > 2 ? " [POSSÍVEL DUPLICAÇÃO]" : "";
  console.log(`  ${color}${table.padEnd(32)}${RESET} ${BOLD}${count}x${RESET}${dim(tag)}`);
  if (count > 1) {
    for (const f of files) console.log(`    ${dim("└─")} ${f}`);
  }
}

// ── Violações canônicas ──
console.log(hdr("🔴 VIOLAÇÕES — Acesso direto a tabelas canônicas fora de useSharedData.ts"));
console.log(dim("─".repeat(70)));
if (canonicalViolations.length === 0) {
  console.log(`  ${ok("Nenhuma violação encontrada")}`);
} else {
  for (const v of canonicalViolations) {
    console.log(`  ${err(v.table)} → deve usar ${BOLD}${v.canonicalHook}()${RESET} de useSharedData.ts`);
    for (const { file, line } of v.violations) {
      console.log(`    ${dim("└─")} ${file}:${line}`);
    }
  }
}

// ── Múltiplos acessos ──
console.log(hdr("🟡 ATENÇÃO — Tabelas não-canônicas acessadas em múltiplos arquivos"));
console.log(dim("─".repeat(70)));
if (multipleAccessViolations.length === 0) {
  console.log(`  ${ok("Nenhuma duplicação detectada")}`);
} else {
  for (const v of multipleAccessViolations) {
    console.log(`  ${warn(v.table)} (${v.accessCount} acessos em ${v.files.length} arquivos)`);
    for (const { file, line } of v.detail) {
      console.log(`    ${dim("└─")} ${file}:${line}`);
    }
    console.log(dim(`     → Considere adicionar esta tabela em useSharedData.ts`));
  }
}

// ── Query keys duplicadas ──
console.log(hdr("🟡 ATENÇÃO — Query keys duplicadas em arquivos diferentes"));
console.log(dim("─".repeat(70)));
if (duplicateKeyViolations.length === 0) {
  console.log(`  ${ok("Nenhuma key duplicada encontrada")}`);
} else {
  for (const v of duplicateKeyViolations) {
    console.log(`  ${warn(`"${v.key}"`)} usada em ${v.files.length} arquivos:`);
    for (const { file, line } of v.detail) {
      console.log(`    ${dim("└─")} ${file}:${line}`);
    }
  }
}

// ── Resumo ──
const totalViolations = canonicalViolations.length + multipleAccessViolations.length + duplicateKeyViolations.length;
console.log(`\n${BOLD}${"─".repeat(70)}${RESET}`);
if (totalViolations === 0) {
  console.log(ok(`AUDITORIA PASSOU — Nenhuma violação encontrada`));
} else {
  const parts = [];
  if (canonicalViolations.length) parts.push(`${canonicalViolations.length} violação(ões) canônica(s)`);
  if (multipleAccessViolations.length) parts.push(`${multipleAccessViolations.length} tabela(s) com acesso múltiplo`);
  if (duplicateKeyViolations.length) parts.push(`${duplicateKeyViolations.length} query key(s) duplicada(s)`);
  console.log(err(`AUDITORIA DETECTOU PROBLEMAS: ${parts.join(" | ")}`));
  console.log(dim("  Execute as correções indicadas e rode novamente."));
}
console.log();

if (failOnViolations && (canonicalViolations.length + duplicateKeyViolations.length) > 0) {
  process.exit(1);
}
