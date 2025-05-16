import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileInsert } from '@/types/profiles';
import { createUserWithProfile } from '@/services/userService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface UserProfile {
  full_name?: string | null;
  force_password_change?: boolean | null;
}

interface User {
  user_id: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  profiles?: UserProfile | null;
  display_name?: string | null;
}

interface CompanyUserDetailsViewRow {
  user_id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  profile_full_name: string | null;
  display_name: string | null;
  force_password_change: boolean | null;
  company_id: string;
}

interface NewUserFormData {
  email: string;
  name: string;
  role: string;
  forcePasswordChange: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newUser, setNewUser] = useState<NewUserFormData>({
    email: '',
    name: '',
    role: 'user',
    forcePasswordChange: true,
  });
  const { toast } = useToast();
  const { activeCompany } = useAuth();
  const defaultPassword = 'Mudar@123';

  const loadUsers = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      console.log('Carregando usuários para empresa:', activeCompany.id, 'com status active'); // DEBUG
      const { data, error } = await (supabase.from as any)('company_user_details_view')
        .select('user_id, role, status, email, display_name, profile_full_name, force_password_change')
        .eq('company_id', activeCompany.id)
        .eq('status', 'active');

      console.log('Usuários carregados:', data, 'Erro:', error); // DEBUG

      if (error) throw error;

      if (data) {
        const mappedUsers = (data as CompanyUserDetailsViewRow[]).map((viewUser) => {
          return {
            user_id: viewUser.user_id,
            email: viewUser.email,
            role: viewUser.role,
            status: viewUser.status,
            display_name: viewUser.display_name,
            profiles: {
              full_name: viewUser.profile_full_name,
              force_password_change: viewUser.force_password_change,
            },
          } as User;
        });
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompany, supabase, toast]);

  useEffect(() => {
    if (activeCompany) {
      loadUsers();
    }
  }, [activeCompany, loadUsers]);

  const handleCreateUser = async () => {
    if (!activeCompany) {
      toast({ title: "Erro", description: "Nenhuma empresa ativa selecionada.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Usando a nova função que cria usuário, perfil e associação à empresa em uma única operação
      const { data, error } = await createUserWithProfile({
        email: newUser.email,
        password: defaultPassword,
        fullName: newUser.name,
        companyId: activeCompany.id,
        role: newUser.role,
        forcePasswordChange: newUser.forcePasswordChange
      });
      
      if (error) {
        console.error("Erro ao criar usuário:", error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || "Falha ao criar usuário por motivo desconhecido.");
      }

      toast({ title: "Sucesso", description: "Usuário criado e associado à empresa com sucesso!" });
      loadUsers(); 
      setShowDialog(false); 
      setNewUser({ 
        email: '',
        name: '',
        role: 'user',
        forcePasswordChange: true,
      });
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    alert(`Funcionalidade de edição em desenvolvimento para: ${user.email || user.user_id}`);
  };

  const handleRemoveUser = async (user: User) => {
    if (!activeCompany) return;

    if (window.confirm(`Tem certeza que deseja INATIVAR o usuário ${user.profiles?.full_name || user.email || user.user_id} na empresa ${activeCompany.name}? Ele não terá mais acesso aos dados desta empresa, mas seu histórico será mantido e ele poderá ser reativado ou associado a outras empresas.`)) {
      try {
        setLoading(true);
        const userId = user.user_id;
        const companyId = activeCompany.id;

        console.log('Tentando update para:', { user_id: userId, company_id: companyId });

        // Passo 1: Tentar o update
        const { error: updateError } = await supabase
          .from('company_users')
          .update({ status: 'inactive' })
          .match({ user_id: userId, company_id: companyId });

        console.log('Resultado da tentativa de UPDATE: updateError:', updateError);

        if (updateError) {
          console.error('Erro direto ao tentar o UPDATE:', updateError);
          alert(`Erro ao tentar atualizar o usuário: ${updateError.message}`);
          setLoading(false); 
          return;
        }

        // Passo 2: Se não houve erro no update, verificar o status do usuário no banco
        console.log('UPDATE aparentemente sem erro. Verificando o status do usuário no banco...');
        const { data: userData, error: selectError } = await supabase
          .from('company_users')
          .select('status')
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .maybeSingle(); // Usa maybeSingle em vez de single para evitar erro quando não encontra resultado

        console.log('Resultado da verificação (SELECT pós-UPDATE): userData:', userData, 'selectError:', selectError);

        if (selectError && selectError.code !== 'PGRST116') { // Ignora erro específico de "nenhuma linha encontrada"
          console.error('Erro ao verificar o status do usuário pós-update:', selectError);
          toast({ 
            title: "Aviso", 
            description: `Não foi possível verificar o status após a inativação, mas a operação provavelmente foi concluída.`, 
            variant: "destructive" 
          });
        } else if (userData && userData.status === 'inactive') {
          toast({ 
            title: "Sucesso", 
            description: "Usuário inativado com sucesso!", 
            variant: "default" 
          });
          console.log('CONFIRMADO: Usuário está inativo no banco.');
        } else if (userData) {
          toast({ 
            title: "Aviso", 
            description: `O usuário ainda está com status: ${userData.status}`, 
            variant: "destructive" 
          });
          console.warn('FALHA: Usuário não foi inativado. Status atual:', userData.status);
        } else {
          // Se não encontrou o usuário, provavelmente a inativação foi bem-sucedida
          toast({ 
            title: "Sucesso", 
            description: "Usuário inativado com sucesso!", 
            variant: "default" 
          });
        }
        
        // Recarregar a lista de usuários independentemente do resultado da verificação
        loadUsers();
        setLoading(false); 

      } catch (error: any) {
        toast({
          title: "Erro ao inativar usuário", 
          description: error.message || "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
        console.error("Erro no bloco catch ao inativar usuário:", error);
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        <Button onClick={() => setShowDialog(true)}>Adicionar Usuário</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando usuários...</div>
      ) : (
        <div className="grid gap-4">
          {users.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Nenhum usuário encontrado para esta empresa.</p>
              </CardContent>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.user_id}>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{user.profiles?.full_name || 'Sem nome'}</p>
                    <p className="text-sm text-gray-500">{user.email || 'Email não disponível'}</p>
                    <div className="mt-1 flex gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                        }`}
                      >
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                      {user.profiles?.force_password_change && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          Troca de senha pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveUser(user)}>
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá uma senha padrão ({defaultPassword}) e será obrigado a alterá-la no primeiro
              acesso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome completo do usuário"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="force-password"
                checked={newUser.forcePasswordChange}
                onCheckedChange={(checked) => setNewUser({ ...newUser, forcePasswordChange: checked })}
              />
              <Label htmlFor="force-password">Exigir troca de senha no primeiro acesso</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={loading || !newUser.email || !newUser.name}>
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
