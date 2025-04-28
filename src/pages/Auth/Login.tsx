import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { useEffect } from 'react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se há uma mensagem de erro vinda do AuthContext
    const errorCode = sessionStorage.getItem('loginError');
    if (errorCode === 'no_company_assoc') {
      toast({
        title: "Erro ao fazer login",
        description: "Confirme se está correto o seu email ou entre em contato com o suporte.",
        variant: "destructive",
        duration: 9000,
      });
      sessionStorage.removeItem('loginError');
    }
  }, [toast]);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Verificar se usuário tem empresa associada
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id, role, companies(id, name)')
          .eq('user_id', data.user.id);
          
        if (companyError) throw companyError;
        
        if (!companyData || companyData.length === 0) {
          // Se não tiver empresa, redirecionar para página de seleção/cadastro
          navigate('/select-company');
        } else if (companyData.length === 1) {
          // Se tiver apenas uma empresa, redirecionar para o dashboard
          // Salvar empresa ativa e role no localStorage
          localStorage.setItem('activeCompany', JSON.stringify({
            id: companyData[0].company_id,
            name: companyData[0].companies.name,
            role: companyData[0].role
          }));
          navigate('/dashboard');
        } else {
          // Se tiver múltiplas empresas, redirecionar para seleção
          navigate('/select-company');
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Acesse sua conta para continuar</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="text-sm text-center mt-2">
              <a 
                href="#" 
                className="text-blue-500 hover:underline mr-2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
              >
                Esqueci minha senha
              </a>
              <span className="mx-1">|</span>
              <a 
                href="#" 
                className="text-blue-500 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/signup');
                }}
              >
                Não tem uma conta? Cadastre-se
              </a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
