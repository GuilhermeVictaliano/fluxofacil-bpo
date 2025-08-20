import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Calendar, Database, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasswordSection } from './profile/PasswordSection';

interface ProfileData {
  cnpj: string;
  company_name: string;
  created_at: string;
}

const Profile = () => {
  const { user, loading } = useAuthGuard();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [lastTransactionDate, setLastTransactionDate] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadProfileData = async () => {
      try {
        setDataLoading(true);
        
        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('cnpj, company_name, created_at')
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
        console.error('Profile data load error:', error);
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
              <h1 className="text-3xl font-bold">Meu Perfil</h1>
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
                    Nome da Empresa
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
          <PasswordSection 
            userCnpj={profileData.cnpj} 
            userId={user!.id} 
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;