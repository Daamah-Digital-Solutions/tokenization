import React, { useState } from 'react';

export interface ConstructionMilestone {
  id: string;
  title: string;
  description: string;
  plannedDate: string;
  completedDate?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'delayed';
  progress: number;
  images?: string[];
  notes?: string;
  paymentRequired?: boolean;
  paymentAmount?: number;
  delayReason?: string;
}

export interface ConstructionProgressData {
  propertyId: string;
  propertyName: string;
  overallProgress: number;
  currentPhase: string;
  milestones: ConstructionMilestone[];
  lastUpdated: string;
  nextInspectionDate?: string;
  developer: {
    name: string;
    contact: string;
    projectManager?: string;
  };
  timeline: {
    startDate: string;
    plannedCompletion: string;
    revisedCompletion?: string;
  };
}

interface ConstructionProgressProps {
  progressData: ConstructionProgressData;
  showImages?: boolean;
  showPaymentInfo?: boolean;
  onMilestoneClick?: (milestoneId: string) => void;
  className?: string;
}

export const ConstructionProgress: React.FC<ConstructionProgressProps> = ({
  progressData,
  showImages = true,
  showPaymentInfo = true,
  onMilestoneClick,
  className = ''
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-neutral-300 dark:bg-slate-600';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-neutral-300 dark:bg-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'pending': return '⏳';
      case 'delayed': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'pending': return 'text-neutral-600 dark:text-slate-400';
      case 'delayed': return 'text-red-600 dark:text-red-400';
      default: return 'text-neutral-600 dark:text-slate-400';
    }
  };

  const completedMilestones = progressData.milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = progressData.milestones.length;
  const milestonesToShow = showAllMilestones ? progressData.milestones : progressData.milestones.slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysFromNow = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `in ${diffDays} days`;
    } else if (diffDays === 0) {
      return 'today';
    } else {
      return `${Math.abs(diffDays)} days ago`;
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Construction Progress
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              {progressData.propertyName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
              {progressData.overallProgress}%
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Overall Complete
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              Current Phase: {progressData.currentPhase}
            </span>
            <span className="text-sm text-neutral-600 dark:text-slate-400">
              {completedMilestones} of {totalMilestones} milestones complete
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressData.overallProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Started</p>
            <p className="font-medium text-neutral-900 dark:text-slate-100">
              {formatDate(progressData.timeline.startDate)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Planned Completion</p>
            <p className="font-medium text-neutral-900 dark:text-slate-100">
              {formatDate(progressData.timeline.plannedCompletion)}
            </p>
            {progressData.timeline.revisedCompletion && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Revised: {formatDate(progressData.timeline.revisedCompletion)}
              </p>
            )}
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Last Updated</p>
            <p className="font-medium text-neutral-900 dark:text-slate-100">
              {formatDate(progressData.lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="p-6">
        <div className="space-y-4">
          {milestonesToShow.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`relative flex items-start space-x-4 p-4 rounded-lg cursor-pointer transition-colors ${
                selectedMilestone === milestone.id
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-neutral-50 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setSelectedMilestone(selectedMilestone === milestone.id ? null : milestone.id);
                onMilestoneClick?.(milestone.id);
              }}
            >
              {/* Timeline Line */}
              {index < milestonesToShow.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-neutral-200 dark:bg-slate-600"></div>
              )}

              {/* Status Icon */}
              <div className="flex-shrink-0 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${getStatusColor(milestone.status)}`}>
                  {getStatusIcon(milestone.status)}
                </div>
                {milestone.status === 'in_progress' && (
                  <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-blue-300 animate-pulse"></div>
                )}
              </div>

              {/* Milestone Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                    {milestone.title}
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm font-medium ${getStatusText(milestone.status)}`}>
                      {milestone.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {showPaymentInfo && milestone.paymentRequired && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
                        Payment Required
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                  {milestone.description}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-neutral-500 dark:text-slate-400">
                      Planned: {formatDate(milestone.plannedDate)}
                    </span>
                    {milestone.completedDate ? (
                      <span className="text-green-600 dark:text-green-400">
                        Completed: {formatDate(milestone.completedDate)}
                      </span>
                    ) : (
                      <span className="text-neutral-500 dark:text-slate-400">
                        {getDaysFromNow(milestone.plannedDate)}
                      </span>
                    )}
                  </div>
                  {milestone.progress > 0 && milestone.status !== 'completed' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-neutral-200 dark:bg-slate-600 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${milestone.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-slate-400">
                        {milestone.progress}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                {showPaymentInfo && milestone.paymentRequired && milestone.paymentAmount && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Payment Required: ${milestone.paymentAmount.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Delay Information */}
                {milestone.status === 'delayed' && milestone.delayReason && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>Delayed:</strong> {milestone.delayReason}
                    </p>
                  </div>
                )}

                {/* Expanded Details */}
                {selectedMilestone === milestone.id && (
                  <div className="mt-4 p-4 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-600 rounded-lg">
                    {milestone.notes && (
                      <div className="mb-4">
                        <h5 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">Notes</h5>
                        <p className="text-sm text-neutral-600 dark:text-slate-400">
                          {milestone.notes}
                        </p>
                      </div>
                    )}

                    {showImages && milestone.images && milestone.images.length > 0 && (
                      <div>
                        <h5 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">
                          Progress Images
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {milestone.images.map((image, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={image}
                              alt={`${milestone.title} progress ${imgIndex + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less Button */}
        {progressData.milestones.length > 5 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAllMilestones(!showAllMilestones)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {showAllMilestones 
                ? `Show Less` 
                : `Show ${progressData.milestones.length - 5} More Milestones`
              }
            </button>
          </div>
        )}
      </div>

      {/* Developer Info */}
      <div className="p-6 border-t border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/50">
        <h3 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">
          Developer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Developer</p>
            <p className="font-medium text-neutral-900 dark:text-slate-100">
              {progressData.developer.name}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Contact</p>
            <p className="font-medium text-neutral-900 dark:text-slate-100">
              {progressData.developer.contact}
            </p>
          </div>
          {progressData.developer.projectManager && (
            <div className="md:col-span-2">
              <p className="text-neutral-500 dark:text-slate-400">Project Manager</p>
              <p className="font-medium text-neutral-900 dark:text-slate-100">
                {progressData.developer.projectManager}
              </p>
            </div>
          )}
        </div>

        {progressData.nextInspectionDate && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 dark:text-blue-400">🔍</span>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Next Inspection Scheduled
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {formatDate(progressData.nextInspectionDate)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};