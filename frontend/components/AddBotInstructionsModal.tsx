'use client';

import { Bot, Check, ExternalLink } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface AddBotInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function AddBotInstructionsModal({ isOpen, onClose, onComplete }: AddBotInstructionsModalProps) {
  const { markAddBotInstructionsSeen } = useOnboarding();

  if (!isOpen) return null;

  const botClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
  const permissions = process.env.NEXT_PUBLIC_BOT_INVITE_PERMISSIONS || '8'; // 8 = Administrator
  const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&scope=bot%20applications.commands`;

  const handleContinue = () => {
    markAddBotInstructionsSeen();
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 p-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Add Bot to Your Server</h2>
              <p className="text-red-100 mt-1">Follow these steps to get started</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Step 1 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Click "Add Bot to Server"
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                This will open Discord's authorization page where you can select which server to add the bot to.
              </p>
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <Bot className="h-5 w-5 mr-2" />
                Add Bot to Server
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select Your Discord Server
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Choose the server where you want to install the bot. You must have "Manage Server" or "Administrator" permissions.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Grant Required Permissions
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                The bot needs the following permissions to function properly:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Manage Roles - To assign worker roles
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Send Messages - To send notifications and updates
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Read Message History - To track firm activities
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Manage Channels - To create worker channels
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Authorize & You're Done!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Click "Authorize" and the bot will join your server. You'll see it appear in your member list.
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Note:</strong> You can only add the bot to servers where you have administrator permissions. If you don't see your server in the list, contact a server administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-md"
          >
            I've Added the Bot
          </button>
        </div>
      </div>
    </div>
  );
}
