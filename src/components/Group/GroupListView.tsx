
import React from 'react';
import { Group, Subgroup } from '@/services/groupService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';

interface GroupListViewProps {
  groups: Group[];
  subgroups: Subgroup[];
  expandedGroups: Record<string, boolean>;
  toggleGroupExpansion: (groupId: string, e: React.MouseEvent) => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
  onEditSubgroup: (subgroup: Subgroup) => void;
  onDeleteSubgroup: (id: string) => void;
  onAddSubgroup: (groupId: string) => void;
  loading: boolean;
}

const GroupListView: React.FC<GroupListViewProps> = ({
  groups,
  subgroups,
  expandedGroups,
  toggleGroupExpansion,
  onEditGroup,
  onDeleteGroup,
  onEditSubgroup,
  onDeleteSubgroup,
  onAddSubgroup,
  loading
}) => {
  // Obter subgrupos por grupo
  const getSubgroupsByGroup = (groupId: string) => {
    return subgroups.filter(subgroup => subgroup.group_id === groupId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center p-8">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 mx-auto text-gray-400 mb-4"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Sem grupos</h3>
        <p className="text-gray-500">Nenhum grupo foi encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(group => {
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
            {isExpanded && (
              <div className="pl-10 pr-4 pb-4 space-y-2">
                {groupSubgroups.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-2">Este grupo não possui subgrupos.</p>
                )}
                
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
          </Card>
        );
      })}
    </div>
  );
};

export default GroupListView;
