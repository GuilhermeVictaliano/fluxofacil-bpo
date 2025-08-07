
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';

type TransactionType = 'entrada' | 'saida';
type PaymentMethod = 'a_vista' | 'parcelado';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments?: number;
  currentInstallment?: number;
  dueDate: string;
  category: string;
  status: 'pendente' | 'pago' | 'vencido';
}

const FinancialDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    amount: '',
    paymentMethod: 'a_vista' as PaymentMethod,
    installments: '1',
    dueDate: '',
    category: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      installments: formData.paymentMethod === 'parcelado' ? parseInt(formData.installments) : 1,
      currentInstallment: 1,
      dueDate: formData.dueDate,
      category: formData.category,
      status: 'pendente'
    };
    
    setTransactions([...transactions, newTransaction]);
    setFormData({
      type: 'entrada',
      description: '',
      amount: '',
      paymentMethod: 'a_vista',
      installments: '1',
      dueDate: '',
      category: ''
    });
  };

  const totalEntradas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="cadastro" className="space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nova Transação</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="space-x-2">
              <FileText className="h-4 w-4" />
              <span>Histórico</span>
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
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="Descreva a transação..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
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
                      <Input
                        id="category"
                        placeholder="Ex: Vendas, Fornecedores, etc."
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full financial-primary hover:opacity-90">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Cadastrar Transação
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
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma transação cadastrada ainda</p>
                    <p className="text-sm">Cadastre sua primeira transação para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
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
                                {transaction.paymentMethod === 'parcelado' 
                                  ? `${transaction.currentInstallment}/${transaction.installments}x` 
                                  : 'À Vista'}
                              </Badge>
                            </div>
                            <h3 className="font-medium">{transaction.description}</h3>
                            <p className="text-sm text-muted-foreground">
                              {transaction.category} • Venc: {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${
                              transaction.type === 'entrada' ? 'text-financial-income' : 'text-financial-expense'
                            }`}>
                              {transaction.type === 'entrada' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;
