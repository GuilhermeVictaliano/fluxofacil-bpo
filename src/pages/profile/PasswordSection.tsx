import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmPasswordDialog } from '@/components/ConfirmPasswordDialog';

interface PasswordSectionProps {
  userCnpj: string;
  userId: string;
}

export const PasswordSection = ({ userCnpj, userId }: PasswordSectionProps) => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [actualPassword, setActualPassword] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleShowPassword = () => {
    if (!showPassword && !actualPassword) {
      setShowConfirmDialog(true);
    } else {
      setShowPassword(!showPassword);
      if (!showPassword) {
        setActualPassword(null);
      }
    }
  };

  const handleConfirmPassword = async (password: string) => {
    try {
      const cnpjDigits = (userCnpj || '').replace(/\D/g, '');

      // Primary: boolean RPC that handles bcrypt + legacy MD5 with proper salt
      const { data: isValid, error } = await supabase.rpc('verify_user_password', {
        user_id_input: userId,
        password_input: password,
        cnpj_input: cnpjDigits,
      });

      let valid = Boolean(isValid);
      let rpcError = error as any;

      // Fallback: for environments where verify_user_password might be missing/misconfigured
      if ((!valid && !rpcError) || rpcError) {
        const { data: authData, error: fallbackErr } = await supabase.rpc('authenticate_user', {
          cnpj_input: cnpjDigits,
          password_input: password,
        });
        rpcError = fallbackErr;
        valid = Array.isArray(authData) && authData.length > 0;
      }

      if (rpcError) {
        console.error('Password verification error:', rpcError);
        toast({
          title: 'Erro',
          description: 'Erro ao verificar senha. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      if (!valid) {
        toast({
          title: 'Senha Incorreta',
          description: 'A senha digitada está incorreta.',
          variant: 'destructive',
        });
        return;
      }

      setActualPassword(password);
      setShowPassword(true);
      toast({
        title: 'Senha Verificada',
        description: 'Senha exibida com segurança.',
      });
    } catch (error) {
      console.error('Confirm password error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar a senha.',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      setLoading(true);

      const cnpjDigits = (userCnpj || '').replace(/\D/g, '');

      const { data: updateResult, error } = await supabase.rpc('update_user_password', {
        user_id_input: userId,
        current_password_input: passwordForm.currentPassword,
        new_password_input: passwordForm.newPassword,
        cnpj_input: cnpjDigits
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: "Erro",
          description: "Erro técnico ao alterar senha. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!updateResult) {
        toast({
          title: "Senha Incorreta",
          description: "A senha atual está incorreta.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      // Reset form and states
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      setActualPassword(null);
      setShowPassword(false);

    } catch (error) {
      console.error('Password change error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Gerenciar Senha
          </CardTitle>
          <CardDescription>
            Visualize ou altere sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPassword ? (
            <>
              <div className="space-y-2">
                <Label>Senha Atual</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={showPassword && actualPassword ? actualPassword : "••••••••"}
                      disabled
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={handleShowPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no ícone do olho para visualizar sua senha
                </p>
              </div>
              
              <Button 
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="w-full"
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
                  placeholder="Digite sua senha atual"
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
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Digite a nova senha novamente"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Salvar Nova Senha'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmPasswordDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmPassword}
        title="Verificar Senha"
        description="Digite sua senha atual para visualizá-la com segurança"
      />
    </>
  );
};