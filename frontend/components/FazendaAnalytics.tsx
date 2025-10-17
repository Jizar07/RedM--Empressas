'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface FazendaAnalyticsProps {
  firm: FirmConfig;
}

export default function FazendaAnalytics({ firm }: FazendaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
