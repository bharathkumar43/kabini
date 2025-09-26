import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Loader2, RefreshCw, Download, Target, Globe, Zap, ShoppingCart, Package, Tag, Search, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { useNavigate } from 'react-router-dom';
import SuccessNotification from './ui/SuccessNotification';

interface FAQItem {
  question: string;
  answer: string;
}

interface ProductContent {
  shortDescription: string;
  longDescription: string;
  features: string[];
  benefits: string[];
  comparison: string;
  specs: { [key: string]: string };
  useCases: string[];
  keywords: string[];
  altText: string[];
  metaTags: {
    title: string;
    description: string;
    keywords: string;
  };
}

interface CategoryContent {
  intro: string;
  buyingGuide: string;
  comparisonChart: string;
  faqs: FAQItem[];
  internalLinks: string[];
}

interface EcommerceContent {
  productContent?: ProductContent;
  categoryContent?: CategoryContent;
  faqs: FAQItem[];
  seoRecommendations: {
    schemaSuggestions: string[];
    contentDepthScore: number;
    aiOptimizationTips: string[];
    technicalSeoReminders: string[];
  };
}

interface SessionData {
  id: string;
  name: string;
  type: string;
  timestamp: string;
  model: string;
  questionProvider: string | null;
  answerProvider: string | null;
  questionModel: string | null;
  answerModel: string | null;
  blogContent: string;
  blogUrl?: string;
  sourceUrls?: string[];
  qaData: FAQItem[];
  totalInputTokens: number;
  totalOutputTokens: number;
  statistics: {
    totalQuestions: number;
    avgAccuracy: string;
    avgCitationLikelihood: string;
    totalCost: string;
  };
  userId: string;
  generatedQuestions?: string[];
  showQuestionsSection?: boolean;
  showFAQSection?: boolean;
}

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

