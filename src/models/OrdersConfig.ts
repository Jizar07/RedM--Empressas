import mongoose, { Document, Schema } from 'mongoose';

export interface IFirm {
  id: string;
  name: string;
  description?: string;
  discordRoleId: string;
  discordRoleName: string;
  categoryId?: string;
  categoryName?: string;
  items: {
    id: string;
    name: string;
    description?: string;
    maxQuantity?: number;
    active: boolean;
  }[];
  notificationChannelId?: string;
  active: boolean;
  order: number;
}

export interface IOrdersConfig extends Document {
  configId: string;
  firms: IFirm[];
  settings: {
    orderChannelId?: string;
    notificationsEnabled: boolean;
    dmNotificationsEnabled: boolean;
    requireApproval: boolean;
    maxActiveOrdersPerUser: number;
    orderCooldownMinutes: number;
    embedColor: string;
  };
  command: {
    name: string;
    description: string;
    permissions: string;
  };
  messages: {
    orderPlaced: string;
    orderAccepted: string;
    orderRejected: string;
    orderCompleted: string;
    orderCancelled: string;
    dmNotificationTemplate: string;
    channelNotificationTemplate: string;
    noSuppliersAvailable: string;
    orderLimitReached: string;
    cooldownActive: string;
  };
  formDisplay: {
    title: string;
    description: string;
    embedColor: string;
    button: {
      text: string;
      emoji: string;
      style: string;
    };
  };
  steps: {
    selectFirm: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    selectSupplier: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    orderDetails: {
      modalTitle: string;
      itemLabel: string;
      itemPlaceholder: string;
      quantityLabel: string;
      quantityPlaceholder: string;
      notesLabel: string;
      notesPlaceholder: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrdersConfigSchema = new Schema({
  configId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: 'orders_config' 
  },
  firms: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    discordRoleId: { type: String, required: true },
    discordRoleName: { type: String, required: true },
    categoryId: { type: String },
    categoryName: { type: String },
    items: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String },
      maxQuantity: { type: Number },
      active: { type: Boolean, default: true }
    }],
    notificationChannelId: { type: String },
    active: { type: Boolean, default: true },
    order: { type: Number, required: true }
  }],
  settings: {
    orderChannelId: { type: String },
    notificationsEnabled: { type: Boolean, default: true },
    dmNotificationsEnabled: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    maxActiveOrdersPerUser: { type: Number, default: 5 },
    orderCooldownMinutes: { type: Number, default: 0 },
    embedColor: { type: String, default: '#00FF00' }
  },
  command: {
    name: { type: String, default: 'encomenda' },
    description: { type: String, default: 'Fazer uma encomenda para outro jogador' },
    permissions: { type: String, default: 'SendMessages' }
  },
  messages: {
    orderPlaced: { 
      type: String, 
      default: '✅ **Encomenda Realizada!**\n\n{customerName} encomendou {quantity}x {item} de {supplierName}' 
    },
    orderAccepted: { 
      type: String, 
      default: '✅ Sua encomenda foi aceita por {supplierName}!' 
    },
    orderRejected: { 
      type: String, 
      default: '❌ Sua encomenda foi rejeitada por {supplierName}.\nMotivo: {reason}' 
    },
    orderCompleted: { 
      type: String, 
      default: '🎉 Sua encomenda foi concluída por {supplierName}!' 
    },
    orderCancelled: { 
      type: String, 
      default: '❌ Encomenda cancelada.' 
    },
    dmNotificationTemplate: { 
      type: String, 
      default: '📦 **Nova Encomenda!**\n\n**Cliente:** {customerName}\n**Item:** {quantity}x {item}\n**Notas:** {notes}\n\nUse os botões abaixo para aceitar ou rejeitar.' 
    },
    channelNotificationTemplate: { 
      type: String, 
      default: '📦 **Nova Encomenda**\n\n**De:** {customerName}\n**Para:** {supplierName}\n**Firma:** {firmName}\n**Item:** {quantity}x {item}' 
    },
    noSuppliersAvailable: { 
      type: String, 
      default: '❌ Não há fornecedores disponíveis para esta firma no momento.' 
    },
    orderLimitReached: { 
      type: String, 
      default: '❌ Você atingiu o limite máximo de {limit} encomendas ativas.' 
    },
    cooldownActive: { 
      type: String, 
      default: '⏱️ Você precisa aguardar {minutes} minutos antes de fazer outra encomenda.' 
    }
  },
  formDisplay: {
    title: { 
      type: String, 
      default: '📦 Sistema de Encomendas' 
    },
    description: { 
      type: String, 
      default: '**Bem-vindo ao Sistema de Encomendas!**\n\nAqui você pode fazer encomendas de itens para outros jogadores.\n\n**Como funciona:**\n• Escolha a firma/categoria\n• Selecione o fornecedor\n• Especifique o item e quantidade\n• Aguarde a confirmação\n\nClique no botão abaixo para começar.' 
    },
    embedColor: { 
      type: String, 
      default: '#00FF00' 
    },
    button: {
      text: { type: String, default: 'Fazer Encomenda' },
      emoji: { type: String, default: '📦' },
      style: { type: String, default: 'Primary' }
    }
  },
  steps: {
    selectFirm: {
      embedTitle: { 
        type: String, 
        default: 'Passo 1/3 - Selecione a Firma' 
      },
      embedDescription: { 
        type: String, 
        default: 'Escolha a firma/categoria do item que deseja encomendar:' 
      },
      dropdownPlaceholder: { 
        type: String, 
        default: 'Selecione uma firma...' 
      }
    },
    selectSupplier: {
      embedTitle: { 
        type: String, 
        default: 'Passo 2/3 - Selecione o Fornecedor' 
      },
      embedDescription: { 
        type: String, 
        default: 'Escolha quem irá fornecer o item:' 
      },
      dropdownPlaceholder: { 
        type: String, 
        default: 'Selecione um fornecedor...' 
      }
    },
    orderDetails: {
      modalTitle: { 
        type: String, 
        default: 'Passo 3/3 - Detalhes da Encomenda' 
      },
      itemLabel: { 
        type: String, 
        default: 'Nome do Item' 
      },
      itemPlaceholder: { 
        type: String, 
        default: 'Ex: Madeira, Ferro, Comida...' 
      },
      quantityLabel: { 
        type: String, 
        default: 'Quantidade' 
      },
      quantityPlaceholder: { 
        type: String, 
        default: 'Ex: 10, 50, 100...' 
      },
      notesLabel: { 
        type: String, 
        default: 'Observações (Opcional)' 
      },
      notesPlaceholder: { 
        type: String, 
        default: 'Informações adicionais sobre a encomenda...' 
      }
    }
  }
}, { timestamps: true });

export const OrdersConfig = mongoose.model<IOrdersConfig>('OrdersConfig', OrdersConfigSchema);