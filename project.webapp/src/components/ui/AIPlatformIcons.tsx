import React from 'react';

interface AIIconProps {
  className?: string;
  size?: number;
}

function MultiSourceBrandIcon({ sources, alt, size = 16, className = '' }: { sources: string[]; alt: string; size?: number; className?: string }) {
  const [idx, setIdx] = React.useState(0);
  if (idx >= sources.length) return null;
  const src = sources[idx];
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => setIdx((i) => i + 1)}
      loading="lazy"
      decoding="async"
    />
  );
}

// ChatGPT Icon (fallback vector)
export const ChatGPTIcon: React.FC<AIIconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 4.5c-3.75 0-4.5 2.5-4.5 3.75 0 .9.45 1.8 1.2 2.25-.6 1.05-.6 2.25 0 3.3-.75.45-1.2 1.35-1.2 2.25 0 1.25.75 3.75 4.5 3.75s4.5-2.5 4.5-3.75c0-.9-.45-1.8-1.2-2.25.6-1.05.6-2.25 0-3.3.75-.45 1.2-1.35 1.2-2.25 0-1.25-.75-3.75-4.5-3.75z" fill="currentColor" opacity=".2" />
  </svg>
);

// Gemini Icon (fallback)
export const GeminiIcon: React.FC<AIIconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <linearGradient id="gemini-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4" />
        <stop offset="50%" stopColor="#9B72F2" />
        <stop offset="100%" stopColor="#D96570" />
      </linearGradient>
    </defs>
    <path d="M12 2L4 6l8 4 8-4-8-4z" fill="url(#gemini-g)" />
    <path d="M4 18l8 4 8-4-8-4-8 4z" fill="url(#gemini-g)" opacity=".7" />
  </svg>
);

// Perplexity Icon (fallback)
export const PerplexityIcon: React.FC<AIIconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="5" fill="#1FB6FF" />
    <path d="M8 8l4 4 4-4M8 16l4-4 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Claude Icon (fallback)
export const ClaudeIcon: React.FC<AIIconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="5" fill="#D4A574" />
    <path d="M8 7s1 2 4 2 4-2 4-2M8 17s1-2 4-2 4 2 4 2M8 12h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const AIPlatformIcon: React.FC<{ platform: string; className?: string; size?: number }> = ({ platform, className = '', size = 16 }) => {
  const name = platform.toLowerCase();
  if (name.includes('chatgpt') || name.includes('gpt')) {
    // Try exact assets first (svg then png), then fallback vector
    return (
      <>
        <MultiSourceBrandIcon sources={["/icons/chatgpt.svg", "/icons/chatgpt.png", "/chatgpt.svg", "/chatgpt.png"]} alt="ChatGPT" size={size} className={className} />
        <ChatGPTIcon className={className} size={size} />
      </>
    );
  }
  if (name.includes('gemini')) {
    return (
      <>
        <MultiSourceBrandIcon sources={["/icons/gemini.svg", "/icons/gemini.png"]} alt="Gemini" size={size} className={className} />
        <GeminiIcon className={className} size={size} />
      </>
    );
  }
  if (name.includes('perplexity')) {
    return (
      <>
        <MultiSourceBrandIcon sources={["/icons/perplexity.svg", "/icons/perplexity.png"]} alt="Perplexity" size={size} className={className} />
        <PerplexityIcon className={className} size={size} />
      </>
    );
  }
  if (name.includes('claude')) {
    return (
      <>
        <MultiSourceBrandIcon sources={["/icons/claude.svg", "/icons/claude.png"]} alt="Claude" size={size} className={className} />
        <ClaudeIcon className={className} size={size} />
      </>
    );
  }
  return <ChatGPTIcon className={className} size={size} />;
};

export default AIPlatformIcon;

