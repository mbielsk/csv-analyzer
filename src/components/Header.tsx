import { Upload, RotateCcw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onUploadClick: () => void;
  hasData: boolean;
  hasActiveFilters?: boolean;
  onResetPreferences?: () => void;
}

export function Header({ onUploadClick, hasData, hasActiveFilters, onResetPreferences }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Kiro Finance</h1>
        {hasActiveFilters && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            <Filter className="w-3 h-3" />
            Filters active
          </span>
        )}
      </div>
      {hasData && (
        <div className="flex items-center gap-2">
          {onResetPreferences && (
            <Button onClick={onResetPreferences} variant="outline" size="sm" title="Reset all preferences">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Preferences
            </Button>
          )}
          <Button onClick={onUploadClick} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      )}
    </header>
  );
}

