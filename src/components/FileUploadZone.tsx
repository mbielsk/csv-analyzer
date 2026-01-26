import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isValidCSVFile } from '@/utils/fileValidation';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  onReset: () => void;
  hasData: boolean;
}

export function FileUploadZone({ onFileUpload, onReset, hasData }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file && isValidCSVFile(file)) {
      onFileUpload(file);
    } else {
      setError('Please upload a valid .csv file');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file && isValidCSVFile(file)) {
      onFileUpload(file);
    } else if (file) {
      setError('Please upload a valid .csv file');
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (hasData) {
    return (
      <div className="flex justify-center py-4">
        <Button onClick={onReset} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Reset Data
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          w-full max-w-lg p-12 border-2 border-dashed rounded-lg cursor-pointer
          transition-colors duration-200 text-center
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
        </p>
        <p className="text-sm text-gray-500 mb-4">or click to browse</p>
        <Button type="button" variant="outline">
          Select File
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
