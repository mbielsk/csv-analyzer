import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onUploadClick: () => void;
  hasData: boolean;
}

export function Header({ onUploadClick, hasData }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <h1 className="text-2xl font-bold text-gray-900">Kiro Finance</h1>
      {hasData && (
        <Button onClick={onUploadClick} variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload CSV
        </Button>
      )}
    </header>
  );
}
