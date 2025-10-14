import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ActionCardProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonPath: string;
  buttonState?: any;
  badge?: string;
  secondaryButton?: {
    text: string;
    path: string;
    state?: any;
  };
}

export function ActionCard({
  variant = 'info',
  icon,
  title,
  description,
  buttonText,
  buttonPath,
  buttonState,
  badge,
  secondaryButton
}: ActionCardProps) {
  const navigate = useNavigate();

  const variantStyles = {
    primary: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-gray-50 border-gray-200'
  };

  const buttonStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    error: 'bg-red-600 hover:bg-red-700',
    info: 'bg-gray-600 hover:bg-gray-700'
  };

  return (
    <div className={`${variantStyles[variant]} border rounded-lg p-6`}>
      <div className="flex items-start gap-4">
        <div className="text-4xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            {badge && (
              <span className="text-xs bg-white px-2 py-1 rounded-full border border-gray-300 font-medium">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-4">
            {description}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(buttonPath, { state: buttonState })}
              className={`${buttonStyles[variant]} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm hover:shadow-md`}
            >
              {buttonText}
              <ArrowRight className="w-4 h-4" />
            </button>
            {secondaryButton && (
              <button
                onClick={() => navigate(secondaryButton.path, { state: secondaryButton.state })}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                {secondaryButton.text}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Next Steps Section Container
export function NextStepsSection({ 
  children,
  title = "What's Next?"
}: { 
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Quick Action Grid for Dashboard
interface QuickActionProps {
  icon: string;
  label: string;
  description: string;
  path: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo';
}

export function QuickActionCard({ 
  icon, 
  label, 
  description, 
  path,
  color = 'blue'
}: QuickActionProps) {
  const navigate = useNavigate();

  const colorStyles = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 border-green-200',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    amber: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    red: 'bg-red-50 hover:bg-red-100 border-red-200',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
  };

  return (
    <button
      onClick={() => navigate(path)}
      className={`${colorStyles[color]} border rounded-xl p-6 text-left transition-all duration-200 hover:shadow-md group w-full`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {label}
          </h3>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </button>
  );
}

