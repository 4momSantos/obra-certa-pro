import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ETFCategoriaSummary } from '@/types/etf';

const COLORS = [
  'hsl(224, 76%, 48%)',
  'hsl(40, 55%, 55%)',
  'hsl(160, 60%, 40%)',
  'hsl(280, 60%, 50%)',
  'hsl(0, 70%, 55%)',
];

interface Props {
  data: ETFCategoriaSummary[];
}

export default function ETFCategoryChart({ data }: Props) {
  const chartData = data.map(d => ({
    name: d.categoria,
    efetivo: d.total,
    horas: d.horas,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 87%)" opacity={0.4} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
        <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(222, 40%, 10%)',
            border: '1px solid hsl(222, 20%, 18%)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'hsl(210, 20%, 92%)',
          }}
        />
        <Bar dataKey="efetivo" radius={[6, 6, 0, 0]} name="Efetivo">
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
