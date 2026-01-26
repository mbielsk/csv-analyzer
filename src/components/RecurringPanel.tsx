import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Check, X, Calendar, TrendingUp } from 'lucide-react';
import { api, type RecurringPattern, type RecurringSummary } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const frequencyLabels: Record<string, string> = {
  weekly: 'Tygodniowo',
  biweekly: 'Co 2 tygodnie',
  monthly: 'Miesięcznie',
  quarterly: 'Kwartalnie',
  yearly: 'Rocznie',
  irregular: 'Nieregularnie',
};

export function RecurringPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatterns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getRecurring(0.3);
      setPatterns(result.patterns);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patterns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && patterns.length === 0) {
      loadPatterns();
    }
  }, [isExpanded]);

  const handleConfirm = async (id: string, confirmed: boolean) => {
    try {
      await api.updateRecurringPattern(id, { isConfirmed: confirmed });
      setPatterns(prev =>
        prev.map(p => (p.id === id ? { ...p, isConfirmed: confirmed } : p))
      );
    } catch (err) {
      console.error('Failed to update pattern:', err);
    }
  };

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      await api.recalculateRecurring();
      await loadPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Recurring / Subskrypcje
            {summary && (
              <span className="text-sm font-normal text-gray-500">
                ({summary.patternCount})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {summary && (
              <span className="text-sm text-gray-600">
                ~{formatAmount(summary.totalMonthly)}/mies
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="flex justify-between items-center mb-3 pt-2 border-t">
            <div className="text-sm text-gray-500">
              {summary && (
                <>
                  Rocznie: <span className="font-medium text-gray-700">{formatAmount(summary.totalYearly)}</span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculate}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Przelicz
            </Button>
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-3">{error}</div>
          )}

          {isLoading && patterns.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Ładowanie...</div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Brak wykrytych wzorców recurring
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {patterns.map(pattern => (
                <div
                  key={pattern.id}
                  className={`
                    p-3 rounded-lg border transition-colors
                    ${pattern.isConfirmed === true ? 'bg-green-50 border-green-200' : ''}
                    ${pattern.isConfirmed === false ? 'bg-gray-100 border-gray-200 opacity-50' : ''}
                    ${pattern.isConfirmed === null ? 'bg-white border-gray-200' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {pattern.userLabel || pattern.source}
                        </span>
                        {pattern.frequency && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {frequencyLabels[pattern.frequency] || pattern.frequency}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {pattern.category}
                        {pattern.descriptionPattern && ` • ${pattern.descriptionPattern}`}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="font-medium text-gray-900">
                          {formatAmount(pattern.avgAmount)}
                        </span>
                        <span className="text-gray-400">
                          {pattern.occurrenceCount}x
                        </span>
                        {pattern.nextExpected && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {pattern.nextExpected}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Confidence indicator */}
                      <div className="flex items-center gap-1 mr-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getConfidenceColor(pattern.confidence)}`}
                        />
                        <span className="text-xs text-gray-500">
                          {Math.round(pattern.confidence * 100)}%
                        </span>
                      </div>

                      {pattern.isConfirmed === null && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-green-100"
                            onClick={() => handleConfirm(pattern.id, true)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-100"
                            onClick={() => handleConfirm(pattern.id, false)}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
