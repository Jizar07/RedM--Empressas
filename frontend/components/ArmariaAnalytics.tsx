'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface ArmariaAnalyticsProps {
  firm: FirmConfig;
}

export default function ArmariaAnalytics({ firm }: ArmariaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
