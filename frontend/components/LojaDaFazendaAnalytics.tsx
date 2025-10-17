'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface LojaDaFazendaAnalyticsProps {
  firm: FirmConfig;
}

export default function LojaDaFazendaAnalytics({ firm }: LojaDaFazendaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
