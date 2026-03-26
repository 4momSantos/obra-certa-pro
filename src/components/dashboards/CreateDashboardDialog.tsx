import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  isPending: boolean;
  onCreate: (name: string, template: string) => void;
}

export function CreateDashboardDialog({ isPending, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");

  const handleSubmit = () => {
    const trimmed = name.trim() || "Novo Dashboard";
    onCreate(trimmed, template);
    setName("");
    setTemplate("blank");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="dash-name">Nome</Label>
            <Input
              id="dash-name"
              placeholder="Dashboard Financeiro Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo base</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Em branco</SelectItem>
                <SelectItem value="financeiro">Financeiro — KPIs + Curva S + Waterfall</SelectItem>
                <SelectItem value="efetivo">Efetivo — KPIs ETF + Gráfico de barras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</>
            ) : (
              "Criar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
