import { X, Check } from 'lucide-react';
import type { FileData } from '@/types';
import { Button } from '@/components/ui/button';

interface FileSelectorProps {
  files: FileData[];
  selectedFileIds: string[];
  onSelectFiles: (fileIds: string[]) => void;
  onRemoveFile: (fileId: string) => void;
}

export function FileSelector({ files, selectedFileIds, onSelectFiles, onRemoveFile }: FileSelectorProps) {
  if (files.length === 0) {
    return null;
  }

  const allSelected = selectedFileIds.includes('all') || selectedFileIds.length === files.length;

  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all, select first one
      onSelectFiles([files[0].id]);
    } else {
      onSelectFiles(['all']);
    }
  };

  const handleToggleFile = (fileId: string) => {
    // If "all" is selected, switch to individual selection
    if (selectedFileIds.includes('all')) {
      const allExceptThis = files.filter(f => f.id !== fileId).map(f => f.id);
      onSelectFiles(allExceptThis.length > 0 ? allExceptThis : [files[0].id]);
      return;
    }

    const isSelected = selectedFileIds.includes(fileId);
    
    if (isSelected) {
      // Don't allow deselecting the last file
      if (selectedFileIds.length === 1) return;
      onSelectFiles(selectedFileIds.filter(id => id !== fileId));
    } else {
      const newSelected = [...selectedFileIds, fileId];
      // If all files are now selected, switch to "all"
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Files:</span>
        
        {files.length > 1 && (
          <button
            onClick={handleToggleAll}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-sm border transition-colors
              ${allSelected 
                ? 'bg-blue-100 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            All ({files.length})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {files.map(file => {
          const selected = isFileSelected(file.id);
          return (
            <div
              key={file.id}
              className={`
                flex items-center gap-2 px-2 py-1 rounded text-sm border transition-colors
                ${selected 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              <button
                onClick={() => handleToggleFile(file.id)}
                className="flex items-center gap-1"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                  {selected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={selected ? 'text-blue-700' : 'text-gray-600'}>{file.name}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-red-100"
                onClick={() => onRemoveFile(file.id)}
              >
                <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
