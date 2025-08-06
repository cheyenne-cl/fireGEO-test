import React from 'react';

interface ErrorMessageProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onDismiss, onRetry }: ErrorMessageProps) {
  // Determine error type and provide specific guidance
  const getErrorGuidance = (error: string) => {
    if (error.toLowerCase().includes('api key') || error.toLowerCase().includes('configuration')) {
      return 'Please check your API keys in the environment variables.';
    }
    if (error.toLowerCase().includes('url') || error.toLowerCase().includes('scrape')) {
      return 'Please check the URL and try again. Make sure the website is accessible.';
    }
    if (error.toLowerCase().includes('credits') || error.toLowerCase().includes('insufficient')) {
      return 'You need more credits to perform this analysis. Please upgrade your plan.';
    }
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return 'Please check your internet connection and try again.';
    }
    return 'Please try again or contact support if the problem persists.';
  };

  const guidance = getErrorGuidance(error);

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
          <p className="text-sm text-red-700 mb-2">{error}</p>
          <p className="text-xs text-red-600 mb-3">{guidance}</p>
          
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded border border-red-200 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}