import { useRef } from 'react';
import { Header } from '@/components/Header';
import { FileUploadZone } from '@/components/FileUploadZone';
import { FileSelector } from '@/components/FileSelector';
import { ExcludeFilters } from '@/components/ExcludeFilters';
import { Dashboard } from '@/components/Dashboard';
import { useTransactions } from '@/hooks/useTransactions';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    selectedFileIds,
    transactions,
    filteredTransactions,
    chartFilter,
    isLoading,
    error,
    paymentSummary,
    categoryTotals,
    topCategories,
    topCategory,
    topSources,
    allCategories,
    allSources,
    excludedCategories,
    excludedSources,
    handleFileUpload,
    handleRemoveFile,
    handleSelectFiles,
    handleReset,
    handleChartFilter,
    handleExcludeCategoriesChange,
    handleExcludeSourcesChange,
    hasActiveFilters,
    resetPrefs,
    prefs,
    setPrefs,
  } = useTransactions();

  const hasData = transactions.length > 0;
  const hasFiles = files.length > 0;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      // Reset input so same file can be uploaded again
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        onUploadClick={handleUploadClick} 
        hasData={hasFiles} 
        hasActiveFilters={hasActiveFilters}
        onResetPreferences={resetPrefs}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}

      {error && (
        <div className="p-4 m-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!isLoading && !hasFiles && (
        <FileUploadZone
          onFileUpload={handleFileUpload}
          onReset={handleReset}
          hasData={false}
        />
      )}

      {!isLoading && hasFiles && (
        <>
          <div className="px-6 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <FileSelector
                files={files}
                selectedFileIds={selectedFileIds}
                onSelectFiles={handleSelectFiles}
                onRemoveFile={handleRemoveFile}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUploadClick}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Add File
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <ExcludeFilters
              categories={allCategories}
              sources={allSources}
              excludedCategories={excludedCategories}
              excludedSources={excludedSources}
              onExcludeCategoriesChange={handleExcludeCategoriesChange}
              onExcludeSourcesChange={handleExcludeSourcesChange}
            />
          </div>
          
          {hasData ? (
            <Dashboard
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              chartFilter={chartFilter}
              paymentSummary={paymentSummary}
              categoryTotals={categoryTotals}
              topCategories={topCategories}
              topCategory={topCategory}
              topSources={topSources}
              onChartFilter={handleChartFilter}
              prefs={prefs}
              setPrefs={setPrefs}
            />
          ) : (
            <div className="p-12 text-center text-gray-500">
              {excludedCategories.length > 0 || excludedSources.length > 0 
                ? 'All transactions excluded by filters'
                : 'Select a file to view data'
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
