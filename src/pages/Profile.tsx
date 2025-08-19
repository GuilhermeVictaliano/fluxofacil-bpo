import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, User, Calendar, Database, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  cnpj: string;
  company_name: string;
  created_at: string;
  password_hash: string;
}

const Profile = () => {
  const { user, loading } = useAuthGuard();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [lastTransactionDate, setLastTransactionDate] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [actualPassword, setActualPassword] = useState<string | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    
    const loadProfileData = async () => {
      try {
        setDataLoading(true);
        
        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('cnpj, company_name, created_at, password_hash')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfileData(profile);

        // Get transaction count
        const { count, error: countError } = await supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);

        if (countError) throw countError;
        setTransactionCount(count || 0);

        // Get last transaction date
        const { data: lastTransaction, error: lastError } = await supabase
          .from('transactions')
          .select('creation_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!lastError && lastTransaction && lastTransaction.length > 0) {
          const lastDate = lastTransaction[0].creation_date || lastTransaction[0].created_at;
          setLastTransactionDate(lastDate);
        }

      } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil.",
          variant: "destructive",
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadProfileData();
  }, [user, toast]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profileData) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Erro", 
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPasswordLoading(true);

      // Update password directly; function will validate current password internally
      

      // Update password using the new update_user_password function
      const { data: updateResult, error: updateError } = await supabase.rpc('update_user_password', {
        user_id_input: user.id,
        current_password_input: passwordForm.currentPassword,
        new_password_input: passwordForm.newPassword,
        cnpj_input: profileData.cnpj
      });

      if (updateError) throw updateError;

      if (!updateResult) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      // Clear the cached password so it needs to be fetched again
      setActualPassword(null);

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleShowPassword = async () => {
    if (!showPassword && !actualPassword && profileData) {
      // Need to verify password to show it
      setLoadingPassword(true);
      try {
        const currentPassword = prompt('Digite sua senha atual para visualizá-la:');
        if (!currentPassword) {
          setLoadingPassword(false);
          return;
        }

        // Use authenticate_user (same as login) to verify password
        const { data: authData, error } = await supabase.rpc('authenticate_user', {
          cnpj_input: profileData.cnpj,
          password_input: currentPassword
        });

        if (error || !authData || authData.length === 0) {
          toast({
            title: "Erro",
            description: "Senha incorreta.",
            variant: "destructive",
          });
          setLoadingPassword(false);
          return;
        }

        setActualPassword(currentPassword);
        setShowPassword(true);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível verificar a senha.",
          variant: "destructive",
        });
      } finally {
        setLoadingPassword(false);
      }
    } else {
      setShowPassword(!showPassword);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações e configurações</p>
            </div>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Dados da sua conta e estatísticas de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Empresa
                  </Label>
                  <Input value={profileData.company_name} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={profileData.cnpj} disabled />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Conta criada em
                  </Label>
                  <Input 
                    value={new Date(profileData.created_at).toLocaleDateString('pt-BR')} 
                    disabled 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Total de registros
                  </Label>
                  <Input value={transactionCount.toString()} disabled />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Último registro em
                  </Label>
                  <Input 
                    value={lastTransactionDate ? new Date(lastTransactionDate).toLocaleDateString('pt-BR') : 'Nenhum registro encontrado'} 
                    disabled 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <CardTitle>Senha</CardTitle>
              <CardDescription>
                Visualize ou altere sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isChangingPassword ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={showPassword && actualPassword ? actualPassword : "**********"}
                        disabled
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={handleShowPassword}
                        disabled={loadingPassword}
                      >
                        {loadingPassword ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                  >
                    Alterar Senha
                  </Button>
                </>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Senha Atual</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? 'Alterando...' : 'Salvar Nova Senha'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;