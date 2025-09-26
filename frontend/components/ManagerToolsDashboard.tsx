'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, TrendingUp, DollarSign, Activity, Star, Award, Clock, BarChart3,
  User, Settings, Edit, Eye, Trash2, Search, Filter, ArrowUp, ArrowDown,
  ChevronsUpDown, Brain, Target, Zap, AlertTriangle, CheckCircle,
  XCircle, Pause, Play, Lightbulb, BookOpen, Wrench, Bell, Shield,
  PieChart, LineChart, Briefcase, UserCheck, AlertCircle
} from 'lucide-react';

interface ManagerToolsProps {
  workers: any[];
  alerts: any[];
  monitoringStats: any;
  onWorkerAssign?: (workerId: string, task: string) => void;
  onTrainingRecommend?: (workerId: string, area: string) => void;
  onResourceRequest?: (item: string, quantity: number, urgency: string) => void;
}

interface WorkerComparison {
  workerId: string;
  workerName: string;
  efficiency: number;
  productivity: number;
  valueCreated: number;
  specializations: string[];
  strengths: string[];
  improvementAreas: string[];
  rank: number;
}

interface TaskRecommendation {
  workerId: string;
  workerName: string;
  recommendedTask: string;
  reason: string;
  expectedEfficiency: number;
  priority: 'low' | 'medium' | 'high';
}

interface TrainingPlan {
  area: string;
  workers: string[];
  description: string;
  expectedImprovement: number;
  urgency: 'low' | 'medium' | 'high';
  estimatedDuration: string;
}

