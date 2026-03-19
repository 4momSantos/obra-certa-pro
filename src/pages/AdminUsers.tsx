import { useEffect, useState } from "react";
import { Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  full_name: string | null;
  role: AppRole;
  user_role_id: string;
}

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  gestor: "secondary",
  tecnico: "outline",
};

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  tecnico: "Técnico",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    if (rolesError) {
      toast({ title: "Erro", description: rolesError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (profilesError) {
      toast({ title: "Erro", description: profilesError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const merged: UserWithRole[] = (roles ?? []).map((r) => ({
      id: r.user_id,
      full_name: profileMap.get(r.user_id)?.full_name ?? "—",
      role: r.role,
      user_role_id: r.id,
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userRoleId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userRoleId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role atualizado!" });
      setUsers((prev) =>
        prev.map((u) => (u.user_role_id === userRoleId ? { ...u, role: newRole } : u))
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie roles e permissões dos usuários</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-3" />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead>Alterar Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_role_id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[u.role]}>{roleLabels[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_role_id, v as AppRole)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
