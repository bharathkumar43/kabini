import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface VisibilityBreakdown {
  mentionsScore: number;
  positionScore: number;
  sentimentScore: number;
  brandMentionsScore: number;
}

interface KeyMetrics {
  mentionsCount: number;
  position: number;
  sentiment: number;
  brandMentions: number;
  positiveWords: number;
  negativeWords: number;
}

interface CompetitorAnalysis {
  name: string;
  citationCount: number;
  aiScores: {
    gemini: number;
    perplexity: number;
    claude: number;
    chatgpt: number;
  };
  totalScore: number;
  breakdowns: {
    gemini: VisibilityBreakdown;
    perplexity: VisibilityBreakdown;
    claude: VisibilityBreakdown;
    chatgpt: VisibilityBreakdown;
  };
  keyMetrics: {
    gemini: KeyMetrics;
    perplexity: KeyMetrics;
    claude: KeyMetrics;
    chatgpt: KeyMetrics;
  };
  scrapedData?: any;
  analysis: {
    gemini: string;
    perplexity: string;
    claude: string;
    chatgpt: string;
  };
}

interface AIVisibilityTableProps {
  data: {
    company: string;
    industry: string;
    competitors: CompetitorAnalysis[];
  };
}

const AIVisibilityTable: React.FC<AIVisibilityTableProps> = ({ data }) => {
  console.log('[AIVisibilityTable] Rendering with data:', data);
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [competitors, setCompetitors] = useState(data.competitors || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isUrlInput, setIsUrlInput] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Validate data structure
  useEffect(() => {
    if (!data || !data.competitors) {
      console.error('[AIVisibilityTable] Invalid data structure:', data);
      setHasError(true);
      setErrorMessage('Invalid data structure received');
      return;
    }
    
    if (!Array.isArray(data.competitors)) {
      console.error('[AIVisibilityTable] Competitors is not an array:', data.competitors);
      setHasError(true);
      setErrorMessage('Competitors data is not in expected format');
      return;
    }
    
    setHasError(false);
    setErrorMessage('');
    console.log('[AIVisibilityTable] Data validation passed, competitors count:', data.competitors.length);
  }, [data]);

  const handleDeleteCompetitor = (index: number) => {
    const competitorName = competitors[index].name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(updatedCompetitors);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      alert('Please enter a competitor name');
      return;
    }

    // Check if competitor already exists
    if (competitors.some(c => c.name.toLowerCase() === newCompetitorName.toLowerCase())) {
      alert('This competitor is already in the analysis');
      return;
    }

    console.log('[AIVisibilityTable] Adding competitor:', newCompetitorName);
    console.log('[AIVisibilityTable] Current industry:', data.industry);
    
    setIsAddingCompetitor(true);
    try {
      const response = await apiService.analyzeSingleCompetitor(newCompetitorName, data.industry);
      console.log('[AIVisibilityTable] API response received:', response);
      
      // Handle the backend response format: { success: true, data: competitorData }
      let newCompetitor;
      if (response && response.success && response.data) {
        newCompetitor = response.data;
        console.log('[AIVisibilityTable] Extracted competitor data:', newCompetitor);
      } else if (response && response.name) {
        // Direct competitor data (fallback)
        newCompetitor = response;
        console.log('[AIVisibilityTable] Using direct competitor data:', newCompetitor);
      } else {
        throw new Error('Invalid response format from API');
      }
      
      if (!newCompetitor || !newCompetitor.name) {
        throw new Error('Invalid competitor data received from API');
      }
      
      const updatedCompetitors = [...competitors, newCompetitor];
      console.log('[AIVisibilityTable] Updated competitors list:', updatedCompetitors);
      
      setCompetitors(updatedCompetitors);
      setNewCompetitorName('');
      setShowAddForm(false);
      setSuccessMessage(`${newCompetitorName} has been added successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding competitor:', error);
      alert(`Failed to add competitor: ${error.message}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 2.5) return 'text-green-600 bg-green-100';
    if (score >= 1.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreClass = (score: number) => {
    if (score >= 2.5) return 'text-green-600 font-semibold';
    if (score >= 1.5) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };



  // Show error state if there's an issue
  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Competitor Data</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Summary Cards removed - Keeping only the competitor analysis functionality */}

      {/* Competitor Performance Chart */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Competitor Performance Overview</h3>
            <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64 flex items-end justify-between space-x-1 sm:space-x-2">
            {competitors.map((competitor, index) => {
              const avgScore = competitor.totalScore || 0;
              const heightPercentage = Math.min(100, Math.max(5, (avgScore / 10) * 100)); // Convert 0-10 scale to percentage
              const barColor = getScoreColor(avgScore);
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full max-w-12 sm:max-w-16 bg-gray-200 rounded-t-lg relative">
                    <div 
                      className={`${barColor} rounded-t-lg transition-all duration-500 ease-out`}
                      style={{ 
                        height: `${heightPercentage}%`,
                        minHeight: '20px'
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                        {formatScore(avgScore)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center font-medium truncate w-full">
                    {competitor.name}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span>Excellent (8-10)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                <span>Good (6-7.9)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                <span>Fair (4-5.9)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span>Poor (0-3.9)</span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Competitor</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            {showAddForm ? 'Cancel' : 'Add Competitor'}
          </button>
        </div>
        
        {showAddForm && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="competitor-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Competitor Company Name
                </label>
                <input
                  type="text"
                  id="competitor-name"
                  value={newCompetitorName}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    // Detect URL-like input: contains a dot or protocol and no spaces
                    const looksLikeUrl = /^(https?:\/\/)?[^\s]+\.[^\s]+/i.test(raw);
                    setIsUrlInput(looksLikeUrl);
                    if (looksLikeUrl) {
                      setNewCompetitorName(raw);
                    } else {
                      // Allow only A–Z and a–z for company name
                      const sanitized = raw.replace(/[^A-Za-z]/g, '');
                      setNewCompetitorName(sanitized);
                    }
                    try { (e.target as HTMLInputElement).setCustomValidity(''); } catch {}
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAddingCompetitor && newCompetitorName.trim()) {
                      handleAddCompetitor();
                    }
                  }}
                  placeholder="Enter competitor company name or paste a URL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
                  onInvalid={(e) => {
                    e.preventDefault();
                    const msg = isUrlInput
                      ? 'Please enter a valid URL (e.g., https://example.com)'
                      : 'Only letters (A–Z, a–z) are allowed';
                    (e.target as HTMLInputElement).setCustomValidity(msg);
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (!value) { e.currentTarget.setCustomValidity(''); return; }
                    if (isUrlInput) {
                      const urlOk = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[^\s]*)?$/i.test(value);
                      e.currentTarget.setCustomValidity(urlOk ? '' : 'Please enter a valid URL (e.g., https://example.com)');
                    } else {
                      const nameOk = /^[A-Za-z]+$/.test(value);
                      e.currentTarget.setCustomValidity(nameOk ? '' : 'Only letters (A–Z, a–z) are allowed');
                    }
                  }}
                  disabled={isAddingCompetitor}
                />
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleAddCompetitor}
                  disabled={isAddingCompetitor || !newCompetitorName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingCompetitor ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Add & Analyze'
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              The system will automatically analyze AI visibility scores for the new competitor.
              {isAddingCompetitor && (
                <span className="text-black font-medium">
                  {' '}This may take 30-60 seconds as we analyze across 4 AI engines.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Market Analysis Results</h2>
          <p className="text-sm text-gray-600">Detailed scoring breakdown for each company across multiple models</p>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gemini
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perplexity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claude
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ChatGPT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-black">
                            {competitor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{competitor.name}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Gemini Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.gemini)}`}>
                      {formatScore(competitor.aiScores.gemini)}
                    </span>
                  </td>
                  
                  {/* Perplexity Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.perplexity)}`}>
                      {formatScore(competitor.aiScores.perplexity)}
                    </span>
                  </td>
                  
                  {/* Claude Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.claude)}`}>
                      {formatScore(competitor.aiScores.claude)}
                    </span>
                  </td>
                  
                  {/* ChatGPT Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.chatgpt)}`}>
                      {formatScore(competitor.aiScores.chatgpt)}
                    </span>
                  </td>
                  
                  {/* Average Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getScoreClass(competitor.totalScore)}`}>
                      {formatScore(competitor.totalScore)}
                    </span>
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteCompetitor(index)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                      title="Delete competitor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor Snapshot - Holistic Market Analysis */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">Competitor Snapshot</h3>
            <p className="text-sm text-gray-600">Holistic view of your site versus competitors across multiple dimensions</p>
          </div>

          {/* Traffic Metrics Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Traffic Metrics</h4>
              <div className="space-y-3">
                {competitors.map((competitor, index) => {
                  // Simulate traffic data based on AI scores (in real implementation, this would come from SEMrush API)
                  const estimatedVisits = Math.floor((competitor.totalScore || 0) * 10000) + Math.floor(Math.random() * 50000);
                  const uniqueVisitors = Math.floor(estimatedVisits * 0.8);
                  const pagesPerVisit = (2 + (competitor.totalScore || 0) * 0.3).toFixed(1);
                  const avgDuration = Math.floor((competitor.totalScore || 0) * 60) + 30;
                  const bounceRate = Math.max(20, 80 - (competitor.totalScore || 0) * 5);
                  
                  return (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{competitor.name}</h5>
                        <span className="text-xs text-gray-500">Competitor {index + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Est. Visits:</span>
                          <span className="ml-2 font-medium">{estimatedVisits.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unique Visitors:</span>
                          <span className="ml-2 font-medium">{uniqueVisitors.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pages/Visit:</span>
                          <span className="ml-2 font-medium">{pagesPerVisit}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Duration:</span>
                          <span className="ml-2 font-medium">{avgDuration}s</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Bounce Rate:</span>
                          <span className="ml-2 font-medium">{bounceRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Market Positioning & Growth Quadrant */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Market Positioning & Growth</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Growth Quadrant Analysis</h5>
                  <p className="text-xs text-gray-600">Positioning based on Traffic vs Growth</p>
                </div>
                
                {/* Growth Quadrant Chart */}
                <div className="relative h-64 bg-white border border-gray-200 rounded-lg">
                  {/* Quadrant lines */}
                  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300"></div>
                  <div className="absolute left-1/2 top-0 w-px h-full bg-gray-300"></div>
                  
                  {/* Quadrant labels - Clean positioning without axis labels */}
                  <div className="absolute top-4 left-4 text-xs font-medium text-gray-700">Game Changers</div>
                  <div className="absolute top-4 right-4 text-xs font-medium text-gray-700">Leaders</div>
                  <div className="absolute bottom-4 left-4 text-xs font-medium text-gray-700">Niche Players</div>
                  <div className="absolute bottom-4 right-4 text-xs font-medium text-gray-700">Established Players</div>
                  
                  {/* Competitor positions */}
                  {competitors.map((competitor, index) => {
                    const trafficScore = (competitor.totalScore || 0) * 10; // 0-100 scale
                    const growthScore = Math.floor(Math.random() * 100); // Simulated growth data
                    // Adjust positioning to avoid label overlap (keep away from edges)
                    const left = Math.min(85, Math.max(15, trafficScore));
                    const top = Math.min(85, Math.max(15, 100 - growthScore));
                    
                    return (
                      <div
                        key={index}
                        className="absolute w-3 h-3 bg-black rounded-full border-2 border-white shadow-lg"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        title={`${competitor.name}: Traffic ${Math.round(trafficScore)}, Growth ${growthScore}%`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Channel Mix & Engagement */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Channel Mix & Engagement</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {competitors.map((competitor, index) => {
                const organic = Math.floor((competitor.totalScore || 0) * 10) + 30;
                const paid = Math.floor(Math.random() * 20) + 5;
                const referral = Math.floor(Math.random() * 15) + 5;
                const direct = 100 - organic - paid - referral;
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">{competitor.name}</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Organic:</span>
                        <span className="font-medium">{organic}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${organic}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium">{paid}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${paid}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Referral:</span>
                        <span className="font-medium">{referral}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${referral}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Direct:</span>
                        <span className="font-medium">{direct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${direct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Competition Level & Keyword Overlap */}
          <div className="mb-6 lg:mb-8">
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Competition Level & Keyword Overlap</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Competition Level */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Competition Level Ranking</h5>
                <div className="space-y-3">
                  {competitors.map((competitor, index) => {
                    const competitionLevel = Math.floor((competitor.totalScore || 0) * 10) + Math.floor(Math.random() * 30);
                    const sharedKeywords = Math.floor(competitionLevel * 10) + Math.floor(Math.random() * 100);
                    
                    return (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-black">{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{competitor.name}</div>
                            <div className="text-sm text-gray-600">{sharedKeywords} shared keywords</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-black">{competitionLevel}</div>
                          <div className="text-xs text-gray-500">Competition Score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keyword Gap Analysis */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Keyword Gap Analysis</h5>
                <div className="space-y-3">
                  {competitors.map((competitor, index) => {
                    const missingKeywords = Math.floor(Math.random() * 200) + 50;
                    const opportunityScore = Math.floor((competitor.totalScore || 0) * 10) + Math.floor(Math.random() * 20);
                    
                    return (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{competitor.name}</span>
                          <span className="text-xs text-gray-500">Opportunity</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Missing Keywords:</span>
                            <span className="font-medium">{missingKeywords}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${opportunityScore}%` }}></div>
                          </div>
                          <div className="text-right text-xs text-gray-500">{opportunityScore}% opportunity score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Backlink Profile Comparison */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Backlink Profile Comparison</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {competitors.map((competitor, index) => {
                const totalBacklinks = Math.floor((competitor.totalScore || 0) * 1000) + Math.floor(Math.random() * 5000);
                const referringDomains = Math.floor(totalBacklinks * 0.3) + Math.floor(Math.random() * 200);
                const dofollowBacklinks = Math.floor(totalBacklinks * 0.8);
                const nofollowBacklinks = totalBacklinks - dofollowBacklinks;
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">{competitor.name}</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total Backlinks:</span>
                        <span className="ml-2 font-medium">{totalBacklinks.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Referring Domains:</span>
                        <span className="ml-2 font-medium">{referringDomains.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Dofollow:</span>
                        <span className="ml-2 font-medium">{dofollowBacklinks.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Nofollow:</span>
                        <span className="ml-2 font-medium">{nofollowBacklinks.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};



export default AIVisibilityTable; 