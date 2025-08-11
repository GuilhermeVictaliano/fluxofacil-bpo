import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/utils/currencyFormatter';

export type TransactionForChart = {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  category: string;
  created_at?: string; // ISO string
  creation_date?: string; // optional legacy
};

function formatYMDLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ChartAnalyticsProps {
  transactions: TransactionForChart[];
}

const ChartAnalytics: React.FC<ChartAnalyticsProps> = ({ transactions }) => {
  const [period, setPeriod] = useState<'30' | '60' | '90' | '120' | 'custom'>('90');
  const [dateField, setDateField] = useState<'due_date' | 'created_at'>('due_date');
  const [typeFilter, setTypeFilter] = useState<'ambos' | 'entrada' | 'saida'>('ambos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('todas');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Base list respecting type only (for dependent filters)
  const baseByType = useMemo(() => {
    return transactions.filter(t => typeFilter === 'ambos' || t.type === typeFilter);
  }, [transactions, typeFilter]);

  const categories = useMemo(() => {
    return Array.from(new Set(baseByType.map(t => t.category).filter(Boolean))).sort();
  }, [baseByType]);

  const descriptions = useMemo(() => {
    const scoped = categoryFilter === 'todas' ? baseByType : baseByType.filter(t => t.category === categoryFilter);
    return Array.from(new Set(scoped.map(t => t.description).filter(Boolean))).sort();
  }, [baseByType, categoryFilter]);

  const getDateRange = useMemo(() => {
    const now = new Date();
    if (period === 'custom' && customStartDate && customEndDate) {
      return {
        start: new Date(customStartDate + 'T00:00:00'),
        end: new Date(customEndDate + 'T23:59:59'),
      };
    }
    const map: Record<'30' | '60' | '90' | '120', number> = { '30': 30, '60': 60, '90': 90, '120': 120 };
    const days = map[period as '30' | '60' | '90' | '120'] ?? 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start, end: now };
  }, [period, customStartDate, customEndDate]);

  function getTxnDate(t: TransactionForChart): Date | null {
    if (dateField === 'due_date') {
      if (!t.due_date) return null;
      return new Date(t.due_date + 'T00:00:00');
    }
    const raw = t.created_at || t.creation_date;
    if (!raw) return null;
    return new Date(raw);
  }

  const chartData = useMemo(() => {
    const { start, end } = getDateRange;

    const filtered = baseByType
      .filter(t => (categoryFilter === 'todas' ? true : t.category === categoryFilter))
      .filter(t => (descriptionFilter === 'todas' ? true : t.description === descriptionFilter))
      .filter(t => {
        const d = getTxnDate(t);
        return d && d >= start && d <= end;
      });

    const agg = new Map<string, { date: string; entrada: number; saida: number }>();

    for (const t of filtered) {
      const dObj = getTxnDate(t);
      if (!dObj) continue;
      const key = dateField === 'due_date' ? t.due_date : formatYMDLocal(dObj);
      if (!agg.has(key)) agg.set(key, { date: key, entrada: 0, saida: 0 });
      const item = agg.get(key)!;
      if (t.type === 'entrada') item.entrada += t.amount;
      else item.saida += t.amount;
    }

    return Array.from(agg.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [baseByType, categoryFilter, descriptionFilter, getDateRange, dateField]);

  // Reset dependent filters when parent changes
  React.useEffect(() => {
    setCategoryFilter('todas');
    setDescriptionFilter('todas');
  }, [typeFilter]);

  React.useEffect(() => {
    setDescriptionFilter('todas');
  }, [categoryFilter]);

  return (
    <Card className="financial-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gráfico de Entradas x Saídas</CardTitle>
            <CardDescription>Compare o fluxo financeiro por período e filtros</CardDescription>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Campo de Data</Label>
              <Select value={dateField} onValueChange={(v) => setDateField(v as 'due_date' | 'created_at')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Vencimento</SelectItem>
                  <SelectItem value="created_at">Criação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="120">Últimos 120 dias</SelectItem>
                  <SelectItem value="custom">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ambos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Ambos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Select value={descriptionFilter} onValueChange={(v) => setDescriptionFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {descriptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Gráfico */}
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sem dados para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')} />
                <YAxis />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} labelFormatter={(l) => new Date(l).toLocaleDateString('pt-BR')} />
                <Legend />
                {(typeFilter === 'ambos' || typeFilter === 'entrada') && (
                  <Line type="monotone" dataKey="entrada" name="Entradas" stroke={`hsl(var(--financial-income))`} strokeWidth={2} dot={false} />
                )}
                {(typeFilter === 'ambos' || typeFilter === 'saida') && (
                  <Line type="monotone" dataKey="saida" name="Saídas" stroke={`hsl(var(--financial-expense))`} strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartAnalytics;
