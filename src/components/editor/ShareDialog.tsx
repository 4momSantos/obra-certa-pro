import { useState } from "react";
import { Loader2, X, UserPlus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useDashboardShares,
  useShareDashboard,
  useUpdateSharePermission,
  useRemoveShare,
  useFindUserByEmail,
} from "@/hooks/useDashboardSharing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
  ownerId: string;
}

export function ShareDialog({ open, onOpenChange, dashboardId, dashboardName, ownerId }: Props) {
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle");

  const { data: shares = [] } = useDashboardShares(dashboardId);
  const shareMut = useShareDashboard();
  const updatePermMut = useUpdateSharePermission();
  const removeMut = useRemoveShare();
  const findUserMut = useFindUserByEmail();

  const handleSearch = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setSearchStatus("searching");
    try {
      const result = await findUserMut.mutateAsync(trimmed);
      if (result.user) {
        // Check if already shared or is owner
        if (result.user.id === ownerId) {
          setSearchStatus("not_found");
          setSearchResult(null);
          return;
        }
        if (shares.some((s) => s.shared_with === result.user!.id)) {
          setSearchStatus("not_found");
          setSearchResult(null);
          return;
        }
        setSearchResult(result.user);
        setSearchStatus("found");
      } else {
        setSearchResult(null);
        setSearchStatus("not_found");
      }
    } catch {
      setSearchStatus("not_found");
      setSearchResult(null);
    }
  };

  const handleAdd = (permission: string) => {
    if (!searchResult) return;
    shareMut.mutate(
      { dashboardId, userId: searchResult.id, permission },
      {
        onSuccess: () => {
          setEmail("");
          setSearchResult(null);
          setSearchStatus("idle");
        },
      },
    );
  };

  const initials = (name: string | null | undefined, fallback?: string) => {
    if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    return "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar "{dashboardName}"</DialogTitle>
        </DialogHeader>

        {/* Search user */}
        <div className="space-y-2">
          <Label>Adicionar pessoa</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Email do usuário..."
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSearchStatus("idle"); setSearchResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              size="sm"
              className="gap-1 shrink-0"
              onClick={handleSearch}
              disabled={!email.trim() || searchStatus === "searching"}
            >
              {searchStatus === "searching" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchStatus === "not_found" && (
            <p className="text-xs text-destructive">Nenhum usuário encontrado com este email</p>
          )}

          {searchStatus === "found" && searchResult && (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initials(searchResult.full_name, searchResult.email)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{searchResult.full_name ?? searchResult.email}</p>
                <p className="text-xs text-muted-foreground truncate">{searchResult.email}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleAdd("view")} disabled={shareMut.isPending}>
                {shareMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pode ver"}
              </Button>
              <Button size="sm" onClick={() => handleAdd("edit")} disabled={shareMut.isPending}>
                {shareMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pode editar"}
              </Button>
            </div>
          )}
        </div>

        {/* Current shares */}
        <div className="space-y-2 mt-2">
          <Label>Pessoas com acesso</Label>
          <div className="space-y-1.5">
            {/* Owner (always shown) */}
            <div className="flex items-center gap-2 p-2 rounded-md">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary"><Crown className="h-3 w-3" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Dono (você)</p>
              </div>
              <span className="text-xs text-muted-foreground">Proprietário</span>
            </div>

            {shares.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Apenas você tem acesso</p>
            )}

            {shares.map((share) => (
              <div key={share.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">
                    {initials(share.user_name, share.user_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{share.user_name ?? share.user_email ?? share.shared_with}</p>
                </div>
                <Select
                  value={share.permission}
                  onValueChange={(v) =>
                    updatePermMut.mutate({ shareId: share.id, dashboardId, permission: v })
                  }
                >
                  <SelectTrigger className="h-7 w-[110px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Pode ver</SelectItem>
                    <SelectItem value="edit">Pode editar</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMut.mutate({ shareId: share.id, dashboardId })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
