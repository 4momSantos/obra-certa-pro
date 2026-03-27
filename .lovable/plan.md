

## Diagnóstico

O erro **"infinite recursion detected in policy for relation dashboards"** (HTTP 500) ocorre porque as políticas RLS das tabelas `dashboards` e `dashboard_shares` referenciam-se mutuamente:

- `dashboards` → "Shared users can view" faz `SELECT` em `dashboard_shares`
- `dashboard_shares` → "Owner manages shares" faz `SELECT` em `dashboards`

Isso cria um ciclo infinito quando o Postgres avalia as políticas.

## Solução

Criar uma função `SECURITY DEFINER` que quebra o ciclo, e reescrever as políticas problemáticas para usá-la.

### Migration SQL

1. Criar função `is_dashboard_owner(dashboard_id, user_id)` com `SECURITY DEFINER` (bypassa RLS)
2. Criar função `has_dashboard_share(dashboard_id, user_id)` com `SECURITY DEFINER`
3. Recriar as políticas de `dashboards`, `dashboard_shares` e `dashboard_widgets` usando essas funções em vez de subqueries cruzadas

### Políticas corrigidas

**dashboards:**
- "Owner full access": `auth.uid() = owner_id` (sem mudança)
- "Shared users can view": `has_dashboard_share(id, auth.uid())` (usa função SECURITY DEFINER)

**dashboard_shares:**
- "Owner manages shares": `is_dashboard_owner(dashboard_id, auth.uid())` (usa função SECURITY DEFINER)
- "Shared user sees own share": `auth.uid() = shared_with` (sem mudança)

**dashboard_widgets:**
- "Access via dashboard ownership": `is_dashboard_owner(dashboard_id, auth.uid())`
- "Shared users can view widgets": `has_dashboard_share(dashboard_id, auth.uid())`

### Arquivos alterados
Nenhum arquivo de código precisa ser alterado. Apenas uma migration SQL.