const ManagerToolsDashboard: React.FC<ManagerToolsProps> = ({
  workers,
  alerts,
  monitoringStats,
  onWorkerAssign,
  onTrainingRecommend,
  onResourceRequest
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState('efficiency');
  const [timeRange, setTimeRange] = useState('24h');

  // Generate worker comparisons
  const generateWorkerComparisons = (): WorkerComparison[] => {
    return workers
      .map((worker, index) => ({
        workerId: worker.workerId,
        workerName: worker.workerName,
        efficiency: worker.sessionEfficiency || 0,
        productivity: worker.productivityMetrics?.activitiesPerHour || 0,
        valueCreated: worker.totalValueCreated || 0,
        specializations: worker.workerSpecializations?.map((s: any) => s.area) || [],
        strengths: worker.workerSpecializations
          ?.filter((s: any) => s.skillLevel > 0.7)
          .map((s: any) => s.area) || [],
        improvementAreas: worker.predictiveInsights?.recommendations || [],
        rank: index + 1
      }))
      .sort((a, b) => {
        switch (comparisonMetric) {
          case 'efficiency': return b.efficiency - a.efficiency;
          case 'productivity': return b.productivity - a.productivity;
          case 'value': return b.valueCreated - a.valueCreated;
          default: return 0;
        }
      })
      .map((worker, index) => ({ ...worker, rank: index + 1 }));
  };

  // Generate task recommendations
  const generateTaskRecommendations = (): TaskRecommendation[] => {
    const recommendations: TaskRecommendation[] = [];

    workers.forEach(worker => {
      if (worker.currentIntent?.type === 'unknown' || worker.productivityMetrics?.activitiesPerHour < 2) {
        // Worker needs new tasks
        const bestSpecialization = worker.workerSpecializations
          ?.sort((a: any, b: any) => b.skillLevel - a.skillLevel)[0];

        if (bestSpecialization) {
          recommendations.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            recommendedTask: `${bestSpecialization.area} activities`,
            reason: `High skill level (${(bestSpecialization.skillLevel * 100).toFixed(0)}%) in ${bestSpecialization.area}`,
            expectedEfficiency: bestSpecialization.averageEfficiency || 0.8,
            priority: worker.productivityMetrics?.activitiesPerHour < 1 ? 'high' : 'medium'
          });
        } else {
          // New worker or no clear specialization
          recommendations.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            recommendedTask: 'Basic planting activities',
            reason: 'New worker - start with simple tasks to build skills',
            expectedEfficiency: 0.6,
            priority: 'medium'
          });
        }
      }

      // Check for cross-training opportunities
      const lowSkillAreas = worker.workerSpecializations
        ?.filter((s: any) => s.skillLevel < 0.3 && s.totalActivities < 5) || [];

      if (lowSkillAreas.length > 0) {
        lowSkillAreas.forEach((area: any) => {
          recommendations.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            recommendedTask: `Training in ${area.area}`,
            reason: 'Cross-training opportunity to increase versatility',
            expectedEfficiency: 0.4,
            priority: 'low'
          });
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // Generate training plans
  const generateTrainingPlans = (): TrainingPlan[] => {
    const skillGaps = new Map<string, string[]>();

    workers.forEach(worker => {
      const lowEfficiencyAreas = worker.workerSpecializations
        ?.filter((s: any) => s.averageEfficiency < 0.6 && s.totalActivities > 3) || [];

      lowEfficiencyAreas.forEach((area: any) => {
        if (!skillGaps.has(area.area)) {
          skillGaps.set(area.area, []);
        }
        skillGaps.get(area.area)!.push(worker.workerName);
      });
    });

    const trainingPlans: TrainingPlan[] = [];

    for (const [area, workerNames] of skillGaps.entries()) {
      if (workerNames.length >= 2) { // Group training for 2+ workers
        trainingPlans.push({
          area: area.replace('_', ' ').charAt(0).toUpperCase() + area.slice(1),
          workers: workerNames,
          description: `Improve efficiency in ${area.replace('_', ' ')} activities`,
          expectedImprovement: 0.3, // 30% improvement expected
          urgency: workerNames.length > 3 ? 'high' : 'medium',
          estimatedDuration: '2-3 training sessions'
        });
      }
    }

    return trainingPlans;
  };

  const workerComparisons = generateWorkerComparisons();
  const taskRecommendations = generateTaskRecommendations();
  const trainingPlans = generateTrainingPlans();

  const getMetricColor = (value: number, max: number) => {
    const percentage = max > 0 ? value / max : 0;
    if (percentage >= 0.8) return 'text-green-600 bg-green-100';
    if (percentage >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎯 Manager Tools</h1>
            <p className="text-purple-100">Performance comparison, task assignment, and team optimization</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{monitoringStats?.totalWorkers || 0}</div>
              <div className="text-purple-100 text-sm">Total Workers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{((monitoringStats?.averageEfficiency || 0) * 100).toFixed(1)}%</div>
              <div className="text-purple-100 text-sm">Avg Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{alerts?.filter((a: any) => !a.resolved).length || 0}</div>
              <div className="text-purple-100 text-sm">Active Alerts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Team Overview', icon: BarChart3 },
              { id: 'comparison', name: 'Worker Comparison', icon: Users },
              { id: 'assignments', name: 'Task Assignments', icon: Briefcase },
              { id: 'training', name: 'Training Plans', icon: BookOpen },
              { id: 'alerts', name: 'Alert Management', icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-purple-600 text-purple-600'
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
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Performance Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Team Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Workers</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{monitoringStats?.activeWorkers || 0}</span>
                    <div className="text-xs text-green-600">
                      {monitoringStats?.totalWorkers > 0
                        ? `${((monitoringStats.activeWorkers / monitoringStats.totalWorkers) * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Team Efficiency</span>
                  <span className="font-semibold">
                    {((monitoringStats?.averageEfficiency || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Value Generated</span>
                  <span className="font-semibold">${(monitoringStats?.totalValueGenerated || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Workers with Alerts</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{monitoringStats?.workersWithAlerts || 0}</span>
                    <span className="text-xs text-red-600">
                      {monitoringStats?.criticalAlerts || 0} critical
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedTab('assignments')}
                  className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Assign Tasks</span>
                </button>
                <button
                  onClick={() => setSelectedTab('training')}
                  className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Plan Training</span>
                </button>
                <button
                  onClick={() => setSelectedTab('comparison')}
                  className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm">Compare Workers</span>
                </button>
                <button
                  onClick={() => setSelectedTab('alerts')}
                  className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm">Manage Alerts</span>
                </button>
              </div>
            </div>

            {/* Top Performers */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {workerComparisons.slice(0, 3).map((worker, index) => (
                  <div key={worker.workerId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        <Star className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{worker.workerName}</h4>
                        <p className="text-sm text-gray-500">Rank #{worker.rank}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Efficiency:</span>
                        <span className="font-medium">{(worker.efficiency * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Productivity:</span>
                        <span className="font-medium">{worker.productivity.toFixed(1)}/hr</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Value:</span>
                        <span className="font-medium">${worker.valueCreated.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'comparison' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Worker Performance Comparison</h3>
                <div className="flex items-center space-x-4">
                  <select
                    value={comparisonMetric}
                    onChange={(e) => setComparisonMetric(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="efficiency">Sort by Efficiency</option>
                    <option value="productivity">Sort by Productivity</option>
                    <option value="value">Sort by Value Created</option>
                  </select>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efficiency
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productivity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specializations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workerComparisons.map((worker) => (
                    <tr key={worker.workerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                          worker.rank <= 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-sm font-bold">#{worker.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{worker.workerName}</div>
                            <div className="text-sm text-gray-500">ID: {worker.workerId.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getMetricColor(worker.efficiency, 1)}`}>
                          {(worker.efficiency * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {worker.productivity.toFixed(1)}/hr
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          ${worker.valueCreated.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {worker.specializations.slice(0, 2).map((spec, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {spec.replace('_', ' ')}
                            </span>
                          ))}
                          {worker.specializations.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{worker.specializations.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
                        <button
                          onClick={() => onWorkerAssign?.(worker.workerId, 'optimal_task')}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => onTrainingRecommend?.(worker.workerId, 'improvement')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Train
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'assignments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Task Assignment Recommendations</h3>
              <div className="space-y-4">
                {taskRecommendations.map((rec, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{rec.workerName}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">
                            Recommended: {rec.recommendedTask}
                          </p>
                          <p className="text-sm text-gray-600">{rec.reason}</p>
                          <p className="text-xs text-gray-500">
                            Expected efficiency: {(rec.expectedEfficiency * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => onWorkerAssign?.(rec.workerId, rec.recommendedTask)}
                          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Assign Task
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'training' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Training Plan Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trainingPlans.map((plan, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{plan.area} Training</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(plan.urgency)}`}>
                        {plan.urgency} urgency
                      </span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">{plan.description}</p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Workers affected:</span>
                        <span className="font-medium">{plan.workers.length}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Expected improvement:</span>
                        <span className="font-medium text-green-600">
                          +{(plan.expectedImprovement * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{plan.estimatedDuration}</span>
                      </div>

                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-xs text-gray-500 mb-2">Workers:</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.workers.map((workerName, workerIndex) => (
                            <span
                              key={workerIndex}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {workerName}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => plan.workers.forEach(workerName => {
                          const worker = workers.find(w => w.workerName === workerName);
                          if (worker) onTrainingRecommend?.(worker.workerId, plan.area);
                        })}
                        className="w-full mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Schedule Training
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">🚨 Active Alerts Management</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts?.filter((alert: any) => !alert.resolved).map((alert: any) => (
                <div key={alert.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{alert.description}</p>
                      <div className="text-sm text-gray-500 mb-3">
                        Worker: {alert.workerName} • {new Date(alert.timestamp).toLocaleString()}
                      </div>
                      {alert.recommendations && alert.recommendations.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {alert.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="flex items-start space-x-2">
                                <ArrowUp className="w-3 h-3 mt-0.5" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <button className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded hover:bg-green-200 transition-colors">
                          Resolve
                        </button>
                        <button className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200 transition-colors">
                          View Worker
                        </button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded hover:bg-gray-200 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerToolsDashboard;