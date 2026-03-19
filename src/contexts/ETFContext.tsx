import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ETFRecord, ETFWeekSummary, ETFCategoriaSummary, ETFCategoria } from '@/types/etf';
import { CATEGORIAS } from '@/types/etf';

interface ETFContextType {
  registros: ETFRecord[];
  semanas: string[];
  semanaSelecionada: string;
  setSemana: (s: string) => void;
  addRegistro: (r: Omit<ETFRecord, 'id'>) => void;
  updateRegistro: (id: string, r: Partial<ETFRecord>) => void;
  removeRegistro: (id: string) => void;
  importarRegistros: (records: Omit<ETFRecord, 'id'>[]) => void;
  getWeekSummary: () => ETFWeekSummary;
  filteredRecords: ETFRecord[];
}

const ETFContext = createContext<ETFContextType | null>(null);

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function generateSeedData(): ETFRecord[] {
  const semana = getCurrentWeek();
  const prev = (() => {
    const [y, w] = semana.split('-W').map(Number);
    const pw = w - 1;
    return pw < 1 ? `${y - 1}-W52` : `${y}-W${String(pw).padStart(2, '0')}`;
  })();

  const nomes = [
    { nome: 'Carlos Silva', cat: 'Engenheiro' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Ana Ferreira', cat: 'Engenheiro' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Roberto Lima', cat: 'Técnico' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Marcos Santos', cat: 'Técnico' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Paulo Oliveira', cat: 'Técnico' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'José Almeida', cat: 'Encarregado' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Fernando Costa', cat: 'Encarregado' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'João Pereira', cat: 'Operário' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Antônio Souza', cat: 'Operário' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Pedro Barbosa', cat: 'Operário' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Lucas Martins', cat: 'Operário' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Rafael Gomes', cat: 'Operário' as ETFCategoria, empresa: 'Montagens Beta' },
    { nome: 'Diego Araujo', cat: 'Operário' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Marta Rodrigues', cat: 'Administrativo' as ETFCategoria, empresa: 'Construtora Alpha' },
    { nome: 'Lucia Mendes', cat: 'Administrativo' as ETFCategoria, empresa: 'Montagens Beta' },
  ];

  const records: ETFRecord[] = [];
  for (const sem of [prev, semana]) {
    for (const p of nomes) {
      records.push({
        id: generateId(),
        nome: p.nome,
        categoria: p.cat,
        empresa: p.empresa,
        horasTrabalhadas: 40 + Math.floor(Math.random() * 8),
        horasExtras: Math.floor(Math.random() * 6),
        faltas: Math.random() > 0.85 ? 1 : 0,
        semana: sem,
        status: Math.random() > 0.9 ? 'Afastado' : 'Ativo',
      });
    }
  }
  return records;
}

const STORAGE_KEY = 'etf-registros';

export function ETFProvider({ children }: { children: React.ReactNode }) {
  const [registros, setRegistros] = useState<ETFRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return generateSeedData();
  });

  const [semanaSelecionada, setSemanaSelecionada] = useState(getCurrentWeek());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  }, [registros]);

  const semanas = [...new Set(registros.map(r => r.semana))].sort().reverse();

  const filteredRecords = registros.filter(r => r.semana === semanaSelecionada);

  const addRegistro = useCallback((r: Omit<ETFRecord, 'id'>) => {
    setRegistros(prev => [...prev, { ...r, id: generateId() }]);
  }, []);

  const updateRegistro = useCallback((id: string, data: Partial<ETFRecord>) => {
    setRegistros(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const removeRegistro = useCallback((id: string) => {
    setRegistros(prev => prev.filter(r => r.id !== id));
  }, []);

  const importarRegistros = useCallback((records: Omit<ETFRecord, 'id'>[]) => {
    const newRecords = records.map(r => ({ ...r, id: generateId() }));
    setRegistros(prev => [...prev, ...newRecords]);
  }, []);

  const getWeekSummary = useCallback((): ETFWeekSummary => {
    const week = filteredRecords;
    const porCategoria: ETFCategoriaSummary[] = CATEGORIAS.map(cat => {
      const catRecords = week.filter(r => r.categoria === cat);
      return {
        categoria: cat,
        total: catRecords.length,
        horas: catRecords.reduce((s, r) => s + r.horasTrabalhadas, 0),
        horasExtras: catRecords.reduce((s, r) => s + r.horasExtras, 0),
        faltas: catRecords.reduce((s, r) => s + r.faltas, 0),
      };
    });

    return {
      semana: semanaSelecionada,
      totalEfetivo: week.length,
      totalHoras: week.reduce((s, r) => s + r.horasTrabalhadas, 0),
      totalHorasExtras: week.reduce((s, r) => s + r.horasExtras, 0),
      totalFaltas: week.reduce((s, r) => s + r.faltas, 0),
      porCategoria,
    };
  }, [filteredRecords, semanaSelecionada]);

  return (
    <ETFContext.Provider
      value={{
        registros,
        semanas,
        semanaSelecionada,
        setSemana: setSemanaSelecionada,
        addRegistro,
        updateRegistro,
        removeRegistro,
        importarRegistros,
        getWeekSummary,
        filteredRecords,
      }}
    >
      {children}
    </ETFContext.Provider>
  );
}

export function useETF() {
  const ctx = useContext(ETFContext);
  if (!ctx) throw new Error('useETF must be used within ETFProvider');
  return ctx;
}
