import React from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function SuccessMessage({ message, onDismiss, duration = 5000 }: SuccessMessageProps) {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg max-w-md animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-green-800 mb-1">Success</h4>
          <p className="text-sm text-green-700">{message}</p>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
} 