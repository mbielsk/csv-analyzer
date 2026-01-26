import { useState } from 'react';
import { X, Check, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { FileData } from '@/types';
import { Button } from '@/components/ui/button';

interface FileSelectorProps {
  files: FileData[];
  selectedFileIds: string[];
  onSelectFiles: (fileIds: string[]) => void;
  onRemoveFile: (fileId: string) => void;
}

export function FileSelector({ files, selectedFileIds, onSelectFiles, onRemoveFile }: FileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (files.length === 0) {
    return null;
  }

  const allSelected = selectedFileIds.includes('all') || selectedFileIds.length === files.length;
  const selectedCount = allSelected ? files.length : selectedFileIds.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onSelectFiles([files[0].id]);
    } else {
      onSelectFiles(['all']);
    }
  };

  const handleToggleFile = (fileId: string) => {
    if (selectedFileIds.includes('all')) {
      const allExceptThis = files.filter(f => f.id !== fileId).map(f => f.id);
      onSelectFiles(allExceptThis.length > 0 ? allExceptThis : [files[0].id]);
      return;
    }

    const isSelected = selectedFileIds.includes(fileId);
    
    if (isSelected) {
      if (selectedFileIds.length === 1) return;
      onSelectFiles(selectedFileIds.filter(id => id !== fileId));
    } else {
      const newSelected = [...selectedFileIds, fileId];
      if (newSelected.length === files.length) {
        onSelectFiles(['all']);
      } else {
        onSelectFiles(newSelected);
      }
    }
  };

  const isFileSelected = (fileId: string) => {
    return selectedFileIds.includes('all') || selectedFileIds.includes(fileId);
  };

  return (
    <div className="bg-white rounded-lg border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Pliki</span>
          <span className="text-sm text-gray-500">({selectedCount}/{files.length} wybranych)</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="pt-3 space-y-2">
            {files.length > 1 && (
              <button
                onClick={handleToggleAll}
                className={`
                  flex items-center gap-2 w-full px-3 py-2 rounded text-sm border transition-colors
                  ${allSelected 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                  {allSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                Wszystkie ({files.length})
              </button>
            )}

            {files.map(file => {
              const selected = isFileSelected(file.id);
              return (
                <div
                  key={file.id}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded text-sm border transition-colors
                    ${selected 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                    }
                  `}
                >
                  <button
                    onClick={() => handleToggleFile(file.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={selected ? 'text-blue-700' : 'text-gray-600'}>{file.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-red-100"
                    onClick={() => onRemoveFile(file.id)}
                  >
                    <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
