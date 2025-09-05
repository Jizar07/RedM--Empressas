'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import { FirmTemplateConfig, DEFAULT_FAZENDA_BW_TEMPLATE, DEFAULT_GENERIC_TEMPLATE } from '@/types/firmTemplates';
import TemplateFirmDashboard from './templates/TemplateFirmDashboard';
import FazendaBW from './FazendaBW'; // Legacy component
import EstoqueBW from './EstoqueBW'; // Legacy component
import TrabalhadoresBW from './TrabalhadoresBW'; // Legacy component

interface FirmTemplateRendererProps {
  firm: FirmConfig;
  activeComponent: string; // dashboard, inventory, workers, analytics, payments
}

export default function FirmTemplateRenderer({ firm, activeComponent }: FirmTemplateRendererProps) {
  // Get template configuration
  const getTemplateConfig = (): FirmTemplateConfig => {
    const templateType = firm.template?.type || 'fazenda-bw'; // Default to fazenda-bw for backward compatibility
    
    switch (templateType) {
      case 'fazenda-bw':
        return {
          ...DEFAULT_FAZENDA_BW_TEMPLATE,
          // Override with firm's custom settings if any
          ...(firm.template?.customConfig || {}),
          theme: {
            ...DEFAULT_FAZENDA_BW_TEMPLATE.theme,
            // Override theme with firm's display theme
            primaryColor: firm.display?.theme?.primaryColor || DEFAULT_FAZENDA_BW_TEMPLATE.theme.primaryColor,
            secondaryColor: firm.display?.theme?.secondaryColor || DEFAULT_FAZENDA_BW_TEMPLATE.theme.secondaryColor,
            accentColor: firm.display?.theme?.accentColor,
            backgroundColor: firm.display?.theme?.backgroundColor,
            textColor: firm.display?.theme?.textColor,
            iconStyle: firm.display?.theme?.iconStyle
          },
          components: DEFAULT_FAZENDA_BW_TEMPLATE.components.map(comp => ({
            ...comp,
            enabled: firm.template?.enabledComponents?.includes(comp.id) ?? comp.enabled,
            settings: {
              ...comp.settings,
              ...(firm.template?.componentSettings?.[comp.id] || {})
            }
          }))
        };
        
      case 'generic':
        return {
          ...DEFAULT_GENERIC_TEMPLATE,
          ...(firm.template?.customConfig || {}),
          theme: {
            ...DEFAULT_GENERIC_TEMPLATE.theme,
            primaryColor: firm.display?.theme?.primaryColor || DEFAULT_GENERIC_TEMPLATE.theme.primaryColor,
            secondaryColor: firm.display?.theme?.secondaryColor || DEFAULT_GENERIC_TEMPLATE.theme.secondaryColor,
            accentColor: firm.display?.theme?.accentColor,
            backgroundColor: firm.display?.theme?.backgroundColor,
            textColor: firm.display?.theme?.textColor,
            iconStyle: firm.display?.theme?.iconStyle
          }
        };
        
      case 'custom':
        // For custom templates, use the custom config or fallback to generic
        return {
          ...DEFAULT_GENERIC_TEMPLATE,
          ...(firm.template?.customConfig || {}),
          theme: {
            ...DEFAULT_GENERIC_TEMPLATE.theme,
            primaryColor: firm.display?.theme?.primaryColor || DEFAULT_GENERIC_TEMPLATE.theme.primaryColor,
            secondaryColor: firm.display?.theme?.secondaryColor || DEFAULT_GENERIC_TEMPLATE.theme.secondaryColor,
            accentColor: firm.display?.theme?.accentColor,
            backgroundColor: firm.display?.theme?.backgroundColor,
            textColor: firm.display?.theme?.textColor,
            iconStyle: firm.display?.theme?.iconStyle
          }
        };
        
      default:
        return DEFAULT_FAZENDA_BW_TEMPLATE;
    }
  };

  const templateConfig = getTemplateConfig();
  const templateType = firm.template?.type || 'fazenda-bw';
  
  // For backward compatibility, if firm doesn't have template config but is the original Fazenda BW,
  // render the legacy components
  const isLegacyFazendaBW = !firm.template && firm.id === 'fazenda-bw';

  // Check if component is enabled in template
  const isComponentEnabled = (componentId: string): boolean => {
    const component = templateConfig.components.find(c => c.id === componentId);
    return component?.enabled ?? false;
  };

  // Legacy rendering for existing Fazenda BW
  if (isLegacyFazendaBW) {
    switch (activeComponent) {
      case 'dashboard':
        return <FazendaBW />;
      case 'inventory':
        return <EstoqueBW />;
      case 'workers':
        return <TrabalhadoresBW />;
      default:
        return <FazendaBW />;
    }
  }

  // Template-based rendering
  switch (activeComponent) {
    case 'dashboard':
      if (!isComponentEnabled('dashboard')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Dashboard não habilitado para este template</p>
          </div>
        );
      }
      return <TemplateFirmDashboard firm={firm} template={templateConfig} />;

    case 'inventory':
      if (!isComponentEnabled('inventory')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Inventário não habilitado para este template</p>
          </div>
        );
      }
      // For now, use legacy component but filtered by firm
      return <EstoqueBW />;

    case 'workers':
      if (!isComponentEnabled('workers')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Trabalhadores não habilitado para este template</p>
          </div>
        );
      }
      // For now, use legacy component but filtered by firm
      return <TrabalhadoresBW />;

    case 'analytics':
      if (!isComponentEnabled('analytics')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Analytics não habilitado para este template</p>
          </div>
        );
      }
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Analytics em desenvolvimento</p>
        </div>
      );

    case 'payments':
      if (!isComponentEnabled('payments')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Pagamentos não habilitado para este template</p>
          </div>
        );
      }
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Pagamentos em desenvolvimento</p>
        </div>
      );

    default:
      return <TemplateFirmDashboard firm={firm} template={templateConfig} />;
  }
}

// Helper function to get available components for a firm
export function getAvailableComponents(firm: FirmConfig): Array<{id: string, name: string, icon: string, enabled: boolean}> {
  const templateType = firm.template?.type || 'fazenda-bw';
  
  let baseComponents;
  switch (templateType) {
    case 'fazenda-bw':
      baseComponents = DEFAULT_FAZENDA_BW_TEMPLATE.components;
      break;
    case 'generic':
      baseComponents = DEFAULT_GENERIC_TEMPLATE.components;
      break;
    case 'custom':
      baseComponents = firm.template?.customConfig?.components || DEFAULT_GENERIC_TEMPLATE.components;
      break;
    default:
      baseComponents = DEFAULT_FAZENDA_BW_TEMPLATE.components;
  }

  return baseComponents.map(comp => ({
    id: comp.id,
    name: comp.name,
    icon: getComponentIcon(comp.id),
    enabled: firm.template?.enabledComponents?.includes(comp.id) ?? comp.enabled
  }));
}

function getComponentIcon(componentId: string): string {
  const iconMap: Record<string, string> = {
    dashboard: 'BarChart3',
    inventory: 'Package',
    workers: 'Users',
    analytics: 'TrendingUp',
    payments: 'DollarSign'
  };
  return iconMap[componentId] || 'Circle';
}