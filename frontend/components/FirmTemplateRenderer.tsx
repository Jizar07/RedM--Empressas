'use client';

import React from 'react';
import { FirmConfig } from '@/types/firms';
import {
  FirmTemplateConfig,
  FAZENDA_TEMPLATE,
  FERROVIA_TEMPLATE,
  BERCARIO_TEMPLATE,
  VETERINARIA_TEMPLATE,
  DEFAULT_GENERIC_TEMPLATE
} from '@/types/firmTemplates';
import TemplateFirmDashboard from './templates/TemplateFirmDashboard';
import BercarioInventory from './BercarioInventory';
import BercarioClients from './BercarioClients';
import BercarioAnalytics from './BercarioAnalytics';
import BercarioPayments from './BercarioPayments';
import EstoqueCDP from './EstoqueCDP';
import FazendaWorkers from './FazendaWorkers';
import FazendaCDPAnalytics from './FazendaCDPAnalytics';
import FerroviaDashboard from './FerroviaDashboard';
import FerroviaPayments from './FerroviaPayments';
import FerroviaWorkers from './FerroviaWorkers';
import VeterinariaWorkers from './VeterinariaWorkers';

interface FirmTemplateRendererProps {
  firm: FirmConfig;
  activeComponent: string; // dashboard, inventory, workers, analytics, payments
}

export default function FirmTemplateRenderer({ firm, activeComponent }: FirmTemplateRendererProps) {
  // Get template configuration
  const getTemplateConfig = (): FirmTemplateConfig => {
    const templateType = firm.template?.type || 'fazenda'; // Default to fazenda for backward compatibility

    let baseTemplate: FirmTemplateConfig;

    switch (templateType) {
      case 'fazenda':
        baseTemplate = FAZENDA_TEMPLATE;
        break;
      case 'ferrovia':
        baseTemplate = FERROVIA_TEMPLATE;
        break;
      case 'bercario':
        baseTemplate = BERCARIO_TEMPLATE;
        break;
      case 'veterinaria':
        baseTemplate = VETERINARIA_TEMPLATE;
        break;
      default:
        baseTemplate = FAZENDA_TEMPLATE; // Fallback to fazenda
    }

    return {
      ...baseTemplate,
      // Override with firm's custom settings if any
      ...(firm.template?.customConfig || {}),
      theme: {
        ...baseTemplate.theme,
        // Override theme with firm's display theme
        primaryColor: firm.display?.theme?.primaryColor || baseTemplate.theme.primaryColor,
        secondaryColor: firm.display?.theme?.secondaryColor || baseTemplate.theme.secondaryColor,
        accentColor: firm.display?.theme?.accentColor || baseTemplate.theme.accentColor,
        backgroundColor: firm.display?.theme?.backgroundColor || baseTemplate.theme.backgroundColor,
        textColor: firm.display?.theme?.textColor || baseTemplate.theme.textColor,
        iconStyle: firm.display?.theme?.iconStyle || baseTemplate.theme.iconStyle
      },
      components: baseTemplate.components.map(comp => ({
        ...comp,
        enabled: firm.template?.enabledComponents?.includes(comp.id) ?? comp.enabled,
        settings: {
          ...comp.settings,
          ...(firm.template?.componentSettings?.[comp.id] || {})
        }
      }))
    };
  };

  const templateConfig = getTemplateConfig();
  const templateType = firm.template?.type || 'fazenda';

  // Special handling for Fazenda
  const isFazendaCabraDaPeste = firm.id === 'fazenda-cabra-da-peste';

  // Check if component is enabled in template
  const isComponentEnabled = (componentId: string): boolean => {
    const component = templateConfig.components.find(c => c.id === componentId);
    return component?.enabled ?? false;
  };

  // Special rendering for Fazenda
  if (isFazendaCabraDaPeste) {
    switch (activeComponent) {
      case 'dashboard':
        return <TemplateFirmDashboard firm={firm} template={templateConfig} />;
      case 'inventory':
        return <EstoqueCDP firm={firm} />;
      case 'workers':
        return <FazendaWorkers firm={firm} />;
      case 'analytics':
        return <FazendaCDPAnalytics firm={firm} />;
      default:
        return <TemplateFirmDashboard firm={firm} template={templateConfig} />;
    }
  }

  // Special rendering for Ferrovia
  const isFerrovia = firm.id === 'ferrovia';
  if (isFerrovia) {
    switch (activeComponent) {
      case 'dashboard':
        return <FerroviaDashboard firm={firm} />;
      case 'workers':
        return <FerroviaWorkers firm={firm} />;
      case 'analytics':
        return <BercarioAnalytics firm={firm} />;
      case 'payments':
        return <FerroviaPayments firm={firm} />;
      default:
        return <FerroviaDashboard firm={firm} />;
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
      return <BercarioInventory firm={firm} />;

    case 'workers':
      if (!isComponentEnabled('workers')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Trabalhadores não habilitado para este template</p>
          </div>
        );
      }
      // Special handling for Veterinaria - use filtered workers view
      if (firm.id === 'veterinaria') {
        return <VeterinariaWorkers firm={firm} />;
      }
      return <FazendaWorkers firm={firm} />;

    case 'analytics':
      if (!isComponentEnabled('analytics')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Analytics não habilitado para este template</p>
          </div>
        );
      }
      return <BercarioAnalytics firm={firm} />;

    case 'payments':
      if (!isComponentEnabled('payments')) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Pagamentos não habilitado para este template</p>
          </div>
        );
      }
      return <BercarioPayments firm={firm} />;

    default:
      return <TemplateFirmDashboard firm={firm} template={templateConfig} />;
  }
}

// Helper function to get available components for a firm
export function getAvailableComponents(firm: FirmConfig): Array<{id: string, name: string, icon: string, enabled: boolean}> {
  const templateType = firm.template?.type || 'fazenda';

  let baseComponents;
  switch (templateType) {
    case 'fazenda':
      baseComponents = FAZENDA_TEMPLATE.components;
      break;
    case 'ferrovia':
      baseComponents = FERROVIA_TEMPLATE.components;
      break;
    case 'bercario':
      baseComponents = BERCARIO_TEMPLATE.components;
      break;
    case 'veterinaria':
      baseComponents = VETERINARIA_TEMPLATE.components;
      break;
    default:
      baseComponents = FAZENDA_TEMPLATE.components;
  }

  let availableComponents = baseComponents.map(comp => ({
    id: comp.id,
    name: comp.name,
    icon: getComponentIcon(comp.id),
    enabled: firm.template?.enabledComponents?.includes(comp.id) ?? comp.enabled
  }));

  // Special handling for Ferrovia - remove inventory component
  if (firm.id === 'ferrovia') {
    availableComponents = availableComponents.filter(comp => comp.id !== 'inventory');
  }

  return availableComponents;
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