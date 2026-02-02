import { useState, useMemo } from 'react';
import { X, Check, ChevronDown, Search } from 'lucide-react';

interface ExcludeFiltersProps {
  categories: string[];
  sources: string[];
  excludedCategories: string[];
  excludedSources: string[];
  onExcludeCategoriesChange: (categories: string[]) => void;
  onExcludeSourcesChange: (sources: string[]) => void;
}

interface MultiSelectProps {
  label: string;
  items: string[];
  selectedItems: string[];
  onChange: (items: string[]) => void;
  color: 'red' | 'orange';
}

function MultiSelect({ label, items, selectedItems, onChange, color }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lower = search.toLowerCase();
    return items.filter(item => item.toLowerCase().includes(lower));
  }, [items, search]);

  const toggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      onChange(selectedItems.filter(i => i !== item));
    } else {
      onChange([...selectedItems, item]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
  };

  const colorClasses = color === 'red' 
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', check: 'bg-red-600 border-red-600' }
    : { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', check: 'bg-orange-600 border-orange-600' };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
          selectedItems.length > 0 
            ? `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}` 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{label}</span>
        {selectedItems.length > 0 && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${colorClasses.bg} ${colorClasses.text}`}>
            -{selectedItems.length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleClose} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-md shadow-lg min-w-[250px] max-h-[350px] flex flex-col">
            {/* Search input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {selectedItems.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-2 text-sm text-left text-gray-500 hover:bg-gray-50 border-b"
              >
                Wyczyść wszystkie ({selectedItems.length})
              </button>
            )}

            <div className="overflow-auto flex-1">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  {search ? 'Brak wyników' : 'Brak elementów'}
                </div>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedItems.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleItem(item)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                        isSelected ? colorClasses.text : 'text-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSelected ? colorClasses.check : 'border-gray-400'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{item || '(empty)'}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ExcludeFilters({
  categories,
  sources,
  excludedCategories,
  excludedSources,
  onExcludeCategoriesChange,
  onExcludeSourcesChange,
}: ExcludeFiltersProps) {
  const hasExclusions = excludedCategories.length > 0 || excludedSources.length > 0;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-500">Exclude:</span>
      
      <MultiSelect
        label="Categories"
        items={categories}
        selectedItems={excludedCategories}
        onChange={onExcludeCategoriesChange}
        color="red"
      />
      
      <MultiSelect
        label="Sources"
        items={sources}
        selectedItems={excludedSources}
        onChange={onExcludeSourcesChange}
        color="orange"
      />

      {hasExclusions && (
        <div className="flex items-center gap-1 flex-wrap">
          {excludedCategories.map(cat => (
            <span key={`cat-${cat}`} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
              {cat}
              <button onClick={() => onExcludeCategoriesChange(excludedCategories.filter(c => c !== cat))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {excludedSources.map(src => (
            <span key={`src-${src}`} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
              {src}
              <button onClick={() => onExcludeSourcesChange(excludedSources.filter(s => s !== src))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
