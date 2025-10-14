import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface Step {
  label: string;
  completed: boolean;
  current?: boolean;
}

export function ProgressTracker({ steps }: { steps: Step[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Progress</h4>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${step.completed ? 'bg-green-100 text-green-600' :
                  step.current ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' :
                  'bg-gray-100 text-gray-400'}
              `}>
                {step.completed ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              <span className={`text-xs mt-2 text-center max-w-[80px] ${
                step.current ? 'font-semibold text-gray-900' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                step.completed ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Usage example:
// <ProgressTracker steps={[
//   { label: 'Analyze', completed: true },
//   { label: 'Identify Gaps', completed: true },
//   { label: 'Fix Content', current: true, completed: false },
//   { label: 'Verify', completed: false },
//   { label: 'Re-test', completed: false }
// ]} />

