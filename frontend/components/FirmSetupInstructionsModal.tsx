'use client';

import { Building, ArrowRight, Check } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface FirmSetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToFirmManagement?: () => void;
}

export default function FirmSetupInstructionsModal({
  isOpen,
  onClose,
  onGoToFirmManagement
}: FirmSetupInstructionsModalProps) {
  const { markFirmInstructionsSeen } = useOnboarding();

  if (!isOpen) return null;

  const handleDismiss = () => {
    markFirmInstructionsSeen();
    onClose();
  };

  const handleGoToManagement = () => {
    markFirmInstructionsSeen();
    if (onGoToFirmManagement) {
      onGoToFirmManagement();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Building className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Set Up Your Firms</h2>
              <p className="text-blue-100 mt-1">Create and manage your businesses</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome! Here's how to set up your firms (businesses) on your server:
          </p>

          {/* Step 1 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Go to Firm Management
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Navigate to <strong>Admin Tools</strong> section on the dashboard, then click on <strong>Firm Management</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Create a New Firm
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                Click <strong>"Create New Firm"</strong> and choose from our pre-built templates:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                  <div className="text-2xl mb-1">🌾</div>
                  <div className="font-medium text-gray-900 dark:text-white">Fazenda</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Farm management system</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <div className="text-2xl mb-1">🚂</div>
                  <div className="font-medium text-gray-900 dark:text-white">Ferrovia</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Railway supply chain</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <div className="text-2xl mb-1">🐣</div>
                  <div className="font-medium text-gray-900 dark:text-white">Berçário</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Animal nursery</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                  <div className="text-2xl mb-1">🏥</div>
                  <div className="font-medium text-gray-900 dark:text-white">Veterinária</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Veterinary clinic</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Configure Channels & Roles
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                Set up which Discord channels the bot should monitor for activity and which roles can access the firm:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Monitoring Channels:</strong> Select the channels where workers post their activities</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Access Roles:</strong> Choose which Discord roles can view and manage the firm</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enable & Start Managing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Enable the firm and it will start tracking activities automatically. You can manage workers, inventory, and payments from the firm's dashboard.
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>💡 Tip:</strong> You can create multiple firms on the same server. Each firm operates independently with its own workers, inventory, and settings.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleDismiss}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            I'll do this later
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Got it, thanks!
            </button>
            {onGoToFirmManagement && (
              <button
                onClick={handleGoToManagement}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md flex items-center"
              >
                Go to Firm Management
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