export function FAQContentAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Industry Selection State - Only e-commerce now
  const [selectedIndustry, setSelectedIndustry] = useState<'ecommerce'>('ecommerce');
  const [contentType, setContentType] = useState<'product' | 'category' | 'faq'>('product');
  
  // FAQ Generation State
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [isGeneratingFAQs, setIsGeneratingFAQs] = useState(false);
  
  // E-commerce Content State
  const [ecommerceContent, setEcommerceContent] = useState<EcommerceContent | null>(null);
  const [isGeneratingEcommerce, setIsGeneratingEcommerce] = useState(false);
  
  // E-commerce Questions and Answers State
  const [ecomGeneratedQuestions, setEcomGeneratedQuestions] = useState<string[]>([]);
  const [ecomSelectedQuestions, setEcomSelectedQuestions] = useState<Set<number>>(new Set());
  const [isGeneratingEcomQuestions, setIsGeneratingEcomQuestions] = useState(false);
  const [isGeneratingEcomAnswers, setIsGeneratingEcomAnswers] = useState(false);
  const [showEcomQuestionsSection, setShowEcomQuestionsSection] = useState(false);
  const [showEcomFAQSection, setShowEcomFAQSection] = useState(false);

  // Persist e-commerce content and selected tab across navigation
  const ECOMMERCE_CONTENT_KEY = 'kabini_ecommerce_content';
  const ECOMMERCE_CONTENT_TYPE_KEY: 'kabini_ecommerce_content_type' = 'kabini_ecommerce_content_type';

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ECOMMERCE_CONTENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeEcommerceContent(parsed);
        if (normalized) setEcommerceContent(normalized);
      }
      const savedType = localStorage.getItem(ECOMMERCE_CONTENT_TYPE_KEY);
      if (savedType === 'product' || savedType === 'category' || savedType === 'faq') {
        setContentType(savedType as 'product' | 'category' | 'faq');
      }
    } catch (_err) {
      // ignore persistence errors
    }
  }, []);

  // Save when content changes
  useEffect(() => {
    try {
      if (ecommerceContent) {
        localStorage.setItem(ECOMMERCE_CONTENT_KEY, JSON.stringify(ecommerceContent));
      } else {
        localStorage.removeItem(ECOMMERCE_CONTENT_KEY);
      }
    } catch (_err) {}
  }, [ecommerceContent]);

  // Save current tab
  useEffect(() => {
    try {
      localStorage.setItem(ECOMMERCE_CONTENT_TYPE_KEY, contentType);
    } catch (_err) {}
  }, [contentType]);

  // Only clear content when leaving e-commerce industry
  useEffect(() => {
    if (selectedIndustry !== 'ecommerce') {
      setEcommerceContent(null);
    }
  }, [selectedIndustry]);
  
  // Product Content Inputs
  const [productInputs, setProductInputs] = useState({
    name: '',
    features: '',
    targetAudience: '',
    category: '',
    tone: 'professional' as 'casual' | 'professional' | 'persuasive'
  });
  
  // Category Content Inputs
  const [categoryInputs, setCategoryInputs] = useState({
    categoryName: '',
    productTypes: '',
    audience: ''
  });
  const [faqProvider, setFaqProvider] = useState('gemini');
  const [faqModel, setFaqModel] = useState('gemini-1.5-flash');
  const [faqTargetKeywords, setFaqTargetKeywords] = useState<string[]>([]);
  const [showFAQSection, setShowFAQSection] = useState(false);
  const [showQuestionsSection, setShowQuestionsSection] = useState(false);
  const [pendingFAQGeneration, setPendingFAQGeneration] = useState<{
    content: string;
    provider: string;
    model: string;
    targetKeywords: string[];
    timestamp: number;
  } | null>(null);
  
  // Content input state
  const [content, setContent] = useState('');
  const [urls, setUrls] = useState<Array<{url: string, content: string, status: string}>>([]);
  const [newUrl, setNewUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [crawling, setCrawling] = useState(false);
  
  // E-commerce FAQ additional content state
  const [ecomFaqContent, setEcomFaqContent] = useState('');
  
  // History and sessions
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  // Notification state
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  // Textarea refs for auto-expansion
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ecomTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Helper function to get user-specific storage keys
  const getUserSpecificKey = (baseKey: string, userId: string) => `${baseKey}_${userId}`;
  const getFaqPersistKey = () => getUserSpecificKey('faq_last_persisted', (user?.id || 'anonymous') as string);
  
  // Helper function to detect if content is a URL
  const isUrl = (text: string): boolean => {
    try {
      new URL(text.trim());
      return true;
    } catch {
      return false;
    }
  };
  
  // Helper function to extract URL from content
  const extractUrl = (content: string): string | null => {
    const trimmed = content.trim();
    if (isUrl(trimmed)) {
      return trimmed;
    }
    // Check if content contains a URL
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = trimmed.match(urlRegex);
    return matches ? matches[0] : null;
  };
  
  // Auto-expand textarea when content changes
  useEffect(() => {
    if (textareaRef.current && content) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [content]);
  
  // Auto-expand e-commerce extra textarea when content changes
  useEffect(() => {
    if (ecomTextareaRef.current && ecomFaqContent) {
      ecomTextareaRef.current.style.height = 'auto';
      const newHeight = Math.max(36, Math.min(ecomTextareaRef.current.scrollHeight, 150));
      ecomTextareaRef.current.style.height = newHeight + 'px';
    }
  }, [ecomFaqContent]);
  
  // Auto-set model based on provider
  useEffect(() => {
    switch (faqProvider) {
      case 'gemini':
        setFaqModel('gemini-1.5-flash');
        break;
      case 'openai':
        setFaqModel('gpt-3.5-turbo');
        break;
      case 'perplexity':
        setFaqModel('sonar');
        break;
      case 'claude':
        setFaqModel('claude-3-sonnet-20240229');
        break;
      default:
        setFaqModel('gemini-1.5-flash');
    }
  }, [faqProvider]);
  
  // Load sessions from localStorage when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      const userSessionsKey = getUserSpecificKey(SESSIONS_KEY, user.id);
      const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
      
      console.log('[FAQ Session] Loading sessions from localStorage:', {
        userSessionsKey,
        userCurrentSessionKey,
        userId: user.id
      });
      
      try {
        // Load sessions
        const savedSessions = localStorage.getItem(userSessionsKey);
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          console.log('[FAQ Session] Loaded sessions:', parsedSessions.length);
          setSessions(parsedSessions);
        }
        
        // Load current session
        const savedCurrentSession = localStorage.getItem(userCurrentSessionKey);
        if (savedCurrentSession) {
          const parsedCurrentSession = JSON.parse(savedCurrentSession);
          console.log('[FAQ Session] Loaded current session:', {
            id: parsedCurrentSession.id,
            type: parsedCurrentSession.type,
            qaDataLength: parsedCurrentSession.qaData?.length || 0,
            questionsLength: parsedCurrentSession.generatedQuestions?.length || 0,
            showQuestionsSection: parsedCurrentSession.showQuestionsSection,
            showFAQSection: parsedCurrentSession.showFAQSection
          });
          setCurrentSession(parsedCurrentSession);
        } else {
          console.log('[FAQ Session] No current session found in localStorage');
        }
      } catch (error) {
        console.error('[Session Loading] Error loading sessions:', error);
      }
    }
  }, [user?.id]);
  
  // Restore last persisted FAQ UI state if no current session (navigation persistence)
  useEffect(() => {
    try {
      if (currentSession) return; // Prefer restoring from session if present
      const key = getFaqPersistKey();
      const persisted = localStorage.getItem(key);
      if (!persisted) return;
      const parsed = JSON.parse(persisted);
      // Optional freshness window: 24h
      if (parsed?.savedAt && (Date.now() - parsed.savedAt) > 24 * 60 * 60 * 1000) return;

      console.log('[FAQ Persist] Restoring last persisted FAQ state');
      if (parsed.selectedIndustry === 'general' || parsed.selectedIndustry === 'ecommerce') {
        setSelectedIndustry(parsed.selectedIndustry);
      }
      if (parsed.contentType === 'product' || parsed.contentType === 'category' || parsed.contentType === 'faq') {
        setContentType(parsed.contentType);
      }
      if (typeof parsed.content === 'string') setContent(parsed.content);
      if (typeof parsed.ecomFaqContent === 'string') setEcomFaqContent(parsed.ecomFaqContent);
      if (Array.isArray(parsed.generatedQuestions)) setGeneratedQuestions(parsed.generatedQuestions);
      if (Array.isArray(parsed.ecomGeneratedQuestions)) setEcomGeneratedQuestions(parsed.ecomGeneratedQuestions);
      if (Array.isArray(parsed.faqs)) setFaqs(parsed.faqs);
      if (typeof parsed.showEcomQuestionsSection === 'boolean') setShowEcomQuestionsSection(parsed.showEcomQuestionsSection);
      if (typeof parsed.showEcomFAQSection === 'boolean') setShowEcomFAQSection(parsed.showEcomFAQSection);
      if (typeof parsed.faqProvider === 'string') setFaqProvider(parsed.faqProvider);
      if (typeof parsed.faqModel === 'string') setFaqModel(parsed.faqModel);
      if (typeof parsed.showQuestionsSection === 'boolean') setShowQuestionsSection(parsed.showQuestionsSection);
      if (typeof parsed.showFAQSection === 'boolean') setShowFAQSection(parsed.showFAQSection);
      if (parsed.ecommerceContent) {
        const normalized = normalizeEcommerceContent(parsed.ecommerceContent);
        if (normalized) setEcommerceContent(normalized);
      }
    } catch (e) {
      console.warn('[FAQ Persist] Failed to restore persisted FAQ state:', e);
    }
  }, [currentSession, user?.id]);
  
  // Persist FAQ UI state for navigation
  useEffect(() => {
    try {
      const payload = {
        selectedIndustry,
        contentType,
        content,
        ecomFaqContent,
        generatedQuestions,
        ecomGeneratedQuestions,
        faqs,
        faqProvider,
        faqModel,
        showQuestionsSection,
        showFAQSection,
        showEcomQuestionsSection,
        showEcomFAQSection,
        ecommerceContent,
        savedAt: Date.now()
      };
      localStorage.setItem(getFaqPersistKey(), JSON.stringify(payload));
    } catch (e) {
      // Ignore quota errors silently
    }
  }, [selectedIndustry, contentType, content, ecomFaqContent, generatedQuestions, ecomGeneratedQuestions, faqs, faqProvider, faqModel, showQuestionsSection, showFAQSection, showEcomQuestionsSection, showEcomFAQSection, ecommerceContent, user?.id]);
  
  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (user?.id && sessions.length > 0) {
      const userSessionsKey = getUserSpecificKey(SESSIONS_KEY, user.id);
      try {
        localStorage.setItem(userSessionsKey, JSON.stringify(sessions));
      } catch (error) {
        console.error('[Session Saving] Error saving sessions:', error);
      }
    }
  }, [sessions, user?.id]);
  
  // Save current session to localStorage whenever it changes
  useEffect(() => {
    if (user?.id && currentSession) {
      const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
      try {
        console.log('[FAQ Session] Saving current session to localStorage:', {
          key: userCurrentSessionKey,
          sessionId: currentSession.id,
          sessionType: currentSession.type,
          qaDataLength: currentSession.qaData?.length || 0,
          questionsLength: currentSession.generatedQuestions?.length || 0,
          showQuestionsSection: currentSession.showQuestionsSection,
          showFAQSection: currentSession.showFAQSection
        });
        localStorage.setItem(userCurrentSessionKey, JSON.stringify(currentSession));
      } catch (error) {
        console.error('[Session Saving] Error saving current session:', error);
      }
    }
  }, [currentSession, user?.id]);
  
  // Clear sessions when user logs out
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSession(null);
      setExpandedSessions(new Set());
      // Clear FAQ state on logout
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
      setContent('');
      setIsGeneratingQuestions(false);
      setIsGeneratingAnswers(false);
      setPendingFAQGeneration(null);
    }
  }, [user]);
  
  // Restore FAQ state when current session changes
  useEffect(() => {
    if (currentSession && currentSession.type === 'faq') {
      console.log('[FAQ Session] Restoring FAQ session:', {
        id: currentSession.id,
        qaDataLength: currentSession.qaData?.length || 0,
        questionsLength: currentSession.generatedQuestions?.length || 0,
        blogContentLength: currentSession.blogContent?.length || 0,
        showQuestionsSection: currentSession.showQuestionsSection,
        showFAQSection: currentSession.showFAQSection
      });
      
      // Restore basic FAQ state
      setFaqs(currentSession.qaData || []);
      setContent(currentSession.blogContent || '');
      setFaqProvider(currentSession.questionProvider || 'gemini');
      setFaqModel(currentSession.questionModel || (currentSession.questionProvider === 'perplexity' ? 'sonar' : currentSession.questionProvider === 'claude' ? 'claude-3-sonnet-20240229' : 'gemini-1.5-flash'));
      
      // Restore questions state
      setGeneratedQuestions(currentSession.generatedQuestions || []);
      setShowQuestionsSection(currentSession.showQuestionsSection || false);
      setShowFAQSection(currentSession.showFAQSection || false);
      
      // Reset textarea height to accommodate content
      if (textareaRef.current && currentSession.blogContent) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
            textareaRef.current.style.height = newHeight + 'px';
          }
        }, 100);
      }
    } else if (currentSession && currentSession.type !== 'faq') {
      // Clear FAQ state if current session is not an FAQ session
      console.log('[FAQ Session] Clearing FAQ state - current session is not FAQ type:', currentSession.type);
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
    } else if (!currentSession) {
      // Clear FAQ state if no current session
      console.log('[FAQ Session] Clearing FAQ state - no current session');
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
    }
  }, [currentSession]);
  
  // Check for pending FAQ generation and completed FAQs on component mount
  useEffect(() => {
    if (user?.id) {
      const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
      const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
      
      try {
        // Check for pending generation
        const pending = localStorage.getItem(pendingKey);
        if (pending) {
          const pendingData = JSON.parse(pending);
          const now = Date.now();
          const timeDiff = now - pendingData.timestamp;
          
          // If pending generation is less than 5 minutes old, continue it
          if (timeDiff < 5 * 60 * 1000) {
            setPendingFAQGeneration(pendingData);
            setIsGeneratingQuestions(true);
            setContent(pendingData.content);
            setFaqProvider(pendingData.provider);
            setFaqModel(pendingData.model);
            setFaqTargetKeywords(pendingData.targetKeywords);
            
            // Continue the FAQ generation
            continuePendingFAQGeneration(pendingData);
          } else {
            // Clear old pending generation
            localStorage.removeItem(pendingKey);
          }
        }
        
        // Check for completed FAQs that were generated in background
        const generatedFAQs = localStorage.getItem(generatedFAQsKey);
        if (generatedFAQs) {
          const faqData = JSON.parse(generatedFAQs);
          const now = Date.now();
          const timeDiff = now - faqData.timestamp;
          
          // If generated FAQs are less than 10 minutes old, restore them
          if (timeDiff < 10 * 60 * 1000) {
            console.log('[Background FAQ] Restoring generated FAQs:', faqData.faqs.length);
            
            // Use setTimeout to ensure state updates happen after component is fully mounted
            setTimeout(() => {
              setFaqs(faqData.faqs);
              setShowFAQSection(true);
              setContent(faqData.content);
              setFaqProvider(faqData.provider);
              setFaqModel(faqData.model);
              setIsGeneratingFAQs(false);
              const faqText = faqData.faqs.length === 1 ? 'FAQ' : 'FAQs';
              setNotificationMessage(`Restored ${faqData.faqs.length} previously generated ${faqText}!`);
            }, 100);
            
            // Clear the generated FAQs from localStorage
            localStorage.removeItem(generatedFAQsKey);
          } else {
            // Clear old generated FAQs
            localStorage.removeItem(generatedFAQsKey);
          }
        }
      } catch (error) {
        console.error('[Background FAQ] Error loading background data:', error);
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(generatedFAQsKey);
      }
    }
  }, [user?.id]);
  
  // Continue pending FAQ generation
  const continuePendingFAQGeneration = async (pendingData: any) => {
    try {
      console.log('[Pending FAQ] Continuing FAQ generation for content length:', pendingData.content.length);
      
      const response = await apiService.generateAIFAQs({
        content: pendingData.content.trim(),
        provider: pendingData.provider,
        model: pendingData.model,
        targetKeywords: pendingData.targetKeywords
      });
      
      if (response.faqs && Array.isArray(response.faqs) && response.faqs.length > 0) {
        console.log('[Pending FAQ] Successfully generated FAQs:', response.faqs.length);
        
        // Save generated FAQs to localStorage immediately for background processing
        if (user?.id) {
          const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
          const faqData = {
            faqs: response.faqs,
            content: pendingData.content,
            provider: pendingData.provider,
            model: pendingData.model,
            timestamp: Date.now()
          };
          localStorage.setItem(generatedFAQsKey, JSON.stringify(faqData));
        }
        
        setFaqs(response.faqs);
        setShowFAQSection(true);
        setIsGeneratingFAQs(false);
        setPendingFAQGeneration(null);
        
        // Clear pending generation from localStorage
        if (user?.id) {
          const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
          localStorage.removeItem(pendingKey);
        }
        
        // Save to history
        if (user?.id) {
          const extractedUrl = extractUrl(pendingData.content);
          const newSession: SessionData = {
            id: `faq-session-${Date.now()}`,
            name: `FAQ Session - ${new Date().toLocaleDateString()}`,
            type: 'faq',
            timestamp: new Date().toISOString(),
            model: pendingData.model,
            questionProvider: pendingData.provider,
            answerProvider: pendingData.provider,
            questionModel: pendingData.model,
            answerModel: pendingData.model,
            blogContent: pendingData.content,
            blogUrl: extractedUrl || undefined,
            sourceUrls: extractedUrl ? [extractedUrl] : undefined,
            qaData: response.faqs.map(faq => ({
              question: faq.question,
              answer: faq.answer
            })),
            totalInputTokens: pendingData.content.length / 4,
            totalOutputTokens: response.faqs.reduce((sum, faq) => sum + faq.question.length + faq.answer.length, 0) / 4,
            statistics: {
              totalQuestions: response.faqs.length,
              avgAccuracy: '85',
              avgCitationLikelihood: '75',
              totalCost: '0.01'
            },
            userId: user.id
          };
          
          setSessions(prev => {
            const updatedSessions = [newSession, ...prev];
            return updatedSessions;
          });
          setCurrentSession(newSession);
        }
        
        const faqText = response.faqs.length === 1 ? 'FAQ' : 'FAQs';
        setNotificationMessage(`Successfully generated ${response.faqs.length} ${faqText}!`);
      } else {
        console.error('[Pending FAQ] Invalid response format:', response);
        setNotificationMessage('Failed to generate FAQs. Please try again.');
        setIsGeneratingFAQs(false);
        setPendingFAQGeneration(null);
        
        // Clear pending generation from localStorage
        if (user?.id) {
          const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
          localStorage.removeItem(pendingKey);
        }
      }
    } catch (error) {
      console.error('[Pending FAQ] Error generating FAQs:', error);
      setNotificationMessage('Error generating FAQs. Please try again.');
      setIsGeneratingFAQs(false);
      setPendingFAQGeneration(null);
      
      // Clear pending generation from localStorage
      if (user?.id) {
        const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
        localStorage.removeItem(pendingKey);
      }
    }
  };
  
  // Generate Questions Function (Step 1)
  const generateQuestions = async () => {
    if (!content.trim()) {
      setNotificationMessage('Please enter some content first');
      return;
    }
    
    // Validate content - check if it contains meaningful text
    const trimmedContent = content.trim();
    
    // Check if content is a valid URL
    const isValidUrl = (text: string): boolean => {
      try {
        new URL(text);
        return true;
      } catch {
        return false;
      }
    };
    
    // If it's a valid URL, allow it
    if (isValidUrl(trimmedContent)) {
      // URL is valid, proceed with generation
    } else {
      // For non-URL content, apply validation rules
      
      // Check if content is only numbers
      if (/^\d+$/.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content is only emojis or special characters
      if (/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+$/u.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content is only single characters or very short meaningless text
      if (trimmedContent.length < 10 || /^[a-zA-Z\s]{1,10}$/.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content has meaningful words (not just repeated characters)
      const words = trimmedContent.split(/\s+/).filter(word => word.length > 0);
      if (words.length < 3) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
    }
    
    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
    
    try {
      // Generate questions using the same prompt structure
      const response = await apiService.generateAIFAQs({
        content: content.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        generateQuestionsOnly: true // New flag to generate only questions
      });
      
      if (response.success && response.questions) {
        // Extract questions from the response
        const questions = response.questions || [];
        setGeneratedQuestions(questions);
        setShowQuestionsSection(true);
        const questionText = questions.length === 1 ? 'question' : 'questions';
        setNotificationType('success');
        setNotificationMessage(`Generated ${questions.length} ${questionText} successfully!`);
        
        // Save questions to session immediately
        saveQuestionsToSession(questions);
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate questions. Please try again.');
      }
    } catch (error) {
      console.error('[Questions Generation] Error:', error);
      setNotificationType('error');
      setNotificationMessage('Error generating questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Generate E-commerce Questions Function
  const generateEcomQuestions = async () => {
    // Check if we have either product/category input or additional content
    const hasProductInput = (productInputs.name.trim() || categoryInputs.categoryName.trim());
    const hasAdditionalContent = ecomFaqContent.trim();
    
    if (!hasProductInput && !hasAdditionalContent) {
      setNotificationMessage('Please fill in product/category name or provide additional content');
      return;
    }
    
    // Validate additional content if provided (same validation as general section)
    if (hasAdditionalContent) {
      const trimmedContent = ecomFaqContent.trim();
      
      // Check if content is a valid URL
      const isValidUrl = (text: string): boolean => {
        try {
          new URL(text);
          return true;
        } catch {
          return false;
        }
      };
      
      // If it's a valid URL, allow it
      if (isValidUrl(trimmedContent)) {
        // URL is valid, proceed with generation
      } else {
        // For non-URL content, apply validation rules
        
        // Check if content is only numbers
        if (/^\d+$/.test(trimmedContent)) {
          setNotificationType('error');
          setNotificationMessage('Enter valid content');
          return;
        }
        
        // Check if content is only emojis or special characters
        if (/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+$/u.test(trimmedContent)) {
          setNotificationType('error');
          setNotificationMessage('Enter valid content');
          return;
        }
        
        // Check if content is only single characters or very short meaningless text
        if (trimmedContent.length < 10 || /^[a-zA-Z\s]{1,10}$/.test(trimmedContent)) {
          setNotificationType('error');
          setNotificationMessage('Enter valid content');
          return;
        }
        
        // Check if content has meaningful words (not just repeated characters)
        const words = trimmedContent.split(/\s+/).filter(word => word.length > 0);
        if (words.length < 3) {
          setNotificationType('error');
          setNotificationMessage('Enter valid content');
          return;
        }
      }
    }
    
    setIsGeneratingEcomQuestions(true);
    setEcomGeneratedQuestions([]);
    setEcomSelectedQuestions(new Set());
    setFaqs([]); // Clear previous FAQs when starting new analysis
    setShowEcomFAQSection(false);
    
    try {
      // Prepare content for question generation
      let contentForQuestions = '';
      
      if (hasProductInput) {
        // Use product/category information
        const productName = productInputs.name || categoryInputs.categoryName;
        const targetAudience = productInputs.targetAudience || '';
        contentForQuestions = `Product/Category: ${productName}\nTarget Audience: ${targetAudience}`;
      }
      
      if (hasAdditionalContent) {
        // Check if additional content is a URL and crawl it
        const trimmedContent = ecomFaqContent.trim();
        if (isUrl(trimmedContent)) {
          // It's a URL, crawl it first
          console.log('[E-commerce FAQ] Detected URL, crawling content:', trimmedContent);
          try {
            const urlResult = await apiService.extractContentFromUrl(trimmedContent);
            if (urlResult.success && urlResult.content) {
              const crawledContent = urlResult.content;
              if (contentForQuestions) {
                contentForQuestions += `\n\nAdditional Content from URL (${trimmedContent}):\n${crawledContent}`;
              } else {
                contentForQuestions = `Content from URL (${trimmedContent}):\n${crawledContent}`;
              }
              console.log('[E-commerce FAQ] Successfully crawled URL content, length:', crawledContent.length);
            } else {
              console.warn('[E-commerce FAQ] Failed to crawl URL, using URL as text');
              if (contentForQuestions) {
                contentForQuestions += `\n\nAdditional Content:\n${ecomFaqContent}`;
              } else {
                contentForQuestions = ecomFaqContent;
              }
            }
          } catch (urlError) {
            console.error('[E-commerce FAQ] Error crawling URL:', urlError);
            // Fallback to using URL as text
            if (contentForQuestions) {
              contentForQuestions += `\n\nAdditional Content:\n${ecomFaqContent}`;
            } else {
              contentForQuestions = ecomFaqContent;
            }
          }
        } else {
          // It's regular text content
          if (contentForQuestions) {
            contentForQuestions += `\n\nAdditional Content:\n${ecomFaqContent}`;
          } else {
            contentForQuestions = ecomFaqContent;
          }
        }
      }
      
      // Generate questions using the same prompt structure
      const response = await apiService.generateAIFAQs({
        content: contentForQuestions.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        generateQuestionsOnly: true
      });
      
      if (response.success && response.questions) {
        const questions = response.questions || [];
        setEcomGeneratedQuestions(questions);
        setShowEcomQuestionsSection(true);
        const questionText = questions.length === 1 ? 'question' : 'questions';
        setNotificationType('success');
        setNotificationMessage(`Generated ${questions.length} ${questionText} successfully!`);
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate questions. Please try again.');
      }
    } catch (error) {
      console.error('[E-commerce Questions Generation] Error:', error);
      setNotificationType('error');
      
      // Check if it's an authentication error
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('Invalid or expired token') || error.message.includes('Session expired'))) {
        setNotificationMessage('Your session has expired. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setNotificationMessage('Error generating questions. Please try again.');
      }
    } finally {
      setIsGeneratingEcomQuestions(false);
    }
  };

  // Generate E-commerce Answers Function
  const generateEcomAnswers = async () => {
    if (ecomSelectedQuestions.size === 0) {
      setNotificationMessage('Please select at least one question to generate answers for');
      return;
    }
    
    setIsGeneratingEcomAnswers(true);
    
    try {
      // Prepare content for answer generation
      let contentForAnswers = '';
      
      const hasProductInput = (productInputs.name.trim() || categoryInputs.categoryName.trim());
      const hasAdditionalContent = ecomFaqContent.trim();
      
      if (hasProductInput) {
        const productName = productInputs.name || categoryInputs.categoryName;
        const targetAudience = productInputs.targetAudience || '';
        contentForAnswers = `Product/Category: ${productName}\nTarget Audience: ${targetAudience}`;
      }
      
      if (hasAdditionalContent) {
        // Check if additional content is a URL and crawl it
        const trimmedContent = ecomFaqContent.trim();
        if (isUrl(trimmedContent)) {
          // It's a URL, crawl it first
          console.log('[E-commerce FAQ] Detected URL for answers, crawling content:', trimmedContent);
          try {
            const urlResult = await apiService.extractContentFromUrl(trimmedContent);
            if (urlResult.success && urlResult.content) {
              const crawledContent = urlResult.content;
              if (contentForAnswers) {
                contentForAnswers += `\n\nAdditional Content from URL (${trimmedContent}):\n${crawledContent}`;
              } else {
                contentForAnswers = `Content from URL (${trimmedContent}):\n${crawledContent}`;
              }
              console.log('[E-commerce FAQ] Successfully crawled URL content for answers, length:', crawledContent.length);
            } else {
              console.warn('[E-commerce FAQ] Failed to crawl URL for answers, using URL as text');
              if (contentForAnswers) {
                contentForAnswers += `\n\nAdditional Content:\n${ecomFaqContent}`;
              } else {
                contentForAnswers = ecomFaqContent;
              }
            }
          } catch (urlError) {
            console.error('[E-commerce FAQ] Error crawling URL for answers:', urlError);
            // Fallback to using URL as text
            if (contentForAnswers) {
              contentForAnswers += `\n\nAdditional Content:\n${ecomFaqContent}`;
            } else {
              contentForAnswers = ecomFaqContent;
            }
          }
        } else {
          // It's regular text content
          if (contentForAnswers) {
            contentForAnswers += `\n\nAdditional Content:\n${ecomFaqContent}`;
          } else {
            contentForAnswers = ecomFaqContent;
          }
        }
      }
      
      // Get selected questions
      const selectedQuestionsList = Array.from(ecomSelectedQuestions).map(index => ecomGeneratedQuestions[index]);
      
      // Generate answers for selected questions
      const response = await apiService.generateAIFAQs({
        content: contentForAnswers.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        selectedQuestions: selectedQuestionsList,
        generateAnswersOnly: true
      });
      
      if (response.success && response.faqs) {
        const newFaqs = response.faqs.map(faq => ({ question: faq.question, answer: faq.answer })) as FAQItem[];
        setFaqs(prevFaqs => [...prevFaqs, ...newFaqs]);
        setNotificationType('success');
        setNotificationMessage(`Generated answers for ${newFaqs.length} questions successfully!`);
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate answers. Please try again.');
      }
    } catch (error) {
      console.error('[E-commerce Answers Generation] Error:', error);
      setNotificationType('error');
      
      // Check if it's an authentication error
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('Invalid or expired token') || error.message.includes('Session expired'))) {
        setNotificationMessage('Your session has expired. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setNotificationMessage('Error generating answers. Please try again.');
      }
    } finally {
      setIsGeneratingEcomAnswers(false);
    }
  };

  // Generate Answers Function (Step 2)
  const generateAnswers = async () => {
    if (selectedQuestions.size === 0) {
      setNotificationMessage('Please select at least one question');
      return;
    }
    
    setIsGeneratingAnswers(true);
    setShowFAQSection(false);
    
    try {
      // Get selected questions
      const selectedQuestionsList = Array.from(selectedQuestions).map(index => generatedQuestions[index]);
      
      console.log('[FAQ Generation] Starting answer generation:', {
        selectedQuestionsSize: selectedQuestions.size,
        selectedQuestionsIndices: Array.from(selectedQuestions),
        selectedQuestionsList: selectedQuestionsList,
        totalGeneratedQuestions: generatedQuestions.length
      });
      
      // Generate answers for selected questions
      const response = await apiService.generateAIFAQs({
        content: content.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        selectedQuestions: selectedQuestionsList,
        generateAnswersOnly: true // New flag to generate only answers
      });
      
      if (response.success && response.faqs) {
        const newFaqs = response.faqs || [];
        const selectedQuestionsCount = selectedQuestions.size;
        
        console.log('[FAQ Generation] API Response Analysis:', {
          responseSuccess: response.success,
          responseFaqsLength: response.faqs?.length || 0,
          selectedQuestionsCount: selectedQuestionsCount,
          newFaqsLength: newFaqs.length,
          responseFaqs: response.faqs
        });
        
        // Accumulate new FAQs with existing ones instead of replacing
        setFaqs(prevFaqs => {
          const allFaqs = [...prevFaqs, ...newFaqs];
          console.log('[FAQ Generation] Accumulating FAQs:', {
            previousCount: prevFaqs.length,
            newCount: newFaqs.length,
            totalCount: allFaqs.length,
            selectedQuestionsCount: selectedQuestionsCount
          });
          // Update existing session with all FAQs (existing + new)
          updateSessionWithAnswers(allFaqs);
          return allFaqs;
        });
        
        setShowFAQSection(true);
        const questionText = selectedQuestionsCount === 1 ? 'question' : 'questions';
        setNotificationType('success');
        setNotificationMessage(`Generated answers for ${selectedQuestionsCount} ${questionText} successfully!`);
        
        console.log('[FAQ Generation] Answer generation completed:', {
          selectedQuestionsCount,
          apiResponseCount: newFaqs.length,
          selectedQuestionsList
        });
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate answers. Please try again.');
      }
    } catch (error) {
      console.error('[Answers Generation] Error:', error);
      setNotificationType('error');
      setNotificationMessage('Error generating answers. Please try again.');
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  // Toggle question selection
  const toggleQuestionSelection = (index: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Select all questions
  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(generatedQuestions.map((_, index) => index)));
  };

  // Deselect all questions
  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  // Save re-analyzed FAQ session
  const saveReanalyzedToSession = (updatedFaqs: FAQItem[], reanalyzedQuestion: string) => {
    if (!user?.id) {
      console.warn('[FAQ Session] Cannot save re-analyzed session - no user ID');
      return;
    }
    
    const sessionData: SessionData = {
      id: `faq-${Date.now()}`,
      name: `FAQ Session - ${new Date().toLocaleDateString()}`,
      type: 'faq',
      timestamp: new Date().toISOString(),
      model: faqModel,
      questionProvider: faqProvider || null,
      answerProvider: faqProvider || null,
      questionModel: faqModel || null,
      answerModel: faqModel || null,
      blogContent: content,
      blogUrl: extractUrl(content) || undefined,
      sourceUrls: extractUrl(content) ? [extractUrl(content)!] : [],
      qaData: updatedFaqs,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      statistics: {
        totalQuestions: updatedFaqs.length,
        avgAccuracy: 'N/A',
        avgCitationLikelihood: 'N/A',
        totalCost: 'N/A'
      },
      userId: user.id,
      generatedQuestions: generatedQuestions,
      showQuestionsSection: showQuestionsSection,
      showFAQSection: true
    };
    
    console.log('[FAQ Session] Saving re-analyzed session:', {
      id: sessionData.id,
      name: sessionData.name,
      qaDataLength: sessionData.qaData.length,
      reanalyzedQuestion: reanalyzedQuestion.substring(0, 100)
    });
    
    setSessions(prev => [sessionData, ...prev]);
    setCurrentSession(sessionData);
  };

  // Save questions to session (create new session when questions are generated)
  const saveQuestionsToSession = (questions: string[]) => {
    if (!user?.id) {
      console.warn('[FAQ Session] Cannot save questions session - no user ID');
      return;
    }
    
    const sessionData: SessionData = {
      id: `faq-${Date.now()}`,
      name: `FAQ Session - ${new Date().toLocaleDateString()}`,
      type: 'faq',
      timestamp: new Date().toISOString(),
      model: faqModel,
      questionProvider: faqProvider || null,
      answerProvider: faqProvider || null,
      questionModel: faqModel || null,
      answerModel: faqModel || null,
      blogContent: content,
      blogUrl: extractUrl(content) || undefined,
      sourceUrls: extractUrl(content) ? [extractUrl(content)!] : [],
      qaData: [], // Empty initially, will be filled when answers are generated
      totalInputTokens: 0,
      totalOutputTokens: 0,
      statistics: {
        totalQuestions: questions.length,
        avgAccuracy: 'N/A',
        avgCitationLikelihood: 'N/A',
        totalCost: 'N/A'
      },
      userId: user.id,
      generatedQuestions: questions,
      showQuestionsSection: true,
      showFAQSection: false
    };
    
    console.log('[FAQ Session] Saving questions session:', {
      id: sessionData.id,
      questionsLength: sessionData.generatedQuestions?.length || 0,
      blogContentLength: sessionData.blogContent.length,
      userId: sessionData.userId
    });
    
    setSessions(prev => [sessionData, ...prev]);
    setCurrentSession(sessionData);
  };

  // Update existing session with answers
  const updateSessionWithAnswers = (newFaqs: FAQItem[]) => {
    if (!user?.id || !currentSession) {
      console.warn('[FAQ Session] Cannot update session - no user ID or current session');
      return;
    }
    
    console.log('[FAQ Session] Before updating session:', {
      currentSessionId: currentSession.id,
      currentSessionQaDataLength: currentSession.qaData?.length || 0,
      newFaqsLength: newFaqs.length,
      currentSessionGeneratedQuestionsLength: currentSession.generatedQuestions?.length || 0
    });
    
    const updatedSession: SessionData = {
      ...currentSession,
      qaData: newFaqs,
      showFAQSection: true,
      showQuestionsSection: true, // Keep questions section visible
      statistics: {
        ...currentSession.statistics,
        totalQuestions: newFaqs.length
      }
    };
    
    console.log('[FAQ Session] Updating session with answers:', {
      id: updatedSession.id,
      qaDataLength: updatedSession.qaData.length,
      questionsLength: updatedSession.generatedQuestions?.length || 0,
      showFAQSection: updatedSession.showFAQSection
    });
    
    // Update the session in the sessions array
    setSessions(prev => {
      const updatedSessions = prev.map(session => 
        session.id === currentSession.id ? updatedSession : session
      );
      console.log('[FAQ Session] Sessions after update:', {
        totalSessions: updatedSessions.length,
        updatedSessionIndex: updatedSessions.findIndex(s => s.id === currentSession.id),
        updatedSessionQaDataLength: updatedSessions.find(s => s.id === currentSession.id)?.qaData?.length || 0
      });
      return updatedSessions;
    });
    setCurrentSession(updatedSession);
    
    // Update the UI state to show both sections
    setShowQuestionsSection(true);
    setShowFAQSection(true);
  };



  // Copy Q&A pair to clipboard
  const copyQAPair = async (question: string, answer: string) => {
    const qaText = `Q: ${question}\nA: ${answer}`;
    try {
      await navigator.clipboard.writeText(qaText);
      // You could add a toast notification here
      console.log('Q&A pair copied to clipboard');
    } catch (err) {
      console.error('Failed to copy Q&A pair:', err);
    }
  };

  // Reanalyze answer for a specific question
  const reanalyzeAnswer = async (question: string) => {
    if (!content.trim()) {
      console.error('No content available for reanalysis');
      return;
    }

    console.log('[Re-analyze] Starting re-analysis for question:', question.substring(0, 100));

    try {
      setIsGeneratingAnswers(true);
      
      const response = await apiService.generateAIFAQs({
        content,
        provider: faqProvider,
        model: faqModel,
        targetKeywords: [],
        generateAnswersOnly: true,
        selectedQuestions: [question]
      });

      if (response.success && response.faqs && response.faqs.length > 0) {
        const newAnswer = response.faqs[0].answer;
        
        // Update the existing FAQ with the new answer
        setFaqs(prev => {
          const updatedFaqs = prev.map(faq => 
            faq.question === question 
              ? { ...faq, answer: newAnswer }
              : faq
          );
          
          // Create a new session for the re-analyzed answer
          saveReanalyzedToSession(updatedFaqs, question);
          
          return updatedFaqs;
        });
        
        setNotificationMessage(`Re-analyzed answer for "${question}" successfully!`);
        console.log('Answer reanalyzed successfully and new session created');
      }
    } catch (error) {
      console.error('Error reanalyzing answer:', error);
    } finally {
      setIsGeneratingAnswers(false);
    }
  };
  
  // Delete session function
  const deleteSession = (sessionId: string) => {
    if (user?.id) {
      setSessions(prev => {
        const updatedSessions = prev.filter(session => session.id !== sessionId);
        return updatedSessions;
      });
      
      // Clear current session if it was deleted
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      // Remove from expanded sessions
      setExpandedSessions(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(sessionId);
        return newExpanded;
      });
    }
  };
  
  // Restore session function
  const restoreSession = (session: SessionData) => {
    setCurrentSession(session);
    
    // Restore FAQ state if it's an FAQ session
    if (session.type === 'faq') {
      setFaqs(session.qaData || []);
      setShowFAQSection(true);
      setContent(session.blogContent || '');
      setFaqProvider(session.questionProvider || 'gemini');
      setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3-sonnet-20240229' : 'gemini-1.5-flash'));
      
              // Reset textarea height to accommodate content
        if (textareaRef.current && session.blogContent) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
              textareaRef.current.style.height = newHeight + 'px';
            }
          }, 100);
      }
    }
  };

  // Normalize backend response into EcommerceContent shape
  const normalizeEcommerceContent = (data: any): EcommerceContent | null => {
    if (!data) return null;
    // If already in expected shape, return as-is
    if (
      typeof data === 'object' && (
        'productContent' in data || 'categoryContent' in data || 'faqs' in data
      )
    ) {
      return data as EcommerceContent;
    }
    // If it looks like a raw product content object, wrap it
    if (typeof data === 'object' && 'shortDescription' in data && 'longDescription' in data) {
      return {
        productContent: data as ProductContent,
        categoryContent: undefined,
        faqs: [],
        seoRecommendations: {
          schemaSuggestions: [],
          contentDepthScore: 0,
          aiOptimizationTips: [],
          technicalSeoReminders: [],
        },
      };
    }
    // If it looks like raw FAQs result (supports nested shape)
    if (typeof data === 'object' && ('faqs' in (data as any))) {
      const maybeNested = (data as any).faqs;
      let faqsArray: any[] = [];
      if (Array.isArray(maybeNested)) {
        faqsArray = maybeNested;
      } else if (Array.isArray(maybeNested?.faqs)) {
        faqsArray = maybeNested.faqs;
      } else if (maybeNested && typeof maybeNested === 'object') {
        try {
          faqsArray = Object.values(maybeNested);
        } catch (_) {
          faqsArray = [];
        }
      }
      const seo = (data as any).seoRecommendations || maybeNested?.seoRecommendations || {
        schemaSuggestions: [],
        contentDepthScore: 0,
        aiOptimizationTips: [],
        technicalSeoReminders: [],
      };
      return {
        productContent: undefined,
        categoryContent: undefined,
        faqs: faqsArray,
        seoRecommendations: seo,
      };
    }
    return null;
  };

  // E-commerce Content Generation Functions
  const generateProductContent = async () => {
    if (!productInputs.name.trim() || !productInputs.features.trim()) {
      alert('Please fill in product name and features');
      return;
    }

    setIsGeneratingEcommerce(true);
    try {
      const response = await apiService.generateEcommerceContent({
        type: 'product',
        inputs: productInputs,
        provider: faqProvider,
        model: faqModel
      }) as { success: boolean; data?: EcommerceContent; error?: string };

      if (response.success) {
        console.log('[Product Content] Received data:', response.data);
        const normalized = normalizeEcommerceContent(response.data);
        setEcommerceContent(normalized);
        setNotificationMessage('Product content generated successfully!');
      } else {
        console.error('[Product Content] API error:', response.error);
        alert('Failed to generate product content: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating product content:', error);
      alert('Failed to generate product content');
    } finally {
      setIsGeneratingEcommerce(false);
    }
  };

  const generateCategoryContent = async () => {
    if (!categoryInputs.categoryName.trim()) {
      alert('Please fill in category name');
      return;
    }

    setIsGeneratingEcommerce(true);
    try {
      const response = await apiService.generateEcommerceContent({
        type: 'category',
        inputs: categoryInputs,
        provider: faqProvider,
        model: faqModel
      }) as { success: boolean; data?: EcommerceContent; error?: string };

      if (response.success) {
        console.log('[Category Content] Received data:', response.data);
        const normalized = normalizeEcommerceContent(response.data);
        setEcommerceContent(normalized);
        setNotificationMessage('Category content generated successfully!');
      } else {
        console.error('[Category Content] API error:', response.error);
        alert('Failed to generate category content: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating category content:', error);
      alert('Failed to generate category content');
    } finally {
      setIsGeneratingEcommerce(false);
    }
  };

  const generateEcommerceFAQs = async () => {
    if (!productInputs.name.trim() && !categoryInputs.categoryName.trim()) {
      alert('Please fill in product name or category name');
      return;
    }

    setIsGeneratingEcommerce(true);
    try {
      const response = await apiService.generateEcommerceContent({
        type: 'faq',
        inputs: { ...productInputs, ...categoryInputs },
        provider: faqProvider,
        model: faqModel
      }) as { success: boolean; data?: EcommerceContent; error?: string };

      if (response.success) {
        console.log('[E-commerce FAQs] Received data:', response.data);
        const normalized = normalizeEcommerceContent(response.data);
        
        // Start with FAQs from ecommerce content
        let mergedFaqs: FAQItem[] = normalized?.faqs || [];

        // If user provided optional URL/content for extra FAQs, generate and merge
        const extraSource = (ecomFaqContent || '').trim();
        if (extraSource.length > 0) {
          try {
            const gen = await apiService.generateAIFAQs({
              content: extraSource,
              provider: faqProvider,
              model: faqModel,
              targetKeywords: faqTargetKeywords,
              generateAnswersOnly: false
            });
            const extraFaqs = (gen.faqs || []).map(f => ({ question: f.question, answer: f.answer })) as FAQItem[];
            // Merge and de-duplicate by question
            const map = new Map<string, FAQItem>();
            mergedFaqs.forEach(f => map.set(f.question.trim(), f));
            extraFaqs.forEach(f => {
              const q = f.question.trim();
              if (!map.has(q)) map.set(q, f);
            });
            mergedFaqs = Array.from(map.values());
          } catch (e) {
            console.warn('[E-commerce FAQs] Extra content FAQ generation failed; proceeding with e-commerce FAQs only.', e);
          }
        }

        // Save merged back into ecommerceContent state
        const finalContent: EcommerceContent | null = normalized
          ? { ...normalized, faqs: mergedFaqs }
          : { productContent: undefined, categoryContent: undefined, faqs: mergedFaqs, seoRecommendations: { schemaSuggestions: [], contentDepthScore: 0, aiOptimizationTips: [], technicalSeoReminders: [] } };

        setEcommerceContent(finalContent);
        setNotificationMessage('E-commerce FAQs generated successfully!');
      } else {
        console.error('[E-commerce FAQs] API error:', response.error);
        alert('Failed to generate e-commerce FAQs: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating e-commerce FAQs:', error);
      alert('Failed to generate e-commerce FAQs');
    } finally {
      setIsGeneratingEcommerce(false);
    }
  };

  return (
    <div className="flex gap-8 w-full">
      {/* Main Content */}
      <div className="flex-1 space-y-8">
        {/* Content Input Section */}
        <div className="card bg-white border border-primary/10 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-8 h-8 text-black drop-shadow" />
            <h2 className="text-3xl font-extrabold text-black tracking-tight">GEO Content Writer Tool</h2>
          </div>
          
                
          <div className="space-y-8">
            {/* E-commerce Content Forms */}
            <div className="space-y-6">
                {/* Content Type Selection */}
                <div>
                  <label className="block text-base font-semibold text-black mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-black" />
                    Content Type
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setContentType('product')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        contentType === 'product'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      Product Description
                    </button>
                    <button
                      onClick={() => setContentType('category')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        contentType === 'category'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      Category Page
                    </button>
                    <button
                      onClick={() => setContentType('faq')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        contentType === 'faq'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                      FAQ Generator
                    </button>
              </div>
            </div>

                {/* Product Content Form */}
                {contentType === 'product' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-black">Product Description Generator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                          value={productInputs.name}
                          onChange={(e) => setProductInputs(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., iPhone 15 Pro"
                    />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={productInputs.category}
                          onChange={(e) => setProductInputs(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Smartphones"
                        />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                    <input
                      type="text"
                          value={productInputs.targetAudience}
                          onChange={(e) => setProductInputs(prev => ({ ...prev, targetAudience: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Tech enthusiasts, professionals"
                    />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                    <select
                          value={productInputs.tone}
                          onChange={(e) => setProductInputs(prev => ({ ...prev, tone: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                          <option value="casual">Casual</option>
                          <option value="professional">Professional</option>
                          <option value="persuasive">Persuasive</option>
                    </select>
                  </div>
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Features/Specs</label>
                      <textarea
                        value={productInputs.features}
                        onChange={(e) => setProductInputs(prev => ({ ...prev, features: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="List key features, specifications, and technical details..."
                      />
                    </div>
                    <button
                      onClick={generateProductContent}
                      disabled={isGeneratingEcommerce}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingEcommerce ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Generate Product Content
                    </button>
                  </div>
                )}

                {/* Category Content Form */}
                {contentType === 'category' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-black">Category Page Content Generator</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                        <input
                          type="text"
                          value={categoryInputs.categoryName}
                          onChange={(e) => setCategoryInputs(prev => ({ ...prev, categoryName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Men's T-Shirts"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Types</label>
                        <input
                          type="text"
                          value={categoryInputs.productTypes}
                          onChange={(e) => setCategoryInputs(prev => ({ ...prev, productTypes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Cotton, Polyester, Blends"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                        <input
                          type="text"
                          value={categoryInputs.audience}
                          onChange={(e) => setCategoryInputs(prev => ({ ...prev, audience: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Fashion-conscious men, 25-45 years old"
                        />
                      </div>
                    </div>
                        <button
                      onClick={generateCategoryContent}
                      disabled={isGeneratingEcommerce}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                      {isGeneratingEcommerce ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Generate Category Content
                        </button>
                  </div>
                )}

                {/* E-commerce FAQ Form */}
                {contentType === 'faq' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-black">E-commerce FAQ Generator</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product/Category Name</label>
                    <input
                      type="text"
                          value={productInputs.name || categoryInputs.categoryName}
                          onChange={(e) => {
                            setProductInputs(prev => ({ ...prev, name: e.target.value }));
                            setCategoryInputs(prev => ({ ...prev, categoryName: e.target.value }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., iPhone 15 Pro or Men's T-Shirts"
                        />
                  </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Intent</label>
                        <input
                          type="text"
                          value={productInputs.targetAudience}
                          onChange={(e) => setProductInputs(prev => ({ ...prev, targetAudience: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Buying first smartphone, Finding perfect fit"
                        />
                      </div>
                    </div>

                    {/* Optional URL or Long Content (merge with e-commerce FAQs) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paste URL or content (optional)</label>
                      <div className="relative">
                        <textarea
                          ref={ecomTextareaRef}
                          value={ecomFaqContent}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            const val = e.target.value;
                            setEcomFaqContent(val);
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            const newHeight = Math.max(36, Math.min(target.scrollHeight, 150));
                            target.style.height = `${newHeight}px`;
                          }}
                          placeholder="Paste URL or content here..."
                          rows={1}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 pr-12 text-black text-sm placeholder-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none scrollbar-hide"
                          style={{ minHeight: '36px', maxHeight: '150px', height: 'auto', overflow: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        />
                        {/* File Upload Plus Icon */}
                        <div className="absolute right-2 bottom-2">
                          <input
                            type="file"
                            id="ecom-file-upload"
                            accept=".txt,.md,.doc,.docx"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev: ProgressEvent<FileReader>) => {
                                  const text = (ev.target?.result as string) || '';
                                  setEcomFaqContent(text);
                                  setTimeout(() => {
                                    if (ecomTextareaRef.current) {
                                      ecomTextareaRef.current.style.height = 'auto';
                                      const h = Math.max(36, Math.min(ecomTextareaRef.current.scrollHeight, 150));
                                      ecomTextareaRef.current.style.height = `${h}px`;
                                    }
                                  }, 100);
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="ecom-file-upload"
                            className="cursor-pointer p-1.5 rounded-full transition-all duration-200 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                            title="Upload file (.txt, .md, .doc, .docx)"
                          >
                            <Plus className="w-4 h-4" />
                          </label>
                        </div>
                      </div>
                    </div>

                        <button
                      onClick={generateEcomQuestions}
                      disabled={isGeneratingEcomQuestions}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                      {isGeneratingEcomQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Generate Questions
                        </button>
                  </div>
                )}
              </div>

            {/* E-commerce Questions Section */}
            {contentType === 'faq' && showEcomQuestionsSection && ecomGeneratedQuestions.length > 0 && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-black flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Generated Questions
                  </h3>
                  <span className="text-sm text-gray-600">
                    Select questions to generate answers
                  </span>
                </div>
                <div className="space-y-4">
                  {ecomGeneratedQuestions.map((question, index) => {
                    const questionAnswer = faqs.find(faq => faq.question === question);
                    return (
                      <div key={index} className="bg-white rounded border p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ecomSelectedQuestions.has(index)}
                            onChange={(e) => {
                              const newSelected = new Set(ecomSelectedQuestions);
                              if (e.target.checked) {
                                newSelected.add(index);
                              } else {
                                newSelected.delete(index);
                              }
                              setEcomSelectedQuestions(newSelected);
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-gray-800 font-medium mb-2">
                              Q{index + 1}: {question}
                            </div>
                            {/* Show answer if it exists */}
                            {questionAnswer && (
                              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                                <div className="text-sm text-gray-600 mb-2 font-medium">Answer:</div>
                                <div className="text-gray-700 text-sm leading-relaxed">
                                  {questionAnswer.answer}
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-start">
                  <button
                    onClick={generateEcomAnswers}
                    disabled={isGeneratingEcomAnswers || ecomSelectedQuestions.size === 0}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingEcomAnswers ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Generate Answers
                  </button>
                </div>
              </div>
            )}


          </div>



          {/* E-commerce Content Display */}
          {(() => {
            const hasRelevantContent = !!(
              (contentType === 'product' && ecommerceContent && ecommerceContent?.productContent) ||
              (contentType === 'category' && ecommerceContent && ecommerceContent?.categoryContent) ||
              (contentType === 'faq' && ecommerceContent && ecommerceContent?.faqs && ecommerceContent?.faqs.length > 0)
            );
            if (!hasRelevantContent) return false;
            console.log('[E-commerce Display] Rendering content:', ecommerceContent);
            return true;
          })() && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                <h3 className="text-2xl font-bold text-black">Generated E-commerce Content</h3>
              </div>

              {/* Product Content Display */}
              {contentType === 'product' && ecommerceContent?.productContent && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Product Description
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-black mb-2">Short Description</h5>
                        <p className="text-gray-700 bg-white p-3 rounded border">{ecommerceContent?.productContent?.shortDescription}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Long Description</h5>
                        <div className="text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">{ecommerceContent?.productContent.longDescription}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-black mb-2">Key Features</h5>
                          <ul className="text-gray-700 bg-white p-3 rounded border">
                            {ecommerceContent?.productContent.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-black mb-2">Benefits</h5>
                          <ul className="text-gray-700 bg-white p-3 rounded border">
                            {ecommerceContent?.productContent.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Comparison</h5>
                        <div className="text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">{ecommerceContent?.productContent.comparison}</div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Technical Specifications</h5>
                        <div className="bg-white p-3 rounded border">
                          <table className="w-full text-sm">
                            <tbody>
                              {Object.entries(ecommerceContent?.productContent.specs).map(([key, value]) => (
                                <tr key={key} className="border-b border-gray-100">
                                  <td className="font-medium text-gray-700 py-2 pr-4">{key}</td>
                                  <td className="text-gray-600 py-2">{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Use Cases</h5>
                        <ul className="text-gray-700 bg-white p-3 rounded border">
                          {ecommerceContent?.productContent.useCases.map((useCase, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {useCase}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-black mb-2">Keywords</h5>
                          <div className="flex flex-wrap gap-2">
                            {ecommerceContent?.productContent.keywords.map((keyword, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-black mb-2">Image Alt Text</h5>
                          <div className="space-y-1">
                            {ecommerceContent?.productContent.altText.map((alt, index) => (
                              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {alt}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium text-black mb-2">Meta Tags</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Title:</span>
                            <div className="text-gray-600 bg-white p-2 rounded border mt-1">{ecommerceContent?.productContent.metaTags.title}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Description:</span>
                            <div className="text-gray-600 bg-white p-2 rounded border mt-1">{ecommerceContent?.productContent.metaTags.description}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Keywords:</span>
                            <div className="text-gray-600 bg-white p-2 rounded border mt-1">{ecommerceContent?.productContent.metaTags.keywords}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Content Display */}
              {contentType === 'category' && ecommerceContent?.categoryContent && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Category Page Content
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-black mb-2">Introduction</h5>
                        <div className="text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">{ecommerceContent?.categoryContent.intro}</div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Buying Guide</h5>
                        <div className="text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">{ecommerceContent?.categoryContent.buyingGuide}</div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Comparison Chart</h5>
                        {(() => {
                          const raw = ecommerceContent?.categoryContent.comparisonChart || '';
                          // If the content looks like a markdown table, render it as table; otherwise show as preformatted
                          const isTable = /\|\s*Feature\s*\|/i.test(raw) || /\|\-+\|/.test(raw);
                          if (!isTable) {
                            return <div className="text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">{raw}</div>;
                          }
                          // Parse simple markdown-like table into rows and cells
                          const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
                          const allRows = lines.map(l => l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c => c.trim()));
                          // Drop markdown separator rows like | ----- | :----: | ---- |
                          const rows = allRows.filter(cells => !cells.every(c => /^:?-{2,}:?$/.test(c)));
                          const header = rows[0] || [];
                          const body = rows.slice(1);
                          return (
                            <div className="bg-white p-3 rounded border overflow-x-auto">
                              <table className="min-w-full text-sm text-gray-700">
                                <thead>
                                  <tr>
                                    {header.map((h, i) => (
                                      <th key={i} className="text-left font-semibold border-b border-gray-200 px-3 py-2 whitespace-nowrap">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {body.map((cells, r) => (
                                    <tr key={r} className="border-b border-gray-100">
                                      {cells.map((c, i) => (
                                        <td key={i} className="px-3 py-2 align-top whitespace-nowrap">{c}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Internal Links</h5>
                        <ul className="text-gray-700 bg-white p-3 rounded border">
                          {ecommerceContent?.categoryContent.internalLinks.map((link, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {link}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ Content Display */}
              {contentType === 'faq' && ecommerceContent?.faqs && ecommerceContent?.faqs.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Generated FAQs
                    </h4>
                    
                    <div className="space-y-4">
                      {ecommerceContent?.faqs.map((faq, index) => (
                        <div key={index} className="bg-white p-4 rounded border">
                          <div className="font-medium text-black mb-2">Q: {faq.question}</div>
                          <div className="text-gray-700">A: {faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

                {/* SEO Recommendations */}
                {ecommerceContent?.seoRecommendations
                  && (
                  (contentType === 'product' && !!ecommerceContent?.productContent)
                  || (contentType === 'category' && !!ecommerceContent?.categoryContent)
                  || (contentType === 'faq' && !!(ecommerceContent?.faqs && ecommerceContent?.faqs.length > 0))
                ) && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      AI SEO Recommendations
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-black mb-2">Schema Suggestions</h5>
                        <ul className="text-gray-700 bg-white p-3 rounded border">
                          {ecommerceContent?.seoRecommendations.schemaSuggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Content Depth Score: {ecommerceContent?.seoRecommendations.contentDepthScore}/100</h5>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${ecommerceContent?.seoRecommendations.contentDepthScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">AI Optimization Tips</h5>
                        <ul className="text-gray-700 bg-white p-3 rounded border">
                          {ecommerceContent?.seoRecommendations.aiOptimizationTips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-black mb-2">Technical SEO Reminders</h5>
                        <ul className="text-gray-700 bg-white p-3 rounded border">
                          {ecommerceContent?.seoRecommendations.technicalSeoReminders.map((reminder, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              {reminder}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="w-80 space-y-6">
        {/* New Analysis Button */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={() => {
              setContent('');
              setEcomFaqContent('');
              setFaqs([]);
              setGeneratedQuestions([]);
              setSelectedQuestions(new Set());
              setEcomGeneratedQuestions([]);
              setEcomSelectedQuestions(new Set());
              setShowFAQSection(false);
              setShowQuestionsSection(false);
              setShowEcomFAQSection(false);
              setShowEcomQuestionsSection(false);
              setCurrentSession(null);
              setIsGeneratingQuestions(false);
              setIsGeneratingAnswers(false);
              setPendingFAQGeneration(null);
              // Clear current session, pending generation, and generated FAQs from localStorage
              if (user?.id) {
                const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
                const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
                const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
                localStorage.removeItem(userCurrentSessionKey);
                localStorage.removeItem(pendingKey);
                localStorage.removeItem(generatedFAQsKey);
                // Clear last persisted FAQ UI state
                try { localStorage.removeItem(getFaqPersistKey()); } catch {}
              }
              // Reset textarea height to original state
              if (textareaRef.current) {
                textareaRef.current.style.height = '36px';
              }
            }}
                              className="w-full bg-white text-black font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 justify-start border border-blue-600 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Analysis
          </button>
        </div>
        
                {/* History Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-black">History</h3>
          </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {sessions.slice(0, 50).map((session, idx) => (
            <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {session.type === 'faq' ? (
                      <svg className="w-4 h-4 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                                            <div className="text-sm font-medium text-black truncate">
                      {session.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedSessions);
                    if (newExpanded.has(session.id)) {
                      newExpanded.delete(session.id);
                    } else {
                      newExpanded.add(session.id);
                    }
                    setExpandedSessions(newExpanded);
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                  title={expandedSessions.has(session.id) ? "Collapse" : "Expand"}
                >
                  {expandedSessions.has(session.id) ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Expanded Content */}
              {expandedSessions.has(session.id) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {session.type === 'faq' ? (
                    // FAQ Session Display
                    <div className="space-y-3">
                      {session.blogUrl && (
                        <div className="text-xs text-black bg-gray-50 p-2 rounded border border-gray-200">
                          <strong>Source URL:</strong> {session.blogUrl}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 font-medium">Generated FAQs:</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Regenerate FAQs for this session
                              setContent(session.blogContent || '');
                              setFaqProvider(session.questionProvider || 'gemini');
                              setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3-sonnet-20240229' : 'gemini-1.5-flash'));
                              generateQuestions();
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-black hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Regenerate FAQs"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // Download FAQs as JSON
                              const faqData = session.qaData?.map(qa => ({
                                question: qa.question,
                                answer: qa.answer
                              })) || [];
                              const blob = new Blob([JSON.stringify(faqData, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `faqs-${session.name.replace(/\s+/g, '-')}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setNotificationMessage('FAQs downloaded successfully!');
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Download FAQs as JSON"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-200"
                            title="Delete session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Show all questions with their answer status */}
                      {session.generatedQuestions && session.generatedQuestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 font-medium">
                            Questions ({session.generatedQuestions.length}):
                          </div>
                          {session.generatedQuestions.slice(0, 5).map((question, qIdx) => {
                            // Check if this question has an answer
                            const hasAnswer = session.qaData?.some(qa => qa.question === question);
                            const answer = session.qaData?.find(qa => qa.question === question);
                            
                            return (
                              <div key={qIdx} className="p-1.5 bg-white rounded border border-gray-200">
                                <div className="font-medium text-xs text-black leading-tight">
                                  Q: {question}
                                </div>
                                {hasAnswer && answer ? (
                                  <div className="text-xs text-gray-600 leading-tight mt-0.5">
                                    A: {answer.answer}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    (Answer not generated yet)
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {session.generatedQuestions.length > 5 && (
                            <div className="text-xs text-gray-500">
                              +{session.generatedQuestions.length - 5} more questions
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Provider: {session.questionProvider} | Model: {session.questionModel}
                      </div>
                    </div>
                  ) : (
                    // Q&A Session Display
                    <div className="space-y-3">
                      {session.blogUrl && (
                        <div className="text-xs text-black bg-gray-50 p-2 rounded border border-gray-200">
                          <strong>Source URL:</strong> {session.blogUrl}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 font-medium">Generated Q&A:</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Regenerate Q&A for this session
                              setContent(session.blogContent || '');
                              setFaqProvider(session.questionProvider || 'gemini');
                              setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3-sonnet-20240229' : 'gemini-1.5-flash'));
                              generateQuestions();
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-black hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Regenerate Q&A"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // Download Q&A as JSON
                              const qaData = session.qaData?.map(qa => ({
                                question: qa.question,
                                answer: qa.answer
                              })) || [];
                              const blob = new Blob([JSON.stringify(qaData, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `qa-${session.name.replace(/\s+/g, '-')}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setNotificationMessage('Q&A data downloaded successfully!');
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Download Q&A as JSON"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-200"
                            title="Delete session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {session.qaData?.slice(0, 3).map((qa, qaIdx) => (
                        <div key={qaIdx} className="p-2 bg-white rounded border border-gray-200">
                          <div className="font-medium text-sm text-black mb-1">
                            Q: {qa.question}
                          </div>
                          <div className="text-xs text-gray-600">
                            A: {qa.answer}
                          </div>
                        </div>
                      ))}
                      {session.qaData && session.qaData.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{session.qaData.length - 3} more questions
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Provider: {session.questionProvider} | Model: {session.questionModel}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              No analysis history yet
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Success Notification */}
    <SuccessNotification
      message={notificationMessage}
      onClose={() => setNotificationMessage(null)}
      autoClose={true}
      autoCloseDelay={3000}
      type={notificationType}
    />
  </div>
  );
}
