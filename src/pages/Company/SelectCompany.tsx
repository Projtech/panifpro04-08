import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  role: string;
}

export function SelectCompany() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar empresas do usuário
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        const { data, error } = await supabase
          .from('company_users')
          .select('company_id, role, companies(id, name)')
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        if (data) {
          setCompanies(data.map(item => ({
            id: item.company_id,
            name: item.companies.name,
            role: item.role
          })));
        }
      } catch (error: any) {
        toast({
          title: "Erro ao carregar empresas",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadCompanies();
  }, [navigate, toast]);

  // Selecionar empresa
  const selectCompany = (company: Company) => {
    localStorage.setItem('activeCompany', JSON.stringify(company));
    navigate('/dashboard');
  };

  // Criar nova empresa
  const createCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Por favor, informe um nome para a empresa.",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    
    try {
      // 1. Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");
      
      // 2. Inserir nova empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({ name: newCompanyName })
        .select('id')
        .single();
        
      if (companyError) throw companyError;
      
      // 3. Associar usuário à empresa como admin
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          user_id: user.id,
          company_id: companyData.id,
          role: 'admin',
          status: 'active'
        });
        
      if (userError) throw userError;
      
      toast({
        title: "Empresa criada com sucesso!",
        description: `A empresa "${newCompanyName}" foi criada e você é o administrador.`
      });
      
      // 4. Adicionar à lista e ativar
      const newCompany = {
        id: companyData.id,
        name: newCompanyName,
        role: 'admin'
      };
      
      setCompanies([...companies, newCompany]);
      selectCompany(newCompany);
      
      setShowDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Selecione uma empresa</CardTitle>
          <CardDescription>
            Escolha uma empresa para acessar ou crie uma nova
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando empresas...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">Você não está associado a nenhuma empresa.</p>
              <Button onClick={() => setShowDialog(true)}>
                Criar Nova Empresa
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {companies.map(company => (
                <div 
                  key={company.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectCompany(company)}
                >
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-gray-500">
                      {company.role === 'admin' ? 'Administrador' : 'Usuário'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Selecionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => setShowDialog(true)}>
            Criar Nova Empresa
          </Button>
        </CardFooter>
      </Card>

      {/* Dialog para criar nova empresa */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Empresa</DialogTitle>
            <DialogDescription>
              Insira os dados para criar sua empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Minha Padaria"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createCompany} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
