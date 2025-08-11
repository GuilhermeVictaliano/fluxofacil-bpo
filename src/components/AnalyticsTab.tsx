import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currencyFormatter';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

// Types aligned with DB
type TransactionType = 'entrada' | 'saida';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  payment_method: 'a_vista' | 'parcelado';
  installments?: number;
  current_installment?: number;
  due_date: string; // YYYY-MM-DD
  category: string;
  status: 'pendente' | 'pago' | 'vencido';
  user_id: string;
  created_at?: string; // ISO
  creation_date?: string; // ISO
}

interface Pattern {
  id: string;
  value: string;
  pattern_type: 'description' | 'category';
  type: TransactionType;
}

type DateField = 'due_date' | 'creation_date';

const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
};

export default function AnalyticsTab() {
  const { user } = useAuth();

  const [typeFilter, setTypeFilter] = useState<'todos' | TransactionType>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todos' | string>('todos');
  const [descriptionFilter, setDescriptionFilter] = useState<'todos' | string>('todos');
  const [dateField, setDateField] = useState<DateField>('due_date');
  const [preset, setPreset] = useState<'30' | '60' | '90' | '120' | 'custom'>('30');
  const [startDate, setStartDate] = useState<string>(() => formatDate(addDays(new Date(), -29)));
  const [endDate, setEndDate] = useState<string>(() => formatDate(new Date()));

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [data, setData] = useState<Array<{ date: string; label: string; entrada: number; saida: number }>>([]);
  const [totals, setTotals] = useState<{ entrada: number; saida: number }>({ entrada: 0, saida: 0 });
  const [loading, setLoading] = useState(false);
  const autoRangeAppliedRef = useRef(false);

  // Load patterns for current user (used as options)
  useEffect(() => {
    const loadPatterns = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setPatterns((data || []) as Pattern[]);
    };
    loadPatterns();
  }, [user]);

  // Quick presets
  const applyPreset = (days: 30 | 60 | 90 | 120) => {
    setPreset(String(days) as any);
    setEndDate(formatDate(new Date()));
    setStartDate(formatDate(addDays(new Date(), -(days - 1))));
  };

  // Auto-apply full range (earliest to latest due_date) on first load when filters are at defaults
  useEffect(() => {
    if (!user || autoRangeAppliedRef.current) return;
    if (!(typeFilter === 'todos' && categoryFilter === 'todos' && descriptionFilter === 'todos')) return;
    const applyRange = async () => {
      try {
        const [minRes, maxRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('due_date')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true })
            .limit(1),
          supabase
            .from('transactions')
            .select('due_date')
            .eq('user_id', user.id)
            .order('due_date', { ascending: false })
            .limit(1),
        ]);
        const minDate = (minRes.data && (minRes.data as any[])[0]?.due_date) as string | null;
        const maxDate = (maxRes.data && (maxRes.data as any[])[0]?.due_date) as string | null;
        if (minDate && maxDate) {
          setStartDate(minDate);
          setEndDate(maxDate);
          setPreset('custom');
        }
      } catch (e) {
        console.error('Erro ao definir intervalo inicial:', e);
      } finally {
        autoRangeAppliedRef.current = true;
      }
    };
    applyRange();
  }, [user, typeFilter, categoryFilter, descriptionFilter]);

  // Fetch and aggregate transactions whenever filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);

        // Type filter
        if (typeFilter !== 'todos') {
          query = query.eq('type', typeFilter);
        }
        // Category filter
        if (categoryFilter !== 'todos') {
          query = query.eq('category', categoryFilter);
        }
        // Description filter
        if (descriptionFilter !== 'todos') {
          query = query.eq('description', descriptionFilter);
        }
        // Date range
        if (startDate) query = query.gte(dateField, startDate);
        if (endDate) query = query.lte(dateField, endDate);

        const { data, error } = await query.order(dateField, { ascending: true });
        if (error) throw error;

        const txs = (data || []) as Transaction[];

        // Aggregate per day
        const map = new Map<string, { entrada: number; saida: number }>();
        // Initialize all days with zero between start and end
        const s = new Date(startDate);
        const e = new Date(endDate);
        for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
          map.set(formatDate(d), { entrada: 0, saida: 0 });
        }

        txs.forEach((t) => {
          const key = dateField === 'due_date'
            ? t.due_date
            : formatDate(new Date(t.creation_date || t.created_at || ''));
          if (!map.has(key)) map.set(key, { entrada: 0, saida: 0 });
          const bucket = map.get(key)!;
          if (t.type === 'entrada') bucket.entrada += Number(t.amount || 0);
          if (t.type === 'saida') bucket.saida += Number(t.amount || 0);
        });

        const result = Array.from(map.entries())
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([date, vals]) => ({
            date,
            label: new Date(date).toLocaleDateString('pt-BR'),
            entrada: vals.entrada,
            saida: vals.saida,
          }));

        setData(result);
        setTotals({
          entrada: txs.filter((t) => t.type === 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0),
          saida: txs.filter((t) => t.type === 'saida').reduce((s, t) => s + Number(t.amount || 0), 0),
        });
      } catch (err) {
        console.error('Erro ao carregar análises:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, typeFilter, categoryFilter, descriptionFilter, startDate, endDate, dateField]);

  const categoryOptions = useMemo(() => {
    const base = patterns.filter((p) => p.pattern_type === 'category');
    if (typeFilter === 'todos') return base; // mostrará todas; validação por tipo ocorre pela origem dos padrões
    return base.filter((p) => p.type === typeFilter);
  }, [patterns, typeFilter]);

  const descriptionOptions = useMemo(() => {
    const base = patterns.filter((p) => p.pattern_type === 'description');
    if (typeFilter === 'todos') return base;
    return base.filter((p) => p.type === typeFilter);
  }, [patterns, typeFilter]);

  // When typeFilter changes, reset other dependent filters to 'todos' to respect category/type rule
  useEffect(() => {
    setCategoryFilter('todos');
    setDescriptionFilter('todos');
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      <Card className="financial-card">
        <CardHeader>
          <CardTitle>Análises</CardTitle>
          <CardDescription>
            Gráfico em linha comparando Entradas e Saídas no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={(v: 'todos' | TransactionType) => setTypeFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoryFilter}
                onValueChange={(v: string) => setCategoryFilter(v as any)}
              >
                <SelectTrigger disabled={typeFilter === "todos"}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {categoryOptions.map((p) => (
                    <SelectItem key={`cat-${p.id}`} value={p.value}>{p.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Select
                value={descriptionFilter}
                onValueChange={(v: string) => setDescriptionFilter(v as any)}
              >
                <SelectTrigger disabled={typeFilter === "todos"}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {descriptionOptions.map((p) => (
                    <SelectItem key={`desc-${p.id}`} value={p.value}>{p.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data base</Label>
              <Select value={dateField} onValueChange={(v: DateField) => setDateField(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Vencimento</SelectItem>
                  <SelectItem value="creation_date">Criação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período rápido</Label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map((d) => (
                  <Button key={d} type="button" variant={preset === String(d) ? 'default' : 'outline'} onClick={() => applyPreset(d as 30 | 60 | 90 | 120)}>
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Data range manual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset('custom');
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset('custom');
                  setEndDate(e.target.value);
                }}
              />
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v as number)}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  labelFormatter={(l) => `Data: ${l}`}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Legend />
                <Line type="monotone" dataKey="entrada" name="Entradas" stroke="hsl(var(--financial-income))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saida" name="Saídas" stroke="hsl(var(--financial-expense))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="metric-card bg-financial-income/10 border-financial-income/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-financial-income">Total Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-financial-income">{formatCurrency(totals.entrada || 0)}</div>
              </CardContent>
            </Card>
            <Card className="metric-card bg-financial-expense/10 border-financial-expense/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-financial-expense">Total Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-financial-expense">{formatCurrency(totals.saida || 0)}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
