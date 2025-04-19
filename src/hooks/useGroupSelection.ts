
import { useState } from 'react';
import { Group } from '@/services/groupService';

export const useGroupSelection = () => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const initializeExpandedGroups = (groups: Group[]) => {
    const initialExpanded: Record<string, boolean> = {};
    groups.forEach(group => {
      initialExpanded[group.id] = expandedGroups[group.id] !== undefined ? 
        expandedGroups[group.id] : true;
    });
    setExpandedGroups(initialExpanded);
  };

  const toggleGroupExpansion = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return {
    selectedGroup,
    setSelectedGroup,
    expandedGroups,
    initializeExpandedGroups,
    toggleGroupExpansion
  };
};
