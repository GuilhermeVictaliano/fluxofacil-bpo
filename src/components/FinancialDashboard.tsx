
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Trash, ArrowUpDown, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatCurrencyInput, parseCurrencyInput, formatCurrency } from '@/utils/currencyFormatter';
import { PatternsManager } from '@/components/PatternsManager';
import { PatternInput } from '@/components/PatternInput';

type TransactionType = 'entrada' | 'saida';
type PaymentMethod = 'a_vista' | 'parcelado';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  installments?: number;
  current_installment?: number;
  due_date: string;
  category: string;
  status: 'pendente' | 'pago' | 'vencido';
  user_id: string;
  created_at?: string;
  updated_at?: string;
  creation_date?: string;
}

const FinancialDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    amount: '',
    paymentMethod: 'a_vista' as PaymentMethod,
    installments: '2',
    dueDate: '',
    category: ''
  });

  const [chartPeriod, setChartPeriod] = useState<'30' | '90' | '365' | 'all' | 'custom'>('90');
  const [chartCategory, setChartCategory] = useState<string>('todas');
  const [chartType, setChartType] = useState<'ambos' | 'entrada' | 'saida'>('ambos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'creation_date' | 'due_date'>('creation_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar transações:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar transações",
          variant: "destructive",
        });
        return;
      }

      // Update status based on due date
      const today = new Date().toISOString().split('T')[0];
      const updatedData = (data as Transaction[]).map(transaction => ({
        ...transaction,
        status: transaction.due_date <= today && transaction.status === 'pendente' 
          ? 'vencido' as const 
          : transaction.status
      }));

      setTransactions(updatedData || []);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const installmentCount = formData.paymentMethod === 'parcelado' ? parseInt(formData.installments) : 1;
      const amount = parseCurrencyInput(formData.amount);
      
      // Se for parcelado e tem mais de 1 parcela, criar múltiplos registros
      if (installmentCount > 1) {
        const transactions = [];
        const baseDueDate = new Date(formData.dueDate);
        
        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(formData.dueDate + 'T00:00:00');
          dueDate.setMonth(dueDate.getMonth() + i);
          
          transactions.push({
            user_id: user.id,
            type: formData.type,
            description: formData.description,
            amount: amount,
            payment_method: formData.paymentMethod,
            installments: installmentCount,
            current_installment: i + 1,
            due_date: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            category: formData.category,
            status: 'pendente'
          });
        }

        const { error } = await supabase
          .from('transactions')
          .insert(transactions);

        if (error) {
          console.error('Erro ao salvar transações:', error);
          toast({
            title: "Erro",
            description: "Erro ao salvar transações",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Sucesso!",
          description: `${installmentCount} parcelas cadastradas com sucesso`,
        });
      } else {
        // Transação única
        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: formData.type,
            description: formData.description,
            amount: amount,
            payment_method: formData.paymentMethod,
            installments: 1,
            current_installment: 1,
            due_date: formData.dueDate,
            category: formData.category,
            status: 'pendente'
          });

        if (error) {
          console.error('Erro ao salvar transação:', error);
          toast({
            title: "Erro",
            description: "Erro ao salvar transação",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Sucesso!",
          description: "Transação cadastrada com sucesso",
        });
      }

      setFormData({
        type: 'entrada',
        description: '',
        amount: '',
        paymentMethod: 'a_vista',
        installments: '2',
        dueDate: '',
        category: ''
      });

      // Recarregar transações
      loadTransactions();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar transação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmar = window.confirm('Deseja excluir esta transação? Esta ação não pode ser desfeita.');
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir transação:', error);
        toast({ title: 'Erro', description: 'Não foi possível excluir a transação.', variant: 'destructive' });
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Excluído', description: 'Transação excluída com sucesso.' });
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
      toast({ title: 'Erro', description: 'Ocorreu um erro inesperado.', variant: 'destructive' });
    }
  };

  const totalEntradas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  // Get sorted transactions for display
  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      const dateA = sortBy === 'creation_date' 
        ? new Date(a.creation_date || a.created_at || '').getTime()
        : new Date(a.due_date).getTime();
      const dateB = sortBy === 'creation_date'
        ? new Date(b.creation_date || b.created_at || '').getTime()
        : new Date(b.due_date).getTime();
      
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  // Filtros e dados do gráfico
  const categorias = Array.from(new Set(transactions.map((t) => t.category))).sort();

  const getDateRange = () => {
    if (chartPeriod === 'custom' && customStartDate && customEndDate) {
      return {
        start: new Date(customStartDate + 'T00:00:00'),
        end: new Date(customEndDate + 'T23:59:59')
      };
    }
    
    const now = new Date();
    if (chartPeriod === '30') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    }
    if (chartPeriod === '90') {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start, end: now };
    }
    if (chartPeriod === '365') {
      const start = new Date(now);
      start.setDate(start.getDate() - 365);
      return { start, end: now };
    }
    return { start: new Date(0), end: now };
  };

  const filteredForChart = transactions.filter((t) => {
    const { start, end } = getDateRange();
    const d = new Date(t.due_date + 'T00:00:00');
    const categoryOk = chartCategory === 'todas' || t.category === chartCategory;
    const typeOk = chartType === 'ambos' || t.type === chartType;
    return d >= start && d <= end && categoryOk && typeOk;
  });

  const aggregate = new Map<string, { date: string; entrada: number; saida: number }>();
  for (const t of filteredForChart) {
    const key = new Date(t.due_date).toISOString().slice(0, 10);
    if (!aggregate.has(key)) aggregate.set(key, { date: key, entrada: 0, saida: 0 });
    const item = aggregate.get(key)!;
    if (t.type === 'entrada') item.entrada += t.amount;
    else item.saida += t.amount;
  }
  const chartData = Array.from(aggregate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="min-h-screen bg-gradient-to-br from-financial-primary/5 via-background to-financial-neutral/5">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-bold bg-financial-gradient bg-clip-text text-transparent">
            BPO Financeiro
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema de Gestão Financeira para Empresas
          </p>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
          <Card className="metric-card bg-financial-income/10 border-financial-income/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-financial-income">
                Total Entradas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-financial-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-financial-income">
                {formatCurrency(totalEntradas)}
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card bg-financial-expense/10 border-financial-expense/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-financial-expense">
                Total Saídas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-financial-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-financial-expense">
                {formatCurrency(totalSaidas)}
              </div>
            </CardContent>
          </Card>

          <Card className={`metric-card ${saldo >= 0 ? 'bg-financial-income/10 border-financial-income/20' : 'bg-financial-expense/10 border-financial-expense/20'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo Total
              </CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-financial-income' : 'text-financial-expense'}`}>
                {formatCurrency(saldo)}
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card bg-financial-primary/10 border-financial-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-financial-primary-foreground">
                Total Transações
              </CardTitle>
              <FileText className="h-4 w-4 text-financial-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-financial-primary-foreground">
                {transactions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[680px]">
            <TabsTrigger value="cadastro" className="space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nova Transação</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="space-x-2">
              <FileText className="h-4 w-4" />
              <span>Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="analise" className="space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="padroes" className="space-x-2">
              <Settings className="h-4 w-4" />
              <span>Criar Padrões</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-6">
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Cadastrar Nova Transação</CardTitle>
                <CardDescription>
                  Registre entradas e saídas com opção de parcelamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Transação</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">💰 Entrada</SelectItem>
                          <SelectItem value="saida">💸 Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                     <div className="space-y-2">
                       <Label htmlFor="amount">Valor (R$)</Label>
                       <Input
                         id="amount"
                         placeholder="0,00"
                         value={formData.amount}
                         onChange={(e) => {
                           const formatted = formatCurrencyInput(e.target.value);
                           setFormData({ ...formData, amount: formatted });
                         }}
                         required
                       />
                     </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <PatternInput
                      type={formData.type}
                      patternType="description"
                      value={formData.description}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      placeholder="Descreva a transação..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a_vista">À Vista</SelectItem>
                          <SelectItem value="parcelado">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.paymentMethod === 'parcelado' && (
                      <div className="space-y-2">
                        <Label htmlFor="installments">Número de Parcelas</Label>
                        <Input
                          id="installments"
                          type="number"
                          min="2"
                          max="36"
                          value={formData.installments}
                          onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Data de Vencimento</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <PatternInput
                        type={formData.type}
                        patternType="category"
                        value={formData.category}
                        onChange={(value) => setFormData({ ...formData, category: value })}
                        placeholder="Ex: Vendas, Fornecedores, etc."
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full financial-primary hover:opacity-90" disabled={loading}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {loading ? 'Salvando...' : 'Cadastrar Transação'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Todas as transações registradas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros de ordenação */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="sort-by">Ordenar por</Label>
                    <Select value={sortBy} onValueChange={(value: 'creation_date' | 'due_date') => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creation_date">Data de Criação</SelectItem>
                        <SelectItem value="due_date">Data de Vencimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="sort-order">Ordem</Label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Mais recente primeiro</SelectItem>
                        <SelectItem value="asc">Mais antigo primeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma transação cadastrada ainda</p>
                    <p className="text-sm">Cadastre sua primeira transação para começar</p>
                  </div>
                 ) : (
                   <div className="space-y-4">
                     {getSortedTransactions().map((transaction) => (
                      <div key={transaction.id} className="data-table-row p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={transaction.type === 'entrada' ? 'default' : 'destructive'}
                                className={transaction.type === 'entrada' ? 'financial-income' : 'financial-expense'}
                              >
                                {transaction.type === 'entrada' ? '💰 Entrada' : '💸 Saída'}
                              </Badge>
                               <Badge variant="outline">
                                 {transaction.payment_method === 'parcelado' 
                                   ? `${transaction.current_installment}/${transaction.installments}x` 
                                   : 'À Vista'}
                               </Badge>
                            </div>
                            <h3 className="font-medium">{transaction.description}</h3>
                             <p className="text-sm text-muted-foreground">
                               {transaction.category} • Venc: {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                             </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div className={`text-lg font-semibold ${
                              transaction.type === 'entrada' ? 'text-financial-income' : 'text-financial-expense'
                            }`}>
                              {transaction.type === 'entrada' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="mt-1">
                                {transaction.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir transação"
                                title="Excluir transação"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analise" className="space-y-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Gráfico de Entradas x Saídas</CardTitle>
                <CardDescription>Visualize o fluxo financeiro ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {/* Filtros */}
                 <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Período</Label>
                       <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="30">Últimos 30 dias</SelectItem>
                           <SelectItem value="90">Últimos 90 dias</SelectItem>
                           <SelectItem value="365">Últimos 12 meses</SelectItem>
                           <SelectItem value="all">Tudo</SelectItem>
                           <SelectItem value="custom">Período Personalizado</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                       <Label>Categoria</Label>
                       <Select value={chartCategory} onValueChange={(v) => setChartCategory(v)}>
                         <SelectTrigger>
                           <SelectValue placeholder="Todas" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="todas">Todas</SelectItem>
                           {categorias.map((c) => (
                             <SelectItem key={c} value={c}>{c}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                       <Label>Tipo</Label>
                       <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
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
                   </div>

                   {/* Campos de data customizada */}
                   {chartPeriod === 'custom' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                       <div className="space-y-2">
                         <Label>Data Inicial</Label>
                         <Input
                           type="date"
                           value={customStartDate}
                           onChange={(e) => setCustomStartDate(e.target.value)}
                           placeholder="dd/mm/aaaa"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Data Final</Label>
                         <Input
                           type="date"
                           value={customEndDate}
                           onChange={(e) => setCustomEndDate(e.target.value)}
                           placeholder="dd/mm/aaaa"
                         />
                       </div>
                     </div>
                   )}
                 </div>

                {/* Gráfico */}
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sem dados para o período/filters selecionados.</p>
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
                        {(chartType === 'ambos' || chartType === 'entrada') && (
                          <Line type="monotone" dataKey="entrada" name="Entradas" stroke={`hsl(var(--financial-income))`} strokeWidth={2} dot={false} />
                        )}
                        {(chartType === 'ambos' || chartType === 'saida') && (
                          <Line type="monotone" dataKey="saida" name="Saídas" stroke={`hsl(var(--financial-expense))`} strokeWidth={2} dot={false} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="padroes" className="space-y-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Gerenciar Padrões</CardTitle>
                <CardDescription>
                  Crie padrões de descrições e categorias para agilizar o cadastro de transações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatternsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;
