import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EyeIcon } from './EyeIcon';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      
      // Após login bem-sucedido, navegue diretamente para o dashboard.
      // O AuthContext e ProtectedRoute cuidarão do resto.
      navigate('/dashboard');
    } catch (error: any) {
      let userMessage = "Erro ao fazer login. Verifique seu e-mail e senha e tente novamente.";
      if (error?.message?.toLowerCase().includes("invalid login credentials") ||
          error?.message?.toLowerCase().includes("invalid email or password")) {
        userMessage = "E-mail ou senha incorretos. Por favor, tente novamente.";
      }
      toast({
        title: "Não foi possível entrar",
        description: userMessage,
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
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              {/* <span className="mx-1">|</span>
              <a 
                href="#" 
                className="text-blue-500 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/signup');
                }}
              >
                Não tem uma conta? Cadastre-se
              </a> */}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
