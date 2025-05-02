
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash,
  CakeSlice,
  Loader2,
  FileText,
  CalculatorIcon,
  RefreshCw,
  FolderTree,
  Tag,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getRecipes, Recipe, deleteRecipe, updateAllRecipesCosts } from "@/services/recipeService";
import { generateRecipePdf, PdfType } from "@/services/pdfService";
import { getGroups, getSubgroups, Group, Subgroup } from "@/services/groupService";
import { useAuth } from '@/contexts/AuthContext';

export default function Recipes() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [pdfOptionsDialogOpen, setPdfOptionsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [updatingCosts, setUpdatingCosts] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const navigate = useNavigate();

  const { activeCompany, loading: authLoading } = useAuth();

  const fetchGroups = async () => {
    if (authLoading || !activeCompany?.id) return;
    try {
      const groupsData = await getGroups(activeCompany.id);
      setGroups(groupsData);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      toast.error("Erro ao carregar grupos");
    }
  };
  
  const fetchSubgroups = async () => {
    if (authLoading || !activeCompany?.id) return;
    try {
      const subgroupsData = await getSubgroups(activeCompany.id);
      setSubgroups(subgroupsData);
    } catch (error) {
      console.error("Erro ao carregar subgrupos:", error);
      toast.error("Erro ao carregar subgrupos");
    }
  };

  const fetchRecipes = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getRecipes(activeCompany.id);
      setRecipes(data);
    } catch (error) {
      console.error("Error fetching receitas:", error);
      toast.error("Erro ao carregar receitas");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRecipes();
    fetchGroups();
    fetchSubgroups();
  }, []);
  
  // Filtrar subgrupos com base no grupo selecionado
  useEffect(() => {
    if (selectedGroup) {
      const filtered = subgroups.filter(subgroup => subgroup.group_id === selectedGroup);
      setFilteredSubgroups(filtered);
      
      // Se o subgrupo atual não pertence ao grupo selecionado, resetar
      if (selectedSubgroup) {
        const belongsToGroup = filtered.some(sg => sg.id === selectedSubgroup);
        if (!belongsToGroup) {
          setSelectedSubgroup(null);
        }
      }
    } else {
      setFilteredSubgroups([]);
      setSelectedSubgroup(null);
    }
  }, [selectedGroup, subgroups]);
  
  const filteredRecipes = recipes.filter(recipe => {
    // Filtro por texto de busca
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.code && recipe.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro por grupo
    const matchesGroup = !selectedGroup || recipe.group_id === selectedGroup;
    
    // Filtro por subgrupo
    const matchesSubgroup = !selectedSubgroup || recipe.subgroup_id === selectedSubgroup;
    
    return matchesSearch && matchesGroup && matchesSubgroup;
  });
  
  const handleEditRecipe = (recipeId: string) => {
    navigate(`/recipes/${recipeId}/edit`);
  };
  
  const handleViewRecipe = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };
  
  const openDeleteDialog = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    if (recipeToDelete) {
      setLoading(true);
      const success = await deleteRecipe(recipeToDelete.id, activeCompany.id);
      
      if (success) {
        setRecipes(recipes.filter(r => r.id !== recipeToDelete.id));
        setIsDeleteDialogOpen(false);
        setRecipeToDelete(null);
        toast.success("Receita excluída com sucesso");
      }
      setLoading(false);
    }
  };

  const openPdfOptions = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPdfOptionsDialogOpen(true);
  };

  const generatePdf = async (type: PdfType) => {
    if (!selectedRecipe) return;
    if (authLoading || !activeCompany?.id) {
      toast.error('Empresa ativa não carregada. Tente novamente mais tarde.');
      return;
    }
    try {
      setLoading(true);
      await generateRecipePdf(activeCompany.id, selectedRecipe.id, type);
      toast.success("PDF da receita gerado com sucesso!");
      setPdfOptionsDialogOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF da receita");
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateAllCosts = async () => {
    try {
      setUpdatingCosts(true);
      if (authLoading || !activeCompany?.id) {
        toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
        setUpdatingCosts(false);
        return;
      }
      await updateAllRecipesCosts(activeCompany.id);
      // Refresh the recipes list to show updated costs
      await fetchRecipes();
      toast.success("Custos de todas as receitas atualizados com sucesso");
    } catch (error) {
      console.error("Error updating recipe costs:", error);
      toast.error("Erro ao atualizar custos das receitas");
    } finally {
      setUpdatingCosts(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-bakery-brown">Cadastro de Receitas</h1>
          <p className="text-gray-600">Gerencie todas as receitas e fórmulas da padaria</p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={handleUpdateAllCosts} 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={updatingCosts || loading}
          >
            {updatingCosts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar Custos das Receitas
          </Button>
          
          <Button 
            onClick={() => navigate('/recipes/new')} 
            className="bg-bakery-amber hover:bg-bakery-brown text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </div>
      </div>
      
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar receita por nome ou código..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-md">
              <div>
                <label className="text-sm font-medium mb-1 block">Filtrar por Grupo</label>
                <Select
                  value={selectedGroup || ''}
                  onValueChange={(value) => setSelectedGroup(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os grupos</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Filtrar por Subgrupo</label>
                <Select
                  value={selectedSubgroup || ''}
                  onValueChange={(value) => setSelectedSubgroup(value || null)}
                  disabled={!selectedGroup}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os subgrupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os subgrupos</SelectItem>
                    {filteredSubgroups.map((subgroup) => (
                      <SelectItem key={subgroup.id} value={subgroup.id}>
                        {subgroup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Receita</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Grupo/Subgrupo</TableHead>
                    <TableHead>Rendimento (kg)</TableHead>
                    <TableHead>Rendimento (un)</TableHead>
                    <TableHead>Custo/kg (R$)</TableHead>
                    <TableHead>Custo/un (R$)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.length > 0 ? (
                    filteredRecipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell className="font-medium flex items-center">
                          <CakeSlice className="h-4 w-4 mr-2 text-bakery-amber" />
                          {recipe.name}
                        </TableCell>
                        <TableCell>{recipe.code || '-'}</TableCell>
                        <TableCell>
                          {recipe.group_id && (
                            <div className="flex flex-col">
                              <Badge variant="outline" className="mb-1 w-fit flex items-center gap-1">
                                <FolderTree size={12} />
                                {groups.find(g => g.id === recipe.group_id)?.name || 'Grupo'}
                              </Badge>
                              {recipe.subgroup_id && (
                                <Badge variant="outline" className="w-fit flex items-center gap-1 ml-2">
                                  <Tag size={12} />
                                  {subgroups.find(sg => sg.id === recipe.subgroup_id)?.name || 'Subgrupo'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{recipe.yield_kg.toFixed(2)} kg</TableCell>
                        <TableCell>{recipe.yield_units ? `${recipe.yield_units} un` : 'N/A'}</TableCell>
                        <TableCell>R$ {recipe.cost_per_kg ? recipe.cost_per_kg.toFixed(2) : '0.00'}</TableCell>
                        <TableCell>{recipe.yield_units && recipe.cost_per_unit ? `R$ ${recipe.cost_per_unit.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewRecipe(recipe.id)}
                            >
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditRecipe(recipe.id)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openPdfOptions(recipe)}
                            >
                              <FileText size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700" 
                              onClick={() => openDeleteDialog(recipe)}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm ? "Nenhuma receita encontrada para esta busca." : "Nenhuma receita encontrada. Adicione uma nova receita para começar."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir a receita <span className="font-semibold">{recipeToDelete?.name}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfOptionsDialogOpen} onOpenChange={setPdfOptionsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerar PDF da Receita</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Escolha o tipo de PDF para {selectedRecipe?.name}:</p>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={() => generatePdf("simple")}
                disabled={loading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Foto + Modo de Preparo
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={() => generatePdf("complete")}
                disabled={loading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Foto + Matérias Primas + Modo de Preparo
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={() => generatePdf("costs")}
                disabled={loading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Matérias Primas + Custos Associados
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOptionsDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
