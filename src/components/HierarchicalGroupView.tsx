import React, { useState, useEffect } from 'react';
import { Group, Subgroup } from '@/services/groupService';
import { Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HierarchicalGroupViewProps {
  groups: Group[];
  subgroups: Subgroup[];
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
  onEditSubgroup: (subgroup: Subgroup) => void;
  onDeleteSubgroup: (id: string) => void;
  onAddSubgroup: (groupId: string) => void;
}

const HierarchicalGroupView: React.FC<HierarchicalGroupViewProps> = ({
  groups,
  subgroups,
  onEditGroup,
  onDeleteGroup,
  onEditSubgroup,
  onDeleteSubgroup,
  onAddSubgroup
}) => {
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Inicializar expandedGroups quando os grupos mudarem
  useEffect(() => {
    // Inicialmente, expande todos os grupos
    const initialExpanded: Record<string, boolean> = {};
    groups.forEach(group => {
      // Preservar estado de expansão existente ou definir como true para novos grupos
      initialExpanded[group.id] = expandedGroups[group.id] !== undefined ? 
        expandedGroups[group.id] : true;
    });
    setExpandedGroups(initialExpanded);
  }, [groups]);

  // Função para alternar a expansão de um grupo
  const toggleGroupExpansion = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filtragem por termo de busca
  const filteredGroups = searchTerm 
    ? groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subgroups.filter(sg => sg.group_id === group.id)
          .some(sg => sg.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : groups;

  // Obter subgrupos por grupo
  const getSubgroupsByGroup = (groupId: string) => {
    return subgroups.filter(subgroup => subgroup.group_id === groupId);
  };

  return (
    <div className="space-y-4">
      {/* Campo de pesquisa */}
      <div className="relative">
        <Input
          placeholder="Pesquisar grupos e subgrupos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </div>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista">Lista Hierárquica</TabsTrigger>
          <TabsTrigger value="tabela">Tabela</TabsTrigger>
        </TabsList>
        
        {/* Visualização em Lista Hierárquica */}
        <TabsContent value="lista" className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-amber-500 rounded-full border-t-transparent"></div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center p-8">
              <FolderTree className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sem grupos</h3>
              <p className="text-gray-500">Nenhum grupo foi encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map(group => {
                const groupSubgroups = getSubgroupsByGroup(group.id);
                const isExpanded = expandedGroups[group.id];
                
                return (
                  <Card key={group.id} className="overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => {}}
                    >
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 mr-2"
                          onClick={(e) => toggleGroupExpansion(group.id, e)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <h3 className="font-medium">{group.name}</h3>
                          <p className="text-xs text-gray-500">
                            {groupSubgroups.length} {groupSubgroups.length === 1 ? 'subgrupo' : 'subgrupos'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGroup(group);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Subgrupos */}
                    {isExpanded && groupSubgroups.length > 0 && (
                      <div className="pl-10 pr-4 pb-4 space-y-2">
                        {groupSubgroups.map(subgroup => (
                          <div 
                            key={subgroup.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100"
                          >
                            <div>
                              <h4 className="text-sm font-medium">{subgroup.name}</h4>
                              {subgroup.description && (
                                <p className="text-xs text-gray-500">{subgroup.description}</p>
                              )}
                            </div>
                            
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEditSubgroup(subgroup)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onDeleteSubgroup(subgroup.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Botão para adicionar subgrupo */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => onAddSubgroup(group.id)}
                        >
                          + Adicionar Subgrupo
                        </Button>
                      </div>
                    )}
                    
                    {/* Mensagem para grupo sem subgrupos */}
                    {isExpanded && groupSubgroups.length === 0 && (
                      <div className="pl-10 pr-4 pb-4">
                        <p className="text-sm text-gray-500 italic mb-2">Este grupo não possui subgrupos.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => onAddSubgroup(group.id)}
                        >
                          + Adicionar Subgrupo
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Visualização em Tabela */}
        <TabsContent value="tabela" className="mt-4">
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Descrição</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Subgrupos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredGroups.map(group => {
                  const groupSubgroups = getSubgroupsByGroup(group.id);
                  
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{group.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{group.description || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {groupSubgroups.length > 0 ? (
                            groupSubgroups.map(subgroup => (
                              <span 
                                key={subgroup.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                              >
                                {subgroup.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 italic">Nenhum subgrupo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HierarchicalGroupView;
