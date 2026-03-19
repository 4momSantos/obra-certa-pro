

# Criar Usuários com Roles — dentro da página Admin

## Resumo

Adicionar um formulário de criação de usuários na página `AdminUsers.tsx`, permitindo que o admin crie novos usuários diretamente, escolhendo nome, e-mail, senha e role.

## Abordagem

A criação de usuários via `supabase.auth.signUp()` no client-side tem uma limitação: ela faz login automático com o novo usuário. Para contornar isso, usaremos uma **Edge Function** com o `supabase-admin` (service role) que permite criar usuários sem afetar a sessão do admin logado, e já atribuir a role correta.

## Arquivos

### Criar: `supabase/functions/create-user/index.ts`
- Edge function que recebe `{ email, password, full_name, role }`
- Usa `supabase.auth.admin.createUser()` com service role key
- Após criar o usuário, atualiza o `user_roles` para o role escolhido (substituindo o default `tecnico`)
- Retorna sucesso ou erro
- CORS headers inclusos

### Modificar: `supabase/config.toml`
- Adicionar `[functions.create-user]` com `verify_jwt = false` (validação feita manualmente no código)

### Modificar: `src/pages/AdminUsers.tsx`
- Adicionar botão "Novo Usuário" no header
- Dialog/modal com formulário: nome, e-mail, senha, select de role
- Ao submeter, chama `supabase.functions.invoke("create-user", { body: {...} })`
- Recarrega lista de usuários após sucesso

## Fluxo

```text
Admin clica "Novo Usuário"
  → Modal abre com formulário (nome, email, senha, role)
  → Submit → Edge Function create-user
    → auth.admin.createUser()
    → Trigger cria profile + role tecnico automaticamente
    → Edge function atualiza role se != tecnico
  → Lista atualiza
```

## Segurança
- Edge function valida que o chamador é admin checando o JWT token antes de criar o usuário
- Service role key é usada apenas server-side na edge function

