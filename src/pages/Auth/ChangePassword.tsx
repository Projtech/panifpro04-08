import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EyeIcon } from './EyeIcon';

export function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[ChangePassword] Iniciando processo de alteração de senha...');
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[ChangePassword] Atualizando senha no Supabase Auth...');
      
      // 1. Atualizar a senha no Supabase Auth
      const { error: passwordError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (passwordError) {
        console.error('[ChangePassword] Erro ao atualizar senha no Auth:', passwordError);
        throw passwordError;
      }
      
      console.log('[ChangePassword] Senha atualizada no Auth. Atualizando profile...');

      // 2. Atualizar o campo force_password_change no profile
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('Usuário não encontrado após atualização da senha');
      }
      
      console.log('[ChangePassword] Atualizando force_password_change para user:', user.user.id);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ force_password_change: false })
        .eq('user_id', user.user.id);

      if (profileError) {
        console.error('[ChangePassword] Erro ao atualizar profile:', profileError);
        // Não vamos falhar aqui, pois a senha já foi alterada
      } else {
        console.log('[ChangePassword] Profile atualizado com sucesso.');
      }

      console.log('[ChangePassword] Processo concluído. Redirecionando...');
      
      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua senha foi alterada. Redirecionando para o sistema...',
        variant: 'default',
      });

      // 3. Redirecionar imediatamente para evitar problemas de estado
      setTimeout(() => {
        console.log('[ChangePassword] Redirecionando para dashboard...');
        navigate('/dashboard', { replace: true });
      }, 1000);

    } catch (error: any) {
      console.error('[ChangePassword] Erro durante o processo:', error);
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>
            Por motivos de segurança, você deve alterar sua senha antes de continuar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <EyeIcon open={showPassword} className="text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Confirme sua nova senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <EyeIcon open={showConfirmPassword} className="text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Alterando senha...' : 'Alterar senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
