'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface VeterinariaAnalyticsProps {
  firm: FirmConfig;
}

export default function VeterinariaAnalytics({ firm }: VeterinariaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
