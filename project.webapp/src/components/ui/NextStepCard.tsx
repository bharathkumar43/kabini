import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';

export interface NextStepCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText: string;
  actionPath: string;
  actionState?: any;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'default';
  badge?: string;
  className?: string;
}

export function NextStepCard({
  title,
  description,
  icon,
  actionText,
  actionPath,
  actionState,
  variant = 'info',
  badge,
  className = ''
}: NextStepCardProps) {
  const navigate = useNavigate();

  const variantStyles = {
    info: {
      container: 'bg-blue-50 border-blue-200',
      title: 'text-blue-900',
      description: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-600'
    },
    success: {
      container: 'bg-green-50 border-green-200',
      title: 'text-green-900',
      description: 'text-green-800',
      button: 'bg-green-600 hover:bg-green-700',
      icon: 'text-green-600'
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      title: 'text-amber-900',
      description: 'text-amber-800',
      button: 'bg-amber-600 hover:bg-amber-700',
      icon: 'text-amber-600'
    },
    error: {
      container: 'bg-red-50 border-red-200',
      title: 'text-red-900',
      description: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700',
      icon: 'text-red-600'
    },
    default: {
      container: 'bg-gray-50 border-gray-200',
      title: 'text-gray-900',
      description: 'text-gray-700',
      button: 'bg-gray-600 hover:bg-gray-700',
      icon: 'text-gray-600'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.container} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold ${styles.title}`}>
              {title}
            </h3>
            {badge && (
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-300 text-gray-700 font-medium">
                {badge}
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${styles.description}`}>
            {description}
          </p>
          <button
            onClick={() => navigate(actionPath, { state: actionState })}
            className={`mt-3 ${styles.button} text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 hover:shadow-md`}
          >
            {actionText}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export interface NextStepSectionProps {
  title?: string;
  cards: NextStepCardProps[];
  className?: string;
}

export function NextStepSection({
  title = "What's Next?",
  cards,
  className = ''
}: NextStepSectionProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className={`mt-8 border-t pt-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, index) => (
          <NextStepCard key={index} {...card} />
        ))}
      </div>
    </div>
  );
}

// Helper function to generate smart suggestions based on analysis results
export function generateSuggestions(
  currentPage: string,
  analysisData?: any
): NextStepCardProps[] {
  const suggestions: NextStepCardProps[] = [];

  // You can customize these based on your analysis data structure
  switch (currentPage) {
    case 'competitor-insight':
      suggestions.push({
        title: '📊 Dive Deeper into Products',
        description: 'Analyze sentiment, authority signals, and FAQs for each competitor',
        icon: <span className="text-2xl">📊</span>,
        actionText: 'Go to Product Insights',
        actionPath: '/product-insights',
        actionState: { analysisData },
        variant: 'info',
        badge: 'Recommended'
      });
      
      if (analysisData?.isOutperformed) {
        suggestions.push({
          title: '⚠️ Competitors are Ahead',
          description: "Let's improve your content to catch up with the competition",
          icon: <span className="text-2xl">⚠️</span>,
          actionText: 'Enhance Content',
          actionPath: '/enhance-content',
          variant: 'warning'
        });
      }
      break;

    case 'product-insights':
      if (analysisData?.hasAttributeGaps) {
        suggestions.push({
          title: '💡 Fill Content Gaps',
          description: `Competitors mention key attributes more frequently. Add them to your content.`,
          icon: <span className="text-2xl">💡</span>,
          actionText: 'Generate Content',
          actionPath: '/enhance-content',
          actionState: { suggestedKeywords: analysisData.missingAttributes },
          variant: 'success'
        });
      }
      
      if (analysisData?.lowAuthorityScore) {
        suggestions.push({
          title: '🔍 Boost Authority',
          description: 'Add schema markup and structured data to improve trust signals',
          icon: <span className="text-2xl">🔍</span>,
          actionText: 'Check Structure',
          actionPath: '/content-structure-analysis',
          variant: 'info'
        });
      }
      break;

    case 'content-enhancement':
      suggestions.push({
        title: '✅ Verify Structure',
        description: 'Audit your content with GEO score to ensure AI-readiness',
        icon: <span className="text-2xl">✅</span>,
        actionText: 'Run Structure Analysis',
        actionPath: '/content-structure-analysis',
        variant: 'info'
      });
      
      suggestions.push({
        title: '🔍 Compare Results',
        description: 'See how your enhanced content compares to competitors',
        icon: <span className="text-2xl">🔍</span>,
        actionText: 'View Content Analysis',
        actionPath: '/ecommerce-content-analysis',
        variant: 'default'
      });
      break;

    case 'structure-analysis':
      if (analysisData?.geoScore && analysisData.geoScore < 60) {
        suggestions.push({
          title: '🚨 Low GEO Score',
          description: 'Your content needs enhancement to rank better in AI search',
          icon: <span className="text-2xl">🚨</span>,
          actionText: 'Enhance Content',
          actionPath: '/enhance-content',
          actionState: { focusArea: 'schema' },
          variant: 'error'
        });
      } else if (analysisData?.geoScore && analysisData.geoScore >= 80) {
        suggestions.push({
          title: '🎉 Great Structure!',
          description: 'Now let\'s see how you compare to competitors',
          icon: <span className="text-2xl">🎉</span>,
          actionText: 'Check Visibility',
          actionPath: '/ai-visibility-analysis',
          variant: 'success'
        });
      }
      break;

    case 'content-analysis':
      if (analysisData?.gapCount > 0) {
        suggestions.push({
          title: '🎯 Improvement Opportunities',
          description: `Found ${analysisData.gapCount} gaps to address in your content`,
          icon: <span className="text-2xl">🎯</span>,
          actionText: 'Generate Better Content',
          actionPath: '/enhance-content',
          actionState: { gaps: analysisData.identifiedGaps },
          variant: 'info'
        });
      }
      
      suggestions.push({
        title: '📊 Full Benchmark',
        description: 'See complete competitor visibility analysis',
        icon: <span className="text-2xl">📊</span>,
        actionText: 'View Competitor Insight',
        actionPath: '/ai-visibility-analysis',
        variant: 'default'
      });
      break;

    default:
      break;
  }

  return suggestions;
}

