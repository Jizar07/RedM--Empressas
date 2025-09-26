import { ActivityIntent, ActivityCluster, RecipeMatch } from '../services/ActivityIntentAnalyzer';

export interface EnhancedTransaction {
  // Existing fields
  type: 'seed_taken' | 'plants_deposited' | 'animals_taken' | 'animals_sold' | 'money_deposited' | 'money_withdrawn' | 'item_taken' | 'item_deposited' | 'crafting_completed';
  itemName?: string;
  animalType?: string;
  quantity: number;
  amount?: number;
  cost?: number;
  transactionId: string;
  timestamp: string;

  // Enhanced intelligence fields
  detectedIntent?: ActivityIntent;
  relatedRecipe?: string; // Recipe ID this transaction contributes to
  completionStatus?: 'started' | 'in_progress' | 'completed' | 'abandoned';
  efficiency?: number; // 0-1 score for how efficiently this action was performed
  activityCluster?: string; // ID of the activity cluster this belongs to
  purposes?: string[]; // What this transaction serves (e.g., "Libidgel Production", "Box Crafting")
  wasteLevel?: 'none' | 'low' | 'medium' | 'high'; // Material waste assessment
  timeToComplete?: number; // Minutes taken from start to completion
}

export interface WorkerSpecialization {
  area: 'planting' | 'animal_care' | 'crafting' | 'logistics' | 'management';
  skillLevel: number; // 0-1 score
  totalActivities: number;
  averageEfficiency: number;
  preferredRecipes?: string[]; // Recipe IDs worker excels at
  improvementAreas?: string[];
}

export interface ProductivityMetrics {
  activitiesPerHour: number;
  completionRate: number; // Percentage of started activities that get completed
  averageEfficiency: number;
  resourceUtilizationScore: number; // How well worker uses taken materials
  wasteScore: number; // Amount of wasted materials (lower is better)
  specializationScore: number; // How focused worker is on their best areas
}

export interface PredictiveInsights {
  likelyNextActivities: string[];
  estimatedCompletionTime?: string; // For active recipes
  resourceNeeds: { itemName: string; quantity: number; urgency: 'low' | 'medium' | 'high' }[];
  riskFactors: string[]; // Things that might prevent completion
  recommendations: string[];
}

export interface EnhancedWorkerSession {
  // Existing fields
  workerId: string;
  workerName: string;
  channelId: string;
  sessionId: string;
  startTime: string;
  lastActivity: string;
  status: 'active' | 'idle' | 'paid' | 'completed';

  // Enhanced transaction tracking
  plantTransactions: EnhancedTransaction[];
  animalTransactions: EnhancedTransaction[];
  inventoryTransactions: EnhancedTransaction[];
  craftingTransactions: EnhancedTransaction[];

  // Intelligence layer
  currentIntent?: ActivityIntent;
  activityClusters: ActivityCluster[];
  activeRecipes: RecipeMatch[];
  workerSpecializations: WorkerSpecialization[];
  productivityMetrics: ProductivityMetrics;
  predictiveInsights: PredictiveInsights;

  // Performance tracking
  sessionEfficiency: number;
  completedGoals: string[];
  abandonedActivities: string[];
  totalValueCreated: number; // Economic value of completed activities

  // Quality metrics
  errorCount: number; // Mistakes or inefficiencies detected
  helpRequestCount: number; // Times worker needed assistance
  innovationCount: number; // Times worker found better ways to do things

  // Time analysis
  timeSpentByActivity: {
    planting: number;
    animalCare: number;
    crafting: number;
    logistics: number;
    idle: number;
  };

  // Social/collaboration tracking
  collaborations: {
    workerId: string;
    workerName: string;
    activityType: string;
    duration: number;
    efficiency: number;
  }[];

  // Learning and development
  newSkillsLearned: string[];
  challengesEncountered: string[];
  improvementOpportunities: string[];

  // Manager insights
  managerNotes?: string[];
  performanceFlags?: ('excellent' | 'good' | 'needs_attention' | 'training_needed')[];
  nextActions?: string[]; // What manager recommends worker do next
}

export interface WorkerActivitySummary {
  workerId: string;
  workerName: string;
  timeRange: {
    start: string;
    end: string;
  };

  // High-level metrics
  totalSessions: number;
  totalActivities: number;
  averageSessionLength: number;
  productivity: ProductivityMetrics;

  // Activity breakdown
  activityBreakdown: {
    planting: { count: number; efficiency: number; value: number };
    animalCare: { count: number; efficiency: number; value: number };
    crafting: { count: number; efficiency: number; value: number };
    logistics: { count: number; efficiency: number; value: number };
  };

  // Recipe mastery
  recipeMastery: {
    recipeId: string;
    recipeName: string;
    timesCompleted: number;
    averageEfficiency: number;
    bestTime: number;
    masteryLevel: 'novice' | 'apprentice' | 'skilled' | 'expert' | 'master';
  }[];

  // Growth metrics
  skillProgression: {
    area: string;
    startLevel: number;
    currentLevel: number;
    improvement: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];

  // Behavioral insights
  workPatterns: {
    preferredStartTime: string;
    averageSessionDuration: number;
    peakProductivityHours: string[];
    commonActivitySequences: string[];
  };

  // Economic impact
  totalValueGenerated: number;
  costEfficiency: number;
  wasteReduction: number;

  // Team contribution
  collaborationScore: number;
  helpProvidedToOthers: number;
  helpReceivedFromOthers: number;
  leadershipMoments: string[];
}

export interface ManagerDashboardData {
  // Team overview
  totalWorkers: number;
  activeWorkers: number;
  totalSessions: number;
  averageTeamEfficiency: number;

  // Performance distribution
  topPerformers: WorkerActivitySummary[];
  strugglingWorkers: WorkerActivitySummary[];
  improvingWorkers: WorkerActivitySummary[];

  // Resource allocation
  busyAreas: string[];
  underutilizedAreas: string[];
  bottleneckActivities: string[];

  // Recommendations
  trainingNeeds: { area: string; workers: string[]; urgency: 'low' | 'medium' | 'high' }[];
  taskReassignments: { worker: string; suggestedActivity: string; reason: string }[];
  resourceRequests: { item: string; quantity: number; requestedBy: string[]; urgency: 'low' | 'medium' | 'high' }[];

  // Predictive analytics
  weeklyForecast: {
    expectedProduction: { item: string; quantity: number }[];
    potentialBottlenecks: string[];
    recommendedPreparations: string[];
  };

  // Quality metrics
  overallQualityScore: number;
  errorTrends: { date: string; errorCount: number }[];
  innovationRate: number;
}