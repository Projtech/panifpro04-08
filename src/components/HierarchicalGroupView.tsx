
import React, { useState, useEffect } from 'react';
import { Group, Subgroup } from '@/services/groupService';
import { FolderTree } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupListView from './Group/GroupListView';
import GroupTableView from './Group/GroupTableView';

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
          <GroupListView 
            groups={filteredGroups}
            subgroups={subgroups}
            expandedGroups={expandedGroups}
            toggleGroupExpansion={toggleGroupExpansion}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            onEditSubgroup={onEditSubgroup}
            onDeleteSubgroup={onDeleteSubgroup}
            onAddSubgroup={onAddSubgroup}
            loading={loading}
          />
        </TabsContent>
        
        {/* Visualização em Tabela */}
        <TabsContent value="tabela" className="mt-4">
          <GroupTableView 
            groups={filteredGroups}
            subgroups={subgroups}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HierarchicalGroupView;
