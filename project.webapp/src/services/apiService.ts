import { SessionData, LLMProvidersResponse, QuestionGenerationRequest, QuestionGenerationResponse, AnswerGenerationRequest, AnswerGenerationResponse } from '../types';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL;

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[ApiService] Making request to:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    console.log('[ApiService] Response status:', response.status);
    console.log('[ApiService] Response headers:', response.headers);

    // Handle 403 Forbidden (token expired)
    if (response.status === 403) {
      console.log('[ApiService] 403 Forbidden - attempting token refresh');
      const refreshed = await authService.refreshToken();
      if (refreshed) {
        console.log('[ApiService] Token refreshed successfully, retrying request');
        // Retry the request with new token
        const retryResponse = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders(),
            ...options.headers,
          },
          ...options,
        });
        
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${retryResponse.status}`);
        }
        
        // Check if retry response is JSON
        const retryContentType = retryResponse.headers.get('content-type');
        if (!retryContentType || !retryContentType.includes('application/json')) {
          const text = await retryResponse.text();
          console.error('[ApiService] Non-JSON response received on retry:', text.substring(0, 200));
          throw new Error(`Expected JSON response but got: ${retryContentType}`);
        }
        
        return retryResponse.json();
      } else {
        console.log('[ApiService] Token refresh failed, redirecting to login');
        // Clear tokens and redirect to login
        authService.logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[ApiService] Non-JSON response received:', text.substring(0, 200));
      throw new Error(`Expected JSON response but got: ${contentType}`);
    }

    return response.json();
  }

  // LLM API Methods
  async getLLMProviders(): Promise<LLMProvidersResponse> {
    return this.request('/llm/providers');
  }

  async generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResponse> {
    return this.request('/llm/generate-questions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateAnswers(request: AnswerGenerationRequest): Promise<AnswerGenerationResponse> {
    return this.request('/llm/generate-answers', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateAnswersWeb(request: AnswerGenerationRequest): Promise<AnswerGenerationResponse> {
    return this.request('/llm/generate-answers-web', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateAIFAQs(request: {
    content: string;
    provider: string;
    model: string;
    targetKeywords: string[];
    generateQuestionsOnly?: boolean;
    generateAnswersOnly?: boolean;
    selectedQuestions?: string[];
  }): Promise<{
    success: boolean;
    faqs?: Array<{ question: string; answer: string }>;
    questions?: string[];
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }> {
    return this.request('/llm/generate-ai-faqs', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async calculateConfidence(question: string, content: string, provider: string, model: string): Promise<{
    success: boolean;
    confidence: number;
    reasoning: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }> {
    return this.request('/llm/calculate-confidence', {
      method: 'POST',
      body: JSON.stringify({ question, content, provider, model }),
    });
  }

  // Compare two questions for similarity
  async compareQuestions(question1: string, question2: string, provider: string, model: string): Promise<{
    success: boolean;
    similarity: number;
    reasoning: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }> {
    return this.request('/llm/compare-questions', {
      method: 'POST',
      body: JSON.stringify({ question1, question2, provider, model }),
    });
  }

  // Save a session to the backend
  async saveSession(sessionData: SessionData): Promise<{ success: boolean; sessionId: string; message: string }> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Get all sessions of a specific type
  async getSessionsByType(type: 'question' | 'answer'): Promise<{ success: boolean; sessions: SessionData[]; count: number }> {
    return this.request(`/sessions/${type}`);
  }

  // Get sessions with filters
  async getSessionsWithFilters(
    type: 'question' | 'answer',
    filters: {
      fromDate?: string;
      toDate?: string;
      llmProvider?: string;
      llmModel?: string;
      blogLink?: string;
      search?: string;
    }
  ): Promise<{ 
    success: boolean; 
    sessions: SessionData[]; 
    totalCount: number;
    filters: any;
  }> {
    const params = new URLSearchParams();
    
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.llmProvider) params.append('llmProvider', filters.llmProvider);
    if (filters.llmModel) params.append('llmModel', filters.llmModel);
    if (filters.blogLink) params.append('blogLink', filters.blogLink);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `/sessions/${type}?${queryString}` : `/sessions/${type}`;
    
    return this.request(url);
  }

  // Get sessions by date range
  async getSessionsByDateRange(
    type: 'question' | 'answer', 
    fromDate: string, 
    toDate: string
  ): Promise<{ success: boolean; sessions: SessionData[]; count: number; fromDate: string; toDate: string }> {
    const params = new URLSearchParams({ fromDate, toDate });
    return this.request(`/sessions/${type}/range?${params}`);
  }

  // Get a specific session by ID
  async getSessionById(id: string): Promise<{ success: boolean; session: SessionData }> {
    return this.request(`/sessions/question/${id}`); // We'll try both types if needed
  }

  // Delete a session
  async deleteSession(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // Get session statistics
  async getSessionStats(type: 'question' | 'answer'): Promise<{
    success: boolean;
    stats: {
      totalSessions: number;
      totalCost: string;
      totalQuestions: number;
      averageQuestionsPerSession: string;
    };
  }> {
    return this.request(`/stats/${type}`);
  }

  // Bulk save sessions
  async bulkSaveSessions(sessions: SessionData[]): Promise<{
    success: boolean;
    results: Array<{ id: string; success: boolean; savedId?: string; error?: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    return this.request('/sessions/bulk', {
      method: 'POST',
      body: JSON.stringify({ sessions }),
    });
  }

  // Export sessions
  async exportSessions(type: 'question' | 'answer', format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/${type}?format=${format}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Migrate localStorage data to backend
  async migrateFromLocalStorage(localStorageSessions: Record<string, SessionData>): Promise<{
    success: boolean;
    results: Array<{ id: string; success: boolean; error?: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    const sessions = Object.values(localStorageSessions);
    return this.bulkSaveSessions(sessions);
  }

  // Check for relevant questions across different LLM providers
  async checkQuestionRelevance(
    sourceUrls: string[] | undefined,
    blogUrl: string | undefined,
    questionText: string,
    currentProvider: string,
    currentModel: string
  ): Promise<{
    success: boolean;
    relevantQuestions: Array<{
      question: string;
      originalProvider: string;
      originalModel: string;
      sessionName: string;
      sessionTimestamp: string;
      relevanceScore: number;
      relevanceReasoning: string;
      sourceUrls?: string[];
      blogUrl?: string;
      similarityGroup?: string;
    }>;
    totalChecked: number;
    message: string;
  }> {
    return this.request('/questions/check-relevance', {
      method: 'POST',
      body: JSON.stringify({
        sourceUrls,
        blogUrl,
        questionText,
        currentProvider,
        currentModel
      }),
    });
  }

  // Calculate citation likelihood using any LLM provider
  async calculateCitationLikelihood({ answer, content, provider, model }: { answer: string, content: string, provider: string, model: string }) {
    console.log('[Frontend] Calling /api/citation-likelihood/calculate with:', { answer, content, provider, model });
    const res = await fetch(`${API_BASE_URL}/citation-likelihood/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ answer, content, provider, model })
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[Frontend] Failed to parse JSON from /api/citation-likelihood/calculate:', e);
      throw new Error('Failed to parse JSON from /api/citation-likelihood/calculate');
    }
    console.log('[Frontend] /api/citation-likelihood/calculate response:', json);
    if (!res.ok) throw new Error('Failed to calculate citation likelihood: ' + (json.error || res.status));
    return json;
  }

  // Calculate accuracy using any LLM provider
  async calculateAccuracy({ answer, content, provider, model }: { answer: string, content: string, provider: string, model: string }) {
    console.log('[Frontend] Calling /api/accuracy/calculate with:', { answer, content, provider, model });
    const res = await fetch(`${API_BASE_URL}/accuracy/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ answer, content, provider, model })
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[Frontend] Failed to parse JSON from /api/accuracy/calculate:', e);
      throw new Error('Failed to parse JSON from /api/accuracy/calculate');
    }
    console.log('[Frontend] /api/accuracy/calculate response:', json);
    if (!res.ok) throw new Error('Failed to calculate accuracy: ' + (json.error || res.status));
    return json;
  }

  // Calculate Gemini accuracy
  async calculateGeminiAccuracy({ answer, content, model }: { answer: string, content: string, model: string }) {
    console.log('[Frontend] Calling /api/accuracy/gemini with:', { answer, content, model });
    const res = await fetch(`${API_BASE_URL}/accuracy/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ answer, content, model })
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[Frontend] Failed to parse JSON from /api/accuracy/gemini:', e);
      throw new Error('Failed to parse JSON from /api/accuracy/gemini');
    }
    console.log('[Frontend] /api/accuracy/gemini response:', json);
    if (!res.ok) throw new Error('Failed to calculate Gemini accuracy: ' + (json.error || res.status));
    return json;
  }

  async calculateGeoScoreBackend(params: {
    accuracy: number;
    question: string;
    answer: string;
    importantQuestions: string[];
    allConfidences: number[];
    sourceUrl: string;
    content: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/geo-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify(params)
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[Frontend] Failed to parse JSON from /api/geo-score:', e);
      throw new Error('Failed to parse JSON from /api/geo-score');
    }
    console.log('[Frontend] /api/geo-score response:', json);
    if (!res.ok) throw new Error('Failed to calculate GEO score: ' + (json.error || res.status));
    return json;
  }

  // Vector embedding methods
  // async generateEmbedding(text: string, type: 'question' | 'answer' = 'answer') {
  //   console.log('[Frontend] Calling /api/embeddings/generate with:', { text: text.substring(0, 100) + '...', type });
  //   const res = await fetch(`${API_BASE_URL}/embeddings/generate`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
  //     },
  //     body: JSON.stringify({ text, type })
  //   });
  //   let json;
  //   try {
  //     json = await res.json();
  //   } catch (e) {
  //     console.error('[Frontend] Failed to parse JSON from /api/embeddings/generate:', e);
  //     throw new Error('Failed to parse JSON from /api/embeddings/generate');
  //   }
  //   console.log('[Frontend] /api/embeddings/generate response:', json);
  //   if (!res.ok) throw new Error('Failed to generate embedding: ' + (json.error || res.status));
  //   return json;
  // }

  // async searchSimilarQuestions(question: string, limit: number = 10, threshold: number = 0.7) {
  //   console.log('[Frontend] Calling /api/embeddings/search/questions with:', { question: question.substring(0, 100) + '...', limit, threshold });
  //   const res = await fetch(`${API_BASE_URL}/embeddings/search/questions`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
  //     },
  //     body: JSON.stringify({ question, limit, threshold })
  //   });
  //   let json;
  //   try {
  //     json = await res.json();
  //   } catch (e) {
  //     console.error('[Frontend] Failed to parse JSON from /api/embeddings/search/questions:', e);
  //     throw new Error('Failed to parse JSON from /api/embeddings/search/questions');
  //   }
  //   console.log('[Frontend] /api/embeddings/search/questions response:', json);
  //   if (!res.ok) throw new Error('Failed to search similar questions: ' + (json.error || res.status));
  //   return json;
  // }

  // async searchSimilarAnswers(answer: string, limit: number = 10, threshold: number = 0.7) {
  //   console.log('[Frontend] Calling /api/embeddings/search/answers with:', { answer: answer.substring(0, 100) + '...', limit, threshold });
  //   const res = await fetch(`${API_BASE_URL}/embeddings/search/answers`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
  //     },
  //     body: JSON.stringify({ answer, limit, threshold })
  //   });
  //   let json;
  //   try {
  //     json = await res.json();
  //   } catch (e) {
  //     console.error('[Frontend] Failed to parse JSON from /api/embeddings/search/answers:', e);
  //     throw new Error('Failed to parse JSON from /api/embeddings/search/answers');
  //   }
  //   console.log('[Frontend] /api/embeddings/search/answers response:', json);
  //   if (!res.ok) throw new Error('Failed to search similar answers: ' + (json.error || res.status));
  //   return json;
  // }

  // // Calculate vector similarities for Q&A pairs
  // async calculateVectorSimilarities(qaData: Array<{ question: string; answer: string }>, content?: string) {
  //   console.log('[Frontend] Calling /api/embeddings/calculate-similarities with:', { qaCount: qaData.length, hasContent: !!content });
  //   const res = await fetch(`${API_BASE_URL}/embeddings/calculate-similarities`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
  //     },
  //     body: JSON.stringify({ qaData, content })
  //   });
  //   let json;
  //   try {
  //     json = await res.json();
  //   } catch (e) {
  //     console.error('[Frontend] Failed to parse JSON from /api/embeddings/calculate-similarities:', e);
  //     throw new Error('Failed to parse JSON from /api/embeddings/calculate-similarities');
  //   }
  //   console.log('[Frontend] /api/embeddings/calculate-similarities response:', json);
  //   if (!res.ok) throw new Error('Failed to calculate vector similarities: ' + (json.error || res.status));
  //   return json;
  // }

  // GEO Fanout Density Analysis
  // async trackGEOFanoutDensity(params: {
  //   mainQuestion: string;
  //   content: string;
  //   provider: string;
  //   model: string;
  // }) {
  //   console.log('[Frontend] Calling /api/geo-fanout/track with:', { 
  //     mainQuestion: params.mainQuestion.substring(0, 100) + '...', 
  //     provider: params.provider, 
  //     model: params.model 
  //   });
  //   const res = await fetch(`${API_BASE_URL}/geo-fanout/track`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
  //     },
  //     body: JSON.stringify(params)
  //   });
  //   let json;
  //   try {
  //     json = await res.json();
  //   } catch (e) {
  //     console.error('[Frontend] Failed to parse JSON from /api/geo-fanout/track:', e);
  //     throw new Error('Failed to parse JSON from /api/geo-fanout/track');
  //   }
  //   console.log('[Frontend] /api/geo-fanout/track response:', json);
  //   if (!res.ok) throw new Error('Failed to track GEO fanout density: ' + (json.error || res.status));
  //   return json;
  // }

  async getGEOFanoutAnalysis(sessionId?: string) {
    const url = sessionId ? `${API_BASE_URL}/geo-fanout/analysis?sessionId=${sessionId}` : `${API_BASE_URL}/geo-fanout/analysis`;
    console.log('[Frontend] Calling GEO fanout analysis:', url);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[Frontend] Failed to parse JSON from GEO fanout analysis:', e);
      throw new Error('Failed to parse JSON from GEO fanout analysis');
    }
    console.log('[Frontend] GEO fanout analysis response:', json);
    if (!res.ok) throw new Error('Failed to get GEO fanout analysis: ' + (json.error || res.status));
    return json;
  }

  // Competitor Analysis Methods
  async analyzeCompetitor(domain: string, userContent?: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ domain, userContent })
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to analyze competitor: ' + (json.error || res.status));
    return json;
  }

  async analyzeMultipleCompetitors(domains: string[], userContent?: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/analyze-multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ domains, userContent })
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to analyze competitors: ' + (json.error || res.status));
    return json;
  }

  async getCompetitorAnalyses() {
    const res = await fetch(`${API_BASE_URL}/competitor/analyses`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to get competitor analyses: ' + (json.error || res.status));
    return json;
  }

  async getCompetitorAnalysis(id: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/analysis/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to get competitor analysis: ' + (json.error || res.status));
    return json;
  }

  async deleteCompetitorAnalysis(id: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/analysis/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to delete competitor analysis: ' + (json.error || res.status));
    return json;
  }

  async extractContentFromUrl(url: string): Promise<{ success: boolean; content: string; title?: string; description?: string }> {
    console.log('[API Service] Extracting content from URL:', url);
    console.log('[API Service] API_BASE_URL:', API_BASE_URL);
    console.log('[API Service] Access token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
    
    return this.request('/extract-content', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  }

  async crawlWebsite(url: string, options?: { maxPages?: number; maxDepth?: number; timeout?: number }): Promise<{
    success: boolean;
    result: {
      baseUrl: string;
      pages: Array<{
        url: string;
        title: string;
        content: string;
        status: 'success' | 'error';
        contentLength: number;
        error?: string;
      }>;
      totalPages: number;
      totalContent: number;
      content: string;
      summary: {
        successfulPages: number;
        errorPages: number;
        averageContentLength: number;
      };
    };
  }> {
    console.log('[API Service] Crawling website:', url, 'with options:', options);
    return this.request('/crawl-website', {
      method: 'POST',
      body: JSON.stringify({ url, options }),
    });
  }



  // Extract full HTML+CSS of a page using backend Playwright service
  async extractFullPageHtml(url: string): Promise<{ success: boolean; html: string }> {
    console.log('[API Service] Extracting full page HTML from URL:', url);
    return this.request('/extract/fullpage', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async extractSmartHtml(url: string): Promise<{ success: boolean; html: string }> {
    console.log('[API Service] Smart extract for URL:', url);
    return this.request('/extract/smart', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // E-commerce content analysis helpers (Google Custom Search based)
  async getOffsiteSignals(params: { brandOrProduct: string; domain?: string }) {
    return this.request('/ecommerce-content/offsite-signals', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getCompetitors(params: { brandOrProduct: string; category?: string; currentUrl?: string }) {
    return this.request('/ecommerce-content/competitors', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getProductCompetitors(productQuery: string, currentUrl?: string) {
    return this.request('/ecommerce-content/product-competitors', {
      method: 'POST',
      body: JSON.stringify({ productQuery, currentUrl })
    });
  }

  async getSerpTop(query: string, num: number = 10) {
    return this.request('/ecommerce-content/serp-top', {
      method: 'POST',
      body: JSON.stringify({ query, num })
    });
  }

  async fetchBatchHtml(urls: string[]) {
    return this.request('/ecommerce-content/fetch-batch', {
      method: 'POST',
      body: JSON.stringify({ urls })
    });
  }


  // Smart Competitor Analysis Methods
  // GET all smart analyses for the user
  async getSmartAnalyses() {
    const res = await fetch(`${API_BASE_URL}/competitor/smart-analyses`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to get smart analyses: ' + (json.error || res.status));
    return json;
  }

  // GET a specific smart analysis by ID
  async getSmartAnalysis(id: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/smart-analysis/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to get smart analysis: ' + (json.error || res.status));
    return json;
  }

  // POST to create a new smart analysis
  async createSmartAnalysis(data: { domain: string; userWebsite?: string; companyName?: string }) {
    const res = await fetch(`${API_BASE_URL}/competitor/smart-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to create smart analysis: ' + (json.error || res.status));
    return json;
  }

  // DELETE a smart analysis by ID
  async deleteSmartAnalysis(id: string) {
    const res = await fetch(`${API_BASE_URL}/competitor/smart-analysis/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    });
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to delete smart analysis: ' + (json.error || res.status));
    return json;
  }

  // LLM Content Analysis
  async analyzeContentStructure(content: string, url?: string) {
    console.log('[API Service] Analyzing content structure for:', url ? `URL: ${url}` : `Content length: ${content.length}`);
    
    // If URL is provided, use the dedicated structural content crawler
    if (url) {
      console.log('[API Service] Using dedicated structural content crawler for URL');
      return this.request('/structural-content/crawl', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
    }
    
    // Otherwise use the regular content analysis
    return this.request('/content/analyze-structure', {
      method: 'POST',
      body: JSON.stringify({ content, url })
    });
  }

  // Persist/fetch last structure analysis per user
  async saveLastStructureAnalysis(analysis: any) {
    return this.request('/structure/last', {
      method: 'POST',
      body: JSON.stringify({ analysis })
    });
  }
  async getLastStructureAnalysis(url?: string) {
    const qs = url ? `?url=${encodeURIComponent(url)}` : '';
    return this.request(`/structure/last${qs}`, { method: 'GET' });
  }

  // Analytics: GA4 page metrics
  async getGA4PageMetrics(params: { propertyId?: string; pagePath: string; days?: number }) {
    return this.request('/analytics/ga4', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // Analytics: Google Search Console metrics
  async getSearchConsoleMetrics(params: { siteUrl?: string; pageUrl: string; days?: number }) {
    return this.request('/analytics/search-console', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // Analytics: LLM Visibility metrics (beta)
  async getLLMVisibility(params: { pageUrl: string; days?: number }) {
    return this.request('/analytics/llm-visibility', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // Apply structure suggestions
  async applyStructureSuggestions(content: string, suggestions: any[]) {
    const res = await fetch(`${API_BASE_URL}/content/apply-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ content, suggestions })
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error('Failed to apply structure suggestions: ' + (json.error || res.status));
    return json;
  }

  // Fetch AI Visibility Analysis for a company
  async getAIVisibilityAnalysis(
    company: string,
    industry?: string,
    options?: { fast?: boolean; signal?: AbortSignal }
  ): Promise<any> {
    const searchParams = new URLSearchParams();
    if (industry) searchParams.append('industry', industry);
    if (options?.fast) searchParams.append('fast', 'true');
    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : '';
    return this.request(`/ai-visibility/${encodeURIComponent(company)}${suffix}`, {
      signal: options?.signal,
    });
  }

  // Analyze a single competitor for AI visibility
  async analyzeSingleCompetitor(companyName: string, industry?: string): Promise<any> {
    const response = await this.request('/ai-visibility/analyze-competitor', {
      method: 'POST',
      body: JSON.stringify({ companyName, industry })
    });
    
    // The backend returns { success: true, data: competitorData }
    // Return the full response so the frontend can handle it properly
    return response;
  }

  // Publish improved HTML to Webflow CMS item
  // Webflow disabled
  // async publishToWebflow(...) {}

  // ===================== Shopify OAuth Integration =====================
  getShopifyAuthStartUrl(shopDomain: string) {
    const params = new URLSearchParams({ shop: shopDomain });
    return `${API_BASE_URL}/shopify/auth/start?${params.toString()}`;
  }
  getShopifyAuthStartUrlWithCreds(shopDomain: string, credsId: string) {
    const params = new URLSearchParams({ shop: shopDomain, credsId });
    return `${API_BASE_URL}/shopify/auth/start?${params.toString()}`;
  }
  async listShopifyProducts(cursor?: string, shop?: string) {
    const sp = new URLSearchParams();
    if (cursor) sp.append('after', cursor);
    if (shop) sp.append('shop', shop);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request(`/shopify/products${qs}`, { method: 'GET' });
  }
  async getShopifyProductByHandle(handle: string, shop?: string) {
    const sp = new URLSearchParams({ handle });
    if (shop) sp.append('shop', shop);
    const qs = `?${sp.toString()}`;
    return this.request(`/shopify/product${qs}`, { method: 'GET' });
  }
  async getShopifyProductById(id: string, shop?: string) {
    const sp = new URLSearchParams({ id });
    if (shop) sp.append('shop', shop);
    const qs = `?${sp.toString()}`;
    return this.request(`/shopify/product${qs}`, { method: 'GET' });
  }
  async listShopifyConnections() {
    return this.request('/shopify/connections', { method: 'GET' });
  }
  async disconnectShopify(shop: string) {
    const qs = `?shop=${encodeURIComponent(shop)}`;
    return this.request(`/shopify/connection${qs}`, { method: 'DELETE' });
  }

  // Shopify Credentials Manager (BYO)
  async createShopifyCreds(input: { name?: string; apiKey: string; apiSecret: string; redirectUri?: string }) {
    return this.request('/shopify/credentials', { method: 'POST', body: JSON.stringify(input) });
  }
  async listShopifyCreds() {
    return this.request('/shopify/credentials', { method: 'GET' });
  }
  async deleteShopifyCreds(id: string) {
    return this.request(`/shopify/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // Shopify Public
  async getPublicShopifyProduct(params: { url?: string; shop?: string; handle?: string }) {
    const sp = new URLSearchParams();
    if (params.url) sp.append('url', params.url);
    if (params.shop) sp.append('shop', params.shop);
    if (params.handle) sp.append('handle', params.handle);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request(`/shopify/public-product${qs}`, { method: 'GET' });
  }
  async listPublicShopifyProducts(shop: string) {
    const qs = `?shop=${encodeURIComponent(shop)}`;
    return this.request(`/shopify/public-list${qs}`, { method: 'GET' });
  }

  // Shopify Storefront
  async connectStorefront(shop: string, token: string) {
    return this.request('/shopify/storefront/connect', { method: 'POST', body: JSON.stringify({ shop, token }) });
  }
  async testStorefront(shop: string) {
    const qs = `?shop=${encodeURIComponent(shop)}`;
    return this.request(`/shopify/storefront/test${qs}`, { method: 'GET' });
  }
  async listStorefrontConnections() {
    return this.request('/shopify/storefront/connections', { method: 'GET' });
  }
  async listStorefrontProducts(shop: string, after?: string) {
    const sp = new URLSearchParams({ shop }); if (after) sp.append('after', after);
    const qs = `?${sp.toString()}`;
    return this.request(`/shopify/storefront/products${qs}`, { method: 'GET' });
  }
  async getStorefrontProduct(shop: string, handle: string) {
    const sp = new URLSearchParams({ shop, handle });
    const qs = `?${sp.toString()}`;
    return this.request(`/shopify/storefront/product${qs}`, { method: 'GET' });
  }

  // E-commerce AI Visibility Methods
  async getShopperBehaviorData(storeId: string, timeRange: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}&timeRange=${encodeURIComponent(timeRange)}`;
    return this.request(`/ecommerce/shopper-behavior${qs}`, { method: 'GET' });
  }

  async getCartAbandonmentAnalysis(storeId: string, timeRange: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}&timeRange=${encodeURIComponent(timeRange)}`;
    return this.request(`/ecommerce/cart-abandonment${qs}`, { method: 'GET' });
  }

  async getQueryIntentAnalysis(storeId: string, timeRange: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}&timeRange=${encodeURIComponent(timeRange)}`;
    return this.request(`/ecommerce/query-intent${qs}`, { method: 'GET' });
  }

  async getEngagementFunnel(storeId: string, timeRange: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}&timeRange=${encodeURIComponent(timeRange)}`;
    return this.request(`/ecommerce/engagement-funnel${qs}`, { method: 'GET' });
  }

  async getRealTimeMetrics(storeId: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}`;
    return this.request(`/ecommerce/real-time-metrics${qs}`, { method: 'GET' });
  }

  async getAIInsights(storeId: string, timeRange: string) {
    const qs = `?storeId=${encodeURIComponent(storeId)}&timeRange=${encodeURIComponent(timeRange)}`;
    return this.request(`/ecommerce/ai-insights${qs}`, { method: 'GET' });
  }

  // E-commerce Content Analysis helpers
  async priceCompare(productQuery: string, currentUrl?: string) {
    return this.request('/ecommerce-content/price-compare', {
      method: 'POST',
      body: JSON.stringify({ productQuery, currentUrl })
    });
  }

  // E-commerce Content Generation
  async generateEcommerceContent(data: {
    type: 'product' | 'category' | 'faq';
    inputs: any;
    provider: string;
    model: string;
  }) {
    return this.request('/ecommerce/generate-content', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Webflow OAuth helpers
  // getWebflowAuthUrl(): string { return ''; }

  // async getWebflowSites() {}

  // async getWebflowCollections(siteId: string) {}






}

export const apiService = new ApiService(); 