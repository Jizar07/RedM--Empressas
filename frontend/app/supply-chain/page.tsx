'use client';

import React from 'react';
import SupplyChainAnalytics from '@/components/SupplyChainAnalytics';

export default function SupplyChainPage() {
  // Channel IDs for Fazenda Cabra da Peste and Ferrovia
  const fazendaChannelId = "1412325130926948362"; // Fazenda Cabra da Peste
  const ferroviaChannelId = "1414735729082499072"; // Ferrovia

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Supply Chain Analytics</h1>
          <p className="mt-2 text-gray-600">
            Track box removals from Fazenda inventory and worker payment balances (250 boxes removed = $1000 payment due)
          </p>
        </div>

        <SupplyChainAnalytics 
          fazendaChannelId={fazendaChannelId}
          ferroviaChannelId={ferroviaChannelId}
        />
      </div>
    </div>
  );
}