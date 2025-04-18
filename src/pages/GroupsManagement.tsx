import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
} from "lucide-react";
import HierarchicalGroupView from "@/components/HierarchicalGroupView";
import { useToast } from "@/hooks/use-toast";
import { 
  Group, 
  Subgroup, 
  getGroups, 
  getSubgroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  createSubgroup,
  updateSubgroup,
  deleteSubgroup
} from "@/services/groupService";

const GroupsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSubgroupDialog, setShowSubgroupDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'group' | 'subgroup'>('group');
  const [deleteId, setDeleteId] = useState<string>('');
  
  const [groupForm, setGroupForm] = useState({
    id: '',
    name: '',
    description: ''
  });
  
  const [subgroupForm, setSubgroupForm] = useState({
    id: '',
    name: '',
    description: '',
    group_id: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const loadData = async () => {
    setLoading(true);
    try {
      const groupsData = await getGroups();
      setGroups(groupsData);
      
      const subgroupsData = await getSubgroups();
      setSubgroups(subgroupsData);
      
      if (groupsData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsData[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const filteredSubgroups = selectedGroup 
    ? subgroups.filter(subgroup => subgroup.group_id === selectedGroup.id)
    : [];
  
  const handleAddGroup = () => {
    setGroupForm({
      id: '',
      name: '',
      description: ''
    });
    setShowGroupDialog(true);
  };
  
  const handleEditGroup = (group: Group) => {
    setGroupForm({
      id: group.id,
      name: group.name,
      description: group.description || ''
    });
    setShowGroupDialog(true);
  };
  
  const handleDeleteGroup = (id: string) => {
    setDeleteType('group');
    setDeleteId(id);
    setShowDeleteDialog(true);
  };
  
  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do grupo é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      if (groupForm.id) {
        await updateGroup(groupForm.id, {
          name: groupForm.name,
          description: groupForm.description || null
        });
      } else {
        await createGroup({
          name: groupForm.name,
          description: groupForm.description || null
        });
      }
      
      await loadData();
      setShowGroupDialog(false);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSubgroup = () => {
    if (!selectedGroup) {
      toast({
        title: "Erro",
        description: "Selecione um grupo antes de adicionar um subgrupo",
        variant: "destructive"
      });
      return;
    }
    
    setSubgroupForm({
      id: '',
      name: '',
      description: '',
      group_id: selectedGroup.id
    });
    setShowSubgroupDialog(true);
  };
  
  const handleEditSubgroup = (subgroup: Subgroup) => {
    setSubgroupForm({
      id: subgroup.id,
      name: subgroup.name,
      description: subgroup.description || '',
      group_id: subgroup.group_id
    });
    setShowSubgroupDialog(true);
  };
  
  const handleDeleteSubgroup = (id: string) => {
    setDeleteType('subgroup');
    setDeleteId(id);
    setShowDeleteDialog(true);
  };
  
  const handleSaveSubgroup = async () => {
    if (!subgroupForm.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do subgrupo é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    if (!subgroupForm.group_id) {
      toast({
        title: "Erro",
        description: "Selecione um grupo para o subgrupo",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      if (subgroupForm.id) {
        await updateSubgroup(subgroupForm.id, {
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        });
      } else {
        await createSubgroup({
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        });
      }
      
      await loadData();
      setShowSubgroupDialog(false);
    } catch (error) {
      console.error("Erro ao salvar subgrupo:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      let success = false;
      
      if (deleteType === 'group') {
        success = await deleteGroup(deleteId);
      } else {
        success = await deleteSubgroup(deleteId);
      }
      
      if (success) {
        await loadData();
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-bakery-brown">Gerenciamento de Grupos e Subgrupos</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleAddGroup}
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>
      
      <HierarchicalGroupView 
        groups={groups}
        subgroups={subgroups}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        onEditSubgroup={handleEditSubgroup}
        onDeleteSubgroup={handleDeleteSubgroup}
        onAddSubgroup={(groupId) => {
          const selectedGroupObj = groups.find(g => g.id === groupId);
          if (selectedGroupObj) {
            setSelectedGroup(selectedGroupObj);
            handleAddSubgroup();
          }
        }}
      />
      
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {groupForm.id ? 'Editar Grupo' : 'Novo Grupo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                placeholder="Nome do grupo"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="group-description" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="group-description"
                value={groupForm.description}
                onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                placeholder="Descrição do grupo"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGroupDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={loading}
              className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showSubgroupDialog} onOpenChange={setShowSubgroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {subgroupForm.id ? 'Editar Subgrupo' : 'Novo Subgrupo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="subgroup-group" className="text-sm font-medium">
                Grupo <span className="text-red-500">*</span>
              </label>
              <Select
                value={subgroupForm.group_id}
                onValueChange={(value) => setSubgroupForm({...subgroupForm, group_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="subgroup-name" className="text-sm font-medium">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input
                id="subgroup-name"
                value={subgroupForm.name}
                onChange={(e) => setSubgroupForm({...subgroupForm, name: e.target.value})}
                placeholder="Nome do subgrupo"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="subgroup-description" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="subgroup-description"
                value={subgroupForm.description}
                onChange={(e) => setSubgroupForm({...subgroupForm, description: e.target.value})}
                placeholder="Descrição do subgrupo"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubgroupDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSubgroup}
              disabled={loading}
              className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>
              Tem certeza que deseja excluir este {deleteType === 'group' ? 'grupo' : 'subgrupo'}?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={loading}
              variant="destructive"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsManagement;
