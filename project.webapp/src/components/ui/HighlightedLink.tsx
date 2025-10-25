import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface HighlightedLinkProps {
  value: string | undefined | null;
  displayText?: string;
  className?: string;
}

function ensureHref(value: string): string {
  try {
    if (!value) return '';
    const lower = value.trim();
    if (/^https?:\/\//i.test(lower)) return lower;
    if (lower.startsWith('www.')) return `https://${lower}`;
    // Heuristic: looks like a domain
    if (/^[\w.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(lower)) {
      return `https://${lower}`;
    }
    return lower;
  } catch {
    return value;
  }
}

function getDisplay(value: string, displayText?: string): string {
  if (displayText) return displayText;
  try {
    const cleaned = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    // Truncate long paths to keep it tidy
    return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
  } catch {
    return value;
  }
}

export const HighlightedLink: React.FC<HighlightedLinkProps> = ({ value, displayText, className }) => {
  if (!value) return null;
  const href = ensureHref(value);
  const display = getDisplay(value, displayText);
  const isUrl = /^(https?:\/\/|www\.)/i.test(value) || /\.[A-Za-z]{2,}/.test(value);

  const baseClasses = 'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-sm font-medium';
  // Updated to simple white background with subtle gray border and hover
  const highlightClasses = 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 transition-colors';

  if (isUrl) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${highlightClasses} ${className || ''}`.trim()}
        title={href}
      >
        <LinkIcon className="w-3.5 h-3.5 text-gray-600" />
        <span className="truncate max-w-[52ch]">{display}</span>
      </a>
    );
  }

  return (
    <span className={`${baseClasses} ${highlightClasses} ${className || ''}`.trim()} title={display}>
      {display}
    </span>
  );
};

export default HighlightedLink;
