'use client';

import { Server, Users, Bot, Shield, Building, ArrowRight } from 'lucide-react';

interface SplashPageProps {
  botStats?: {
    ready: boolean;
    ping: number;
    servers: number;
    users: number;
  } | null;
}

export default function SplashPage({ botStats }: SplashPageProps) {
  const handleLogin = () => {
    // Use NextAuth sign in instead of direct Discord OAuth  
    window.location.href = '/api/auth/signin/discord';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Stoffel's RedM Empresas</h1>
                <p className="text-sm text-gray-300">Gerenciador de Empresas</p>
              </div>
            </div>

            {/* Bot Status */}
            {botStats && (
              <div className="flex items-center space-x-2 text-sm text-white">
                <div className={`w-2 h-2 rounded-full ${botStats.ready ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>Bot {botStats.ready ? 'Online' : 'Offline'}</span>
                <span className="text-gray-400">•</span>
                <span>{botStats.ping}ms</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Gerenciador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">Empresas</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Sistema completo de gerenciamento para empresas RedM com integração Discord
            </p>
            <button
              onClick={handleLogin}
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Entrar com Discord
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Gestão de Empresas</h3>
              <p className="text-gray-300">
                Configure e gerencie múltiplas empresas com templates personalizados e controle completo
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Integração Discord</h3>
              <p className="text-gray-300">
                Sincronização automática com Discord para controle de acesso e notificações
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Controle de Acesso</h3>
              <p className="text-gray-300">
                Sistema robusto de permissões baseado em cargos Discord para máxima segurança
              </p>
            </div>
          </div>

          {/* Bot Stats */}
          {botStats && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h3 className="text-2xl font-semibold text-white mb-6">Status do Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${botStats.ready ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <p className="text-2xl font-bold text-white">{botStats.ready ? 'Online' : 'Offline'}</p>
                  <p className="text-sm text-gray-300">Status do Bot</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{botStats.servers || 0}</p>
                  <p className="text-sm text-gray-300">Servidores Conectados</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{botStats.ping}ms</p>
                  <p className="text-sm text-gray-300">Latência</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Stoffel's RedM Empresas. Sistema de gerenciamento empresarial.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}