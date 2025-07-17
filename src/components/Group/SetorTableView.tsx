import React from 'react';
import { Setor } from '@/services/setorService';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface SetorTableViewProps {
  setores: Setor[];
  onEditSetor: (setorId: string) => void;
  onDeleteSetor: (id: string) => void;
}

const SetorTableView: React.FC<SetorTableViewProps> = ({
  setores,
  onEditSetor,
  onDeleteSetor
}) => {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Descrição</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cor</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {setores.map(setor => (
            <tr key={setor.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{setor.name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{setor.description || '-'}</td>
              <td className="px-4 py-3">
                {setor.color ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300" 
                      style={{ backgroundColor: setor.color }}
                    />
                    <span className="text-sm">{setor.color}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditSetor(setor.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSetor(setor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SetorTableView;
