import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface User {
  user_id: string;
  email?: string;
  role: string;
  status: string;
  profiles?: {
    full_name?: string;
    force_password_change?: boolean;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user',
    forcePasswordChange: true
  });
  const { toast } = useToast();
  const { activeCompany } = useAuth();
  const defaultPassword = 'Mudar@123'; // Senha padrão para novos usuários

  useEffect(() => {
    if (!activeCompany?.id) return;
    
    const loadUsers = async () => {
      try {
        // Buscar usuários da empresa atual
        const { data, error } = await supabase
          .from('company_user_details_view')
          .select('user_id, role, status, email, display_name, profile_full_name, force_password_change')
          .eq('company_id', activeCompany.id);
          
        if (error) throw error;
        
        // Buscar emails dos usuários do Auth
        if (data && data.length > 0) {
          const userIds = data.map(user => user.user_id);
          
          // Esta parte exigiria funções personalizadas no banco ou Edge Functions
          // para buscar dados de auth.users que não são acessíveis diretamente
          // Simplificando para este exemplo
          
          setUsers(data || []);
        } else {
          setUsers([]);
        }
      } catch (error: any) {
        toast({
          title: "Erro ao carregar usuários",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [activeCompany?.id, toast]);

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      // 1. Verificar se o activeCompany existe
      if (!activeCompany) {
        throw new Error("Nenhuma empresa ativa selecionada");
      }
      
      // 2. Criar usuário no Supabase
      // Note: Este trecho exigiria permissões de admin no Supabase
      // ou uso de Edge Functions/Funções de servidor
      
      // Esta é uma versão simplificada para demonstração
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: defaultPassword,
        options: {
          data: { 
            name: newUser.name,
            company_id: activeCompany.id
          }
        }
      });
      
      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }
      
      // 3. Associar usuário à empresa
      const { error: companyError } = await supabase
        .from('company_users')
        .insert({
          user_id: authData.user.id,
          company_id: activeCompany.id,
          role: newUser.role,
          status: 'active'
        });
        
      if (companyError) throw companyError;
      
      // 4. Configurar flag de troca de senha
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ 
          id: authData.user.id,
          full_name: newUser.name,
          force_password_change: newUser.forcePasswordChange,
          company_id: activeCompany.id
        });
        
      if (profileError) throw profileError;
      
      toast({
        title: "Usuário criado com sucesso",
        description: `${newUser.name} foi adicionado à empresa com a senha padrão.`
      });
      
      // Resetar form e recarregar lista
      setNewUser({
        email: '',
        name: '',
        role: 'user',
        forcePasswordChange: true
      });
      setShowDialog(false);
      
      // Recarregar lista de usuários
      const { data: updatedUsers } = await supabase
        .from('company_users')
        .select(`
          user_id,
          role,
          status,
          profiles:user_id(full_name, force_password_change)
        `)
        .eq('company_id', activeCompany.id);
      
      setUsers(updatedUsers || []);
      
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler para editar usuário
  const handleEditUser = (user: User) => {
    alert(`Funcionalidade de edição em desenvolvimento para: ${user.email || user.user_id}`);
  };

  // Handler para remover usuário
  const handleRemoveUser = (user: User) => {
    if (window.confirm(`Tem certeza que deseja remover o usuário ${user.email || user.user_id}?`)) {
      setUsers((prev) => prev.filter((u) => u.user_id !== user.user_id));
      // Aqui você pode adicionar a lógica para remover no Supabase, se desejar
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        <Button onClick={() => setShowDialog(true)}>
          Adicionar Usuário
        </Button>
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                      }`}>
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
                    <Button variant="outline" size="sm">Editar</Button>
                    <Button variant="destructive" size="sm">Remover</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Dialog para adicionar usuário */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá uma senha padrão ({defaultPassword}) e será 
              obrigado a alterá-la no primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Nome completo do usuário"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
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
                onCheckedChange={(checked) => setNewUser({...newUser, forcePasswordChange: checked})}
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
