import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Home } from 'lucide-react';

// Breadcrumb Component
interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4 flex-wrap">
      <button
        onClick={() => navigate('/overview')}
        className="hover:text-blue-600 transition-colors flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          {item.path ? (
            <button
              onClick={() => navigate(item.path)}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-gray-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Back Button Component
export function BackButton({ 
  to = '/overview', 
  label = 'Back' 
}: { 
  to?: string; 
  label?: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}

// Context Banner (shows when coming from another page with state)
export function ContextBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  if (!state?.fromPage) return null;

  const pageNames: Record<string, string> = {
    'product-insights': 'Product Insights',
    'competitor-insight': 'Competitor Insight',
    'ai-visibility-analysis': 'Competitor Insight',
    'content-analysis': 'Content Analysis',
    'ecommerce-content-analysis': 'Content Analysis',
    'structure-analysis': 'Structure Analysis',
    'content-structure-analysis': 'Structure Analysis',
    'content-enhancement': 'Content Enhancement',
    'enhance-content': 'Content Enhancement'
  };

  const backPaths: Record<string, string> = {
    'product-insights': '/product-insights',
    'competitor-insight': '/ai-visibility-analysis',
    'ai-visibility-analysis': '/ai-visibility-analysis',
    'content-analysis': '/ecommerce-content-analysis',
    'ecommerce-content-analysis': '/ecommerce-content-analysis',
    'structure-analysis': '/content-structure-analysis',
    'content-structure-analysis': '/content-structure-analysis',
    'content-enhancement': '/enhance-content',
    'enhance-content': '/enhance-content'
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <p className="text-sm font-medium text-blue-900">
            You came from {pageNames[state.fromPage] || 'another page'}
          </p>
          {state.message && (
            <p className="text-sm text-blue-700 mt-1">{state.message}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate(backPaths[state.fromPage] || '/overview')}
        className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0 ml-4"
      >
        Go back →
      </button>
    </div>
  );
}

