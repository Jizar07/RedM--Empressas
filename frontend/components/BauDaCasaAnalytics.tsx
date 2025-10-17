'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface BauDaCasaAnalyticsProps {
  firm: FirmConfig;
}

export default function BauDaCasaAnalytics({ firm }: BauDaCasaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
