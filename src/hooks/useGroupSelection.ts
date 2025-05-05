import { useState, useCallback } from 'react';
import { Group } from '@/services/groupService';

export const useGroupSelection = () => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const initializeOrUpdateExpandedGroups = useCallback((groups: Group[]) => {
    setExpandedGroups(prevExpanded => {
      const newExpanded = { ...prevExpanded }; 
      let changed = false;

      groups.forEach(group => {
        if (prevExpanded[group.id] === undefined) { 
          newExpanded[group.id] = false; 
          changed = true;
        }
      });

      Object.keys(prevExpanded).forEach(groupId => {
        if (!groups.some(g => g.id === groupId)) {
          delete newExpanded[groupId];
          changed = true;
        }
      });

      return changed ? newExpanded : prevExpanded;
    });
  }, []); 

  const toggleGroupExpansion = useCallback((groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []); 

  return {
    selectedGroup,
    setSelectedGroup,
    expandedGroups,
    initializeOrUpdateExpandedGroups, 
    toggleGroupExpansion
  };
};
