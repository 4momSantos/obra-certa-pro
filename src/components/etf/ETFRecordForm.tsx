import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useETF } from '@/contexts/ETFContext';
import type { ETFRecord, ETFCategoria, ETFStatus } from '@/types/etf';
import { CATEGORIAS, STATUS_OPTIONS } from '@/types/etf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ETFRecord | null;
}

export default function ETFRecordForm({ open, onOpenChange, record }: Props) {
  const { addRegistro, updateRegistro, semanaSelecionada } = useETF();
  const isEdit = !!record;

  const [nome, setNome] = useState(record?.nome || '');
  const [categoria, setCategoria] = useState<ETFCategoria>(record?.categoria || 'Operário');
  const [empresa, setEmpresa] = useState(record?.empresa || '');
  const [horas, setHoras] = useState(String(record?.horasTrabalhadas ?? 44));
  const [extras, setExtras] = useState(String(record?.horasExtras ?? 0));
  const [faltas, setFaltas] = useState(String(record?.faltas ?? 0));
  const [status, setStatus] = useState<ETFStatus>(record?.status || 'Ativo');

  const handleSubmit = () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const data = {
      nome: nome.trim(),
      categoria,
      empresa: empresa.trim() || 'Não informada',
      horasTrabalhadas: Number(horas) || 0,
      horasExtras: Number(extras) || 0,
      faltas: Number(faltas) || 0,
      semana: record?.semana || semanaSelecionada,
      status,
    };
    if (isEdit && record) {
      updateRegistro(record.id, data);
      toast.success('Registro atualizado');
    } else {
      addRegistro(data);
      toast.success('Registro adicionado');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Novo'} Registro ETF</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do registro' : 'Adicione um novo colaborador à semana atual'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={v => setCategoria(v as ETFCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ETFStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nome da empresa" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Horas Trab.</Label>
              <Input type="number" value={horas} onChange={e => setHoras(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Horas Extras</Label>
              <Input type="number" value={extras} onChange={e => setExtras(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Faltas</Label>
              <Input type="number" value={faltas} onChange={e => setFaltas(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Salvar' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
