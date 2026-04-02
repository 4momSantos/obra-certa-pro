# Modulo Autenticacao e Admin de Usuarios

---

## 1. Visao Geral

O modulo de autenticacao gerencia todo o ciclo de acesso ao sistema: login, cadastro, controle de roles, protecao de rotas e modo offline. Utiliza Supabase Auth como backend, com fallback automatico quando o servico esta inacessivel.

**Rotas:** `/auth` (login/cadastro), `/admin` (gestao de usuarios)  
**Arquivos:**
- `src/contexts/AuthContext.tsx` (145 linhas) — Provider de autenticacao
- `src/pages/Auth.tsx` (143 linhas) — Pagina de login/cadastro
- `src/pages/AdminUsers.tsx` (253 linhas) — Painel admin de usuarios
- `src/components/ProtectedRoute.tsx` (38 linhas) — Protecao de rotas
- `src/integrations/supabase/client.ts` — Cliente Supabase
- `src/integrations/supabase/types.ts` — Tipos auto-gerados
- `supabase/functions/create-user/index.ts` — Edge Function de criacao

---

## 2. AuthContext (Provider)

**Arquivo:** `src/contexts/AuthContext.tsx`

### 2.1 Estado

```typescript
interface AuthContextType {
  user: User | null;                // Supabase User object
  session: Session | null;          // Supabase Session
  profile: Profile | null;          // { id, full_name, avatar_url }
  role: AppRole | null;             // "admin" | "gestor" | "tecnico"
  loading: boolean;                 // Carregando estado inicial
  connectionError: boolean;         // Supabase inacessivel
  signIn: (email, password) => Promise<{ error }>;
  signUp: (email, password, fullName) => Promise<{ error }>;
  signOut: () => Promise<void>;
}
```

### 2.2 Fluxo de Inicializacao

```
1. AuthProvider monta
2. Inicia timeout de 5 segundos
3. Registra listener onAuthStateChange
4. Chama supabase.auth.getSession()
5.
   ┌─ Se getSession() resolve antes de 5s:
   │   ├─ Com sessao → setUser, fetchProfileAndRole → loading=false
   │   └─ Sem sessao → loading=false
   │
   └─ Se 5s passam sem resposta:
       └─ setConnectionError(true) → setLoading(false) → modo offline
```

### 2.3 Timeout de Conectividade

```typescript
timeout = setTimeout(() => {
  if (loading) {
    setConnectionError(true);
    setLoading(false);
  }
}, 5000);
```

O timeout e limpo se `getSession()` ou `onAuthStateChange` respondem antes de 5s.

### 2.4 Fetch de Profile e Role

Ao obter um usuario autenticado, busca em paralelo:
1. **Profile:** `supabase.from("profiles").select(...).eq("id", userId)`
2. **Role:** `supabase.rpc("get_user_role", { _user_id: userId })`

Ambos em `Promise.all`, com try/catch silencioso em caso de falha.

### 2.5 Sign In

```typescript
const signIn = async (email, password) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  } catch (err) {
    return { error: err };
  }
};
```

### 2.6 Sign Up

```typescript
const signUp = async (email, password, fullName) => {
  try {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  } catch (err) {
    return { error: err };
  }
};
```

- Envia `full_name` nos metadados do usuario
- Redireciona para origem apos confirmacao de email

### 2.7 Sign Out

```typescript
const signOut = async () => {
  try { await supabase.auth.signOut(); } catch {}
  setProfile(null);
  setRole(null);
};
```

Limpa profile e role mesmo se Supabase falhar.

---

## 3. Pagina de Login/Cadastro

**Arquivo:** `src/pages/Auth.tsx`

### 3.1 Fluxo de Redirecionamento

```
Auth.tsx monta
  │
  ├─ loading=true e sem connectionError → Spinner
  ├─ connectionError=true → Redireciona para /dashboard (modo offline)
  ├─ user existe → Redireciona para /dashboard
  └─ Nenhum dos acima → Exibe formularios
```

### 3.2 Layout

```
┌──────────────────────────────────────┐
│           [icone Building2]          │
│              SPLAN                   │
│          RNEST UDA U-12              │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  [Entrar]   [Cadastrar]     │    │
│  │                              │    │
│  │  E-mail: _______________     │    │
│  │  Senha:  _______________     │    │
│  │                              │    │
│  │        [Entrar]              │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 3.3 LoginForm

- Campos: email, senha
- Validacao: ambos obrigatorios (HTML required)
- Feedback: Toast de erro com mensagem do Supabase
- Loading state: "Entrando..." durante requisicao

### 3.4 SignupForm

- Campos: nome completo, email, senha (minimo 6 caracteres)
- Feedback: Toast de sucesso ("Verifique seu e-mail para confirmar")
- Nota no rodape: "Voce sera cadastrado como Tecnico. Um admin pode alterar seu perfil depois."
- Loading state: "Cadastrando..." durante requisicao

---

## 4. ProtectedRoute

**Arquivo:** `src/components/ProtectedRoute.tsx`

### 4.1 Interface

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];   // Opcional: restringir por role
}
```

### 4.2 Logica de Protecao

