
import React from 'react';
import { Group, Subgroup } from '@/services/groupService';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface GroupTableViewProps {
  groups: Group[];
  subgroups: Subgroup[];
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
}

const GroupTableView: React.FC<GroupTableViewProps> = ({
  groups,
  subgroups,
  onEditGroup,
  onDeleteGroup
}) => {
  // Obter subgrupos por grupo
  const getSubgroupsByGroup = (groupId: string) => {
    return subgroups.filter(subgroup => subgroup.group_id === groupId);
  };

  return (
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
          {groups.map(group => {
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
  );
};

export default GroupTableView;
