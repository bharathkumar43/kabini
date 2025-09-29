import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon, FileText } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import { sessionManager } from '../services/sessionManager';
import type { HistoryItem, QAHistoryItem } from '../types';

import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { computeAiCitationScore, computeRelativeAiVisibility, median } from '../utils/formulas';



export function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for the product tracker
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Quick Analysis Handler
  const handleQuickAnalysis = () => {
    if (!inputValue.trim()) {
      alert('Please enter a website URL or product name');
      return;
    }
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      alert(`Quick analysis completed for: ${inputValue}`);
    }, 2000);
  };

  // Method card handlers
  const handleConnectStore = () => {
    navigate('/shopify-sync');
  };

  const handleBulkImport = () => {
    navigate('/bulk-import');
  };

  const handleAddProduct = () => {
    navigate('/manual-add');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI Visibility Product Tracker
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Track product visibility across AI assistants and shopping search with actionable insights.
          </p>
        </div>

        {/* Start Your Analysis Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Start Your Analysis
            </h2>
            <p className="text-lg text-gray-600">
              Choose how you'd like to analyze your products
            </p>
          </div>

          {/* URL/Product Name Input Section */}
          <div className="mb-8">
            <label htmlFor="website-input" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL or Product Name
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                id="website-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter website URL or product name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isAnalyzing}
              />
              <button
                onClick={handleQuickAnalysis}
                disabled={isAnalyzing || !inputValue.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg min-w-[180px]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Quick Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 font-medium">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Shopify Sync Card */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Recommended
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Shopify Sync</h3>
              <p className="text-gray-600 mb-6">
                1-click integration with automatic product import
              </p>
              <button
                onClick={handleConnectStore}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Connect Store
              </button>
            </div>

            {/* CSV Upload Card */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-colors group">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">CSV Upload</h3>
              <p className="text-gray-600 mb-6">
                Bulk upload from spreadsheet or CSV file
              </p>
              <button
                onClick={handleBulkImport}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Bulk Import
              </button>
            </div>

            {/* Manual Add Card */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors group">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Add</h3>
              <p className="text-gray-600 mb-6">
                Add products individually with custom details
              </p>
              <button
                onClick={handleAddProduct}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 