```
ProtectedRoute recebe request
  │
  ├─ connectionError=true → Renderiza children (modo offline)
  ├─ loading=true → Spinner de carregamento
  ├─ user=null → Redireciona para /auth
  ├─ allowedRoles definido e role nao permitido → Redireciona para /dashboard
  └─ Caso contrario → Renderiza children
```

### 4.3 Uso no Roteamento

```typescript
// Protecao basica (qualquer usuario autenticado)
<ProtectedRoute>
  <Layout>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </Layout>
</ProtectedRoute>

// Protecao por role (apenas admin)
<Route path="/admin" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <AdminUsers />
  </ProtectedRoute>
} />
```

---

## 5. Modo Offline

Quando o Supabase esta inacessivel (timeout de 5s):

1. **AuthContext:** `connectionError=true`, `loading=false`
2. **Auth.tsx:** Redireciona para `/dashboard` automaticamente
3. **ProtectedRoute:** Permite acesso direto sem verificar autenticacao
4. **Resultado:** Todas as funcionalidades locais continuam funcionando

**Dados afetados:**
- Cronograma: Funciona normalmente (localStorage)
- Dashboard: Funciona normalmente (dados do CronogramaContext)
- ETF: Funciona normalmente (processamento local)
- AdminUsers: Nao funciona (requer Supabase)

---

## 6. Sistema de Roles

### 6.1 Roles Disponiveis

| Role | Descricao | Acesso |
|------|-----------|--------|
| `admin` | Administrador | Todas as rotas + `/admin` |
| `gestor` | Gestor de projeto | Todas as rotas exceto `/admin` |
| `tecnico` | Tecnico | Todas as rotas exceto `/admin` |

### 6.2 Tipo no Banco

```sql
CREATE TYPE app_role AS ENUM ('admin', 'gestor', 'tecnico');
```

### 6.3 Funcoes RPC

| Funcao | Parametros | Retorno | Descricao |
|--------|-----------|---------|-----------|
| `get_user_role` | `_user_id uuid` | `app_role` | Retorna role do usuario |
| `has_role` | `_user_id uuid, _role app_role` | `boolean` | Verifica se usuario tem role |

---

## 7. Admin de Usuarios

**Arquivo:** `src/pages/AdminUsers.tsx`

**Acesso:** Apenas role `admin` (protegido por `ProtectedRoute`)

### 7.1 Layout

```
┌──────────────────────────────────────────────┐
│  [icone Shield]                              │
│  Gestao de Usuarios           [Novo Usuario] │
│  Gerencie roles e permissoes                 │
├──────────────────────────────────────────────┤
│  Nome          │ Role Atual │ Alterar Role   │
│  Joao Silva    │ [Admin]    │ [Select: ▼]    │
│  Maria Souza   │ [Tecnico]  │ [Select: ▼]    │
│  Pedro Santos  │ [Gestor]   │ [Select: ▼]    │
└──────────────────────────────────────────────┘
```

### 7.2 Listagem de Usuarios

Ao montar, busca em paralelo:
1. `supabase.from("user_roles").select("id, user_id, role")`
2. `supabase.from("profiles").select("id, full_name")`

Cruza os dados por `user_id` para exibir nome + role.

### 7.3 Alteracao de Role

- Select inline na tabela com opcoes: Admin, Gestor, Tecnico
- `supabase.from("user_roles").update({ role }).eq("id", userRoleId)`
- Atualiza estado local imediatamente (optimistic update)
- Toast de feedback

### 7.4 Criacao de Usuario

Dialog modal com campos:
- Nome completo (obrigatorio)
- E-mail (obrigatorio)
- Senha (obrigatorio, minimo 6 caracteres)
- Role (select: admin/gestor/tecnico)

Criacao via Edge Function:
```typescript
supabase.functions.invoke("create-user", {
  body: { email, password, full_name, role }
});
```

Apos criacao: fecha dialog, reseta formulario, refaz fetch de usuarios.

### 7.5 Edge Function: create-user

**Arquivo:** `supabase/functions/create-user/index.ts`

- Usa Supabase Admin API para criar usuario
- Atribui role na tabela `user_roles`
- Cria profile na tabela `profiles`
- Retorna erro se email ja existe

---

## 8. Banco de Dados

### 8.1 Tabela: profiles

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | `uuid` | PK, referencia `auth.users(id)` |
| `full_name` | `text` | Nome completo |
| `avatar_url` | `text` | URL do avatar |
| `created_at` | `timestamptz` | Data de criacao |
| `updated_at` | `timestamptz` | Ultima atualizacao |

### 8.2 Tabela: user_roles

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users(id)` |
| `role` | `app_role` | ENUM: admin/gestor/tecnico |

---

## 9. Badges de Role

| Role | Variante | Visual |
|------|----------|--------|
| Admin | `default` | Fundo solido escuro |
| Gestor | `secondary` | Fundo cinza |
| Tecnico | `outline` | Apenas borda |

---

## 10. Dependencias do Modulo

| Pacote | Uso |
|--------|-----|
| `@supabase/supabase-js` | Auth, DB queries, Edge Functions |
| `lucide-react` | Icones (Building2, LogIn, UserPlus, Shield, Users, Plus, Loader2) |
| Shadcn/UI | Tabs, Input, Label, Button, Badge, Table, Select, Dialog |
| `use-toast` hook | Feedback de erro/sucesso |
