import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, Lock, User, Phone, MessageCircle } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ cnpj: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    cnpj: '', 
    companyName: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [currentTab, setCurrentTab] = useState('login');
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['login', 'signup', 'reset'].includes(tab)) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // CPF format
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ format
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const validateCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.length === 11 || numbers.length === 14;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCNPJ(loginForm.cnpj)) {
      toast({
        title: "Erro",
        description: "CPF/CNPJ deve ter 11 ou 14 dígitos",
        variant: "destructive",
      });
      return;
    }

    if (loginForm.password.length < 1) {
      toast({
        title: "Erro",
        description: "Digite sua senha",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(
      loginForm.cnpj.replace(/\D/g, ''), 
      loginForm.password
    );
    
    if (error) {
      toast({
        title: "Erro no login",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao sistema",
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCNPJ(signupForm.cnpj)) {
      toast({
        title: "Erro",
        description: "CPF/CNPJ deve ter 11 ou 14 dígitos",
        variant: "destructive",
      });
      return;
    }

    if (!signupForm.companyName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "Senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(
      signupForm.cnpj.replace(/\D/g, ''),
      signupForm.companyName.trim(),
      signupForm.password
    );
    
    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer login",
      });
      setCurrentTab('login');
      setLoginForm({
        cnpj: signupForm.cnpj,
        password: ''
      });
    }
    
    setIsLoading(false);
  };

  const handleContactRequest = () => {
    toast({
      title: "Contato copiado",
      description: "Entre em contato para recuperar sua senha",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">BPO Financeiro</CardTitle>
          <CardDescription>
            Sistema de gestão financeira empresarial
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="reset">Recuperar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-cnpj">CPF/CNPJ</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-cnpj"
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      value={loginForm.cnpj}
                      onChange={(e) => setLoginForm({
                        ...loginForm, 
                        cnpj: formatCNPJ(e.target.value)
                      })}
                      className="pl-10"
                      maxLength={18}
                      required
                    />
                  </div>
                </div>
               
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({
                        ...loginForm, 
                        password: e.target.value
                      })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
               
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
               
                <div className="text-center">
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground"
                    onClick={() => setCurrentTab('reset')}
                    type="button"
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-cnpj">CPF/CNPJ</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-cnpj"
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      value={signupForm.cnpj}
                      onChange={(e) => setSignupForm({
                        ...signupForm, 
                        cnpj: formatCNPJ(e.target.value)
                      })}
                      className="pl-10"
                      maxLength={18}
                      required
                    />
                  </div>
                </div>
               
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-name"
                      placeholder="Razão social ou nome fantasia"
                      value={signupForm.companyName}
                      onChange={(e) => setSignupForm({
                        ...signupForm, 
                        companyName: e.target.value
                      })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
               
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({
                        ...signupForm, 
                        password: e.target.value
                      })}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
               
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({
                        ...signupForm, 
                        confirmPassword: e.target.value
                      })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
               
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="reset">
              <div className="space-y-6">
                <div className="text-center">
                  <Lock className="mx-auto h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Recuperar Senha</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Entre em contato conosco para resetar sua senha
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">E-mail</p>
                        <p className="text-sm text-muted-foreground">guilhermesint.gerencia@gmail.com</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">(15) 996649167</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleContactRequest} 
                    className="w-full"
                    variant="outline"
                  >
                    Solicitar Reset de Senha
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground"
                    onClick={() => setCurrentTab('login')}
                    type="button"
                  >
                    Voltar ao login
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;