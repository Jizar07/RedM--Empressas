'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, TrendingUp, DollarSign, Activity, Star, Award, Clock, BarChart3,
  User, Settings, Edit, Eye, Trash2, Search, Filter, ArrowUp, ArrowDown,
  ChevronsUpDown, Brain, Target, Zap, AlertTriangle, CheckCircle,
  XCircle, Pause, Play, Lightbulb, BookOpen, Wrench
} from 'lucide-react';

interface EnhancedWorkerData {
  workerId: string;
  workerName: string;
  currentIntent?: {
    type: 'crafting' | 'planting' | 'animal_care' | 'maintenance' | 'unknown';
    confidence: 'high' | 'medium' | 'low' | 'none';
    purpose: string;
    relatedRecipes: any[];
    nextExpectedActions: string[];
    efficiency: number;
  };
  productivityMetrics: {
    activitiesPerHour: number;
    completionRate: number;
    averageEfficiency: number;
    resourceUtilizationScore: number;
    wasteScore: number;
    specializationScore: number;
  };
  workerSpecializations: {
    area: string;
    skillLevel: number;
    totalActivities: number;
    averageEfficiency: number;
    masteryLevel?: string;
  }[];
  predictiveInsights: {
    likelyNextActivities: string[];
    estimatedCompletionTime?: string;
    resourceNeeds: { itemName: string; quantity: number; urgency: string }[];
    riskFactors: string[];
    recommendations: string[];
  };
  sessionEfficiency: number;
  totalValueCreated: number;
  completedGoals: string[];
  abandonedActivities: string[];
  performanceFlags: string[];
  timeSpentByActivity: {
    planting: number;
    animalCare: number;
    crafting: number;
    logistics: number;
    idle: number;
  };
}

interface Props {
  workers: EnhancedWorkerData[];
  onWorkerSelect?: (workerId: string) => void;
  onRefresh?: () => void;
}

const EnhancedWorkerAnalyticsDashboard: React.FC<Props> = ({
  workers,
  onWorkerSelect,
  onRefresh
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('efficiency');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  // Filter and sort workers
  const filteredWorkers = workers
    .filter(worker => {
      if (searchTerm) {
        return worker.workerName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      if (filterBy !== 'all') {
        return worker.currentIntent?.type === filterBy;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'efficiency':
          return b.sessionEfficiency - a.sessionEfficiency;
        case 'productivity':
          return b.productivityMetrics.activitiesPerHour - a.productivityMetrics.activitiesPerHour;
        case 'value':
          return b.totalValueCreated - a.totalValueCreated;
        case 'name':
          return a.workerName.localeCompare(b.workerName);
        default:
          return 0;
      }
    });

  const getIntentIcon = (type?: string) => {
    switch (type) {
      case 'crafting': return <Wrench className="h-4 w-4" />;
      case 'planting': return <div className="h-4 w-4">🌱</div>;
      case 'animal_care': return <div className="h-4 w-4">🐄</div>;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'planting': return 'bg-green-500';
      case 'animalCare': return 'bg-blue-500';
      case 'crafting': return 'bg-purple-500';
      case 'logistics': return 'bg-orange-500';
      case 'idle': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🧠 Enhanced Worker Analytics</h1>
            <p className="text-indigo-100">AI-powered insights, activity tracking, and performance analysis</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2 hover:bg-white/30 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold">{workers.length}</div>
              <div className="text-indigo-100 text-sm">Active Workers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'intents', name: 'Current Intents', icon: Brain },
              { id: 'performance', name: 'Performance', icon: TrendingUp },
              { id: 'specializations', name: 'Specializations', icon: Award },
              { id: 'insights', name: 'Insights', icon: Lightbulb }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search workers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="efficiency">Sort by Efficiency</option>
              <option value="productivity">Sort by Productivity</option>
              <option value="value">Sort by Value Created</option>
              <option value="name">Sort by Name</option>
            </select>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Activities</option>
              <option value="crafting">Crafting</option>
              <option value="planting">Planting</option>
              <option value="animal_care">Animal Care</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Metrics */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Team Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Efficiency</span>
                    <span className="font-semibold">
                      {((workers.reduce((sum, w) => sum + w.sessionEfficiency, 0) / workers.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Value Created</span>
                    <span className="font-semibold">
                      ${workers.reduce((sum, w) => sum + w.totalValueCreated, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Recipes</span>
                    <span className="font-semibold">
                      {workers.filter(w => w.currentIntent?.type === 'crafting').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="font-semibold">
                      {((workers.reduce((sum, w) => sum + w.productivityMetrics.completionRate, 0) / workers.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Distribution */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Activity Distribution</h3>
                <div className="space-y-3">
                  {['crafting', 'planting', 'animal_care', 'maintenance', 'unknown'].map(activity => {
                    const count = workers.filter(w => w.currentIntent?.type === activity).length;
                    const percentage = (count / workers.length) * 100;
                    return (
                      <div key={activity} className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="flex-1 capitalize text-sm">{activity.replace('_', ' ')}</span>
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Worker List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">👥 Worker Overview</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {filteredWorkers.map(worker => (
                    <div
                      key={worker.workerId}
                      className="p-6 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onWorkerSelect?.(worker.workerId)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{worker.workerName}</h4>
                            {worker.performanceFlags.map(flag => (
                              <span
                                key={flag}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  flag === 'excellent' ? 'bg-green-100 text-green-800' :
                                  flag === 'good' ? 'bg-blue-100 text-blue-800' :
                                  flag === 'needs_attention' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {flag.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              {getIntentIcon(worker.currentIntent?.type)}
                              <span className="text-sm text-gray-600">
                                {worker.currentIntent?.purpose || 'No active intent'}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(worker.currentIntent?.confidence)}`}>
                              {worker.currentIntent?.confidence || 'none'} confidence
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {(worker.sessionEfficiency * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">Efficiency</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ${worker.totalValueCreated.toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-500">Value</div>
                        </div>
                      </div>

                      {/* Progress indicators */}
                      <div className="mt-3 flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Session Progress</span>
                            <span>{worker.completedGoals.length} goals</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-500 h-2 rounded-full"
                              style={{ width: `${worker.sessionEfficiency * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        {worker.currentIntent?.estimatedCompletionTime && (
                          <div className="text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            ETA: {new Date(worker.currentIntent.estimatedCompletionTime).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'intents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.filter(w => w.currentIntent).map(worker => (
              <div key={worker.workerId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    {getIntentIcon(worker.currentIntent?.type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{worker.workerName}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(worker.currentIntent?.confidence)}`}>
                      {worker.currentIntent?.confidence} confidence
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Current Purpose</h5>
                    <p className="text-sm text-gray-600">{worker.currentIntent?.purpose}</p>
                  </div>

                  {worker.currentIntent?.nextExpectedActions.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Next Actions</h5>
                      <ul className="space-y-1">
                        {worker.currentIntent.nextExpectedActions.map((action, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <ArrowUp className="w-3 h-3" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {worker.predictiveInsights.resourceNeeds.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Resource Needs</h5>
                      <div className="space-y-1">
                        {worker.predictiveInsights.resourceNeeds.map((need, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{need.itemName}</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{need.quantity}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                need.urgency === 'high' ? 'bg-red-100 text-red-800' :
                                need.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {need.urgency}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="space-y-6">
            {filteredWorkers.map(worker => (
              <div key={worker.workerId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{worker.workerName}</h4>
                      <div className="flex items-center space-x-2">
                        {worker.performanceFlags.map(flag => (
                          <span
                            key={flag}
                            className={`px-2 py-1 text-xs rounded-full ${getPerformanceColor(worker.sessionEfficiency)}`}
                          >
                            {flag.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {(worker.sessionEfficiency * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Overall Efficiency</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {worker.productivityMetrics.activitiesPerHour.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">Activities/Hour</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {(worker.productivityMetrics.completionRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Completion Rate</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {(worker.productivityMetrics.resourceUtilizationScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Resource Efficiency</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      ${worker.totalValueCreated.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500">Value Created</div>
                  </div>
                </div>

                {/* Time Distribution Chart */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Time Distribution</h5>
                  <div className="space-y-2">
                    {Object.entries(worker.timeSpentByActivity).map(([activity, time]) => {
                      const totalTime = Object.values(worker.timeSpentByActivity).reduce((sum, t) => sum + t, 0);
                      const percentage = totalTime > 0 ? (time / totalTime) * 100 : 0;

                      return (
                        <div key={activity} className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getActivityColor(activity)}`}></div>
                          <span className="flex-1 capitalize text-sm">{activity.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-sm font-medium">{time.toFixed(0)}min</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getActivityColor(activity)}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-12">{percentage.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'specializations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map(worker => (
              <div key={worker.workerId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{worker.workerName}</h4>
                    <div className="text-sm text-gray-500">
                      Specialization Score: {(worker.productivityMetrics.specializationScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium text-gray-900">Skill Areas</h5>
                  {worker.workerSpecializations.map((spec, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="capitalize text-sm font-medium">{spec.area.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{spec.totalActivities} activities</span>
                          <span className="text-sm font-medium">{(spec.skillLevel * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${spec.skillLevel * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg Efficiency: {(spec.averageEfficiency * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'insights' && (
          <div className="space-y-6">
            {filteredWorkers.filter(w =>
              w.predictiveInsights.recommendations.length > 0 ||
              w.predictiveInsights.riskFactors.length > 0
            ).map(worker => (
              <div key={worker.workerId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">{worker.workerName}</h4>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {worker.predictiveInsights.recommendations.length > 0 && (
                    <div>
                      <h5 className="flex items-center space-x-2 font-medium text-gray-900 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Recommendations</span>
                      </h5>
                      <ul className="space-y-2">
                        {worker.predictiveInsights.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                            <ArrowUp className="w-3 h-3 mt-0.5 text-green-600" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {worker.predictiveInsights.riskFactors.length > 0 && (
                    <div>
                      <h5 className="flex items-center space-x-2 font-medium text-gray-900 mb-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span>Risk Factors</span>
                      </h5>
                      <ul className="space-y-2">
                        {worker.predictiveInsights.riskFactors.map((risk, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                            <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-600" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Goals and Achievements */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="flex items-center space-x-2 font-medium text-gray-900 mb-3">
                        <Target className="w-4 h-4 text-green-600" />
                        <span>Completed Goals ({worker.completedGoals.length})</span>
                      </h5>
                      {worker.completedGoals.length > 0 ? (
                        <ul className="space-y-1">
                          {worker.completedGoals.slice(0, 3).map((goal, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span>{goal}</span>
                            </li>
                          ))}
                          {worker.completedGoals.length > 3 && (
                            <li className="text-xs text-gray-500">
                              +{worker.completedGoals.length - 3} more...
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No goals completed yet</p>
                      )}
                    </div>

                    <div>
                      <h5 className="flex items-center space-x-2 font-medium text-gray-900 mb-3">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Abandoned Activities ({worker.abandonedActivities.length})</span>
                      </h5>
                      {worker.abandonedActivities.length > 0 ? (
                        <ul className="space-y-1">
                          {worker.abandonedActivities.slice(0, 3).map((activity, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>{activity}</span>
                            </li>
                          ))}
                          {worker.abandonedActivities.length > 3 && (
                            <li className="text-xs text-gray-500">
                              +{worker.abandonedActivities.length - 3} more...
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No abandoned activities</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedWorkerAnalyticsDashboard;