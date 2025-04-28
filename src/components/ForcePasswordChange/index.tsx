import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

export function ForcePasswordChange({ onPasswordChanged }: ForcePasswordChangeProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem. Por favor, tente novamente.",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve conter no mínimo 8 caracteres.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Atualizar senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password
      });
      
      if (authError) throw authError;
      
      // Atualizar flag no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ force_password_change: false })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
        
      if (profileError) throw profileError;

      // Forçar recarregamento do perfil para garantir que a flag foi atualizada
      await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      
      toast({
        title: "Senha alterada com sucesso",
        description: "Agora você pode acessar o sistema normalmente."
      });
      
      onPasswordChanged();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Troca de senha obrigatória</CardTitle>
          <CardDescription>
            Por motivos de segurança, você precisa criar uma nova senha para continuar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500">
                A senha deve conter no mínimo 8 caracteres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Alterando senha...' : 'Alterar senha e continuar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
