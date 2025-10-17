'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface FerroviaAnalyticsProps {
  firm: FirmConfig;
}

export default function FerroviaAnalytics({ firm }: FerroviaAnalyticsProps) {
  return <ComprehensiveAnalytics firmId={firm.id} firmName={firm.name} />;
}
