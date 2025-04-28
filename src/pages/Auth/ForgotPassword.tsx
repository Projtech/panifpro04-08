import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar e-mail',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Informe seu e-mail para receber o link de redefinição de senha.</CardDescription>
        </CardHeader>
        <form onSubmit={handleForgotPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading || sent}>
              {loading ? 'Enviando...' : sent ? 'E-mail enviado!' : 'Enviar link'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
