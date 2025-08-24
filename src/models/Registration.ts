import mongoose, { Document, Schema } from 'mongoose';

// Registration Form Configuration Schema
export interface IRegistrationConfig extends Document {
  formId: string;
  functions: {
    id: string;
    displayName: string;
    discordRoleId: string;
    discordRoleName: string;
    description?: string;
    order: number;
    active: boolean;
    categoryId?: string;
    categoryName?: string;
    channelEmojiPrefix?: string;
    channelPermissions?: {
      channelTopic?: string;
      allowedRoles?: string[]; // Array of Discord role IDs that can access the channel
    };
  }[];
  settings: {
    oneTimeOnly: boolean;
    requiresVerification: boolean;
    welcomeMessage: string;
    channelId?: string;
    embedColor?: string;
    serverIP?: string;
    serverPort?: string;
  };
  // Command Configuration
  command: {
    name: string;
    description: string;
    permissions: string;
  };
  // Form Display Configuration
  formDisplay: {
    title: string;
    description: string;
    footerText: string;
    embedColor: string;
    button: {
      text: string;
      emoji: string;
      style: string;
    };
  };
  // Step Configuration
  steps: {
    step1: {
      modalTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      pomboLabel: string;
      pomboPlaceholder: string;
    };
    step2: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    step3: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
  };
  // Post-Registration Configuration
  postRegistration: {
    nicknameFormat: string;
    sendDM: boolean;
    dmTitle: string;
    dmMessage: string;
    assignRoles: boolean;
    welcomeChannelMessage: boolean;
    createChannel: boolean;
    channelNameFormat: string;
  };
  // Message Templates
  messages: {
    alreadyRegistered: string;
    sessionExpired: string;
    registrationSuccess: string;
    errorGeneric: string;
    permissionDenied: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationConfigSchema = new Schema({
  formId: { type: String, required: true, unique: true, default: 'registration_form' },
  functions: [{
    id: { type: String, required: true },
    displayName: { type: String, required: true },
    discordRoleId: { type: String, required: true },
    discordRoleName: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    active: { type: Boolean, default: true },
    categoryId: { type: String },
    categoryName: { type: String },
    channelEmojiPrefix: { type: String },
    channelPermissions: {
      channelTopic: { type: String },
      allowedRoles: [{ type: String }] // Array of Discord role IDs
    }
  }],
  settings: {
    oneTimeOnly: { type: Boolean, default: true },
    requiresVerification: { type: Boolean, default: false },
    welcomeMessage: { type: String, default: 'Welcome to Atlanta RedM!' },
    channelId: { type: String },
    embedColor: { type: String, default: '#FF0000' },
    serverIP: { type: String },
    serverPort: { type: String }
  },
  // Command Configuration
  command: {
    name: { type: String, default: 'register-setup' },
    description: { type: String, default: 'Deploy the registration form to a channel' },
    permissions: { type: String, default: 'Administrator' }
  },
  // Form Display Configuration
  formDisplay: {
    title: { type: String, default: '🎮 Registro Familia BlackGolden' },
    description: { type: String, default: '**Bem-vindo ao Servidor Familia BlackGolden!**\n\nPara ter acesso ao servidor, você precisa completar o processo de registro.\n\n**Informações Necessárias:**\n• Seu nome completo no condado\n• Seu Pombo\n• Sua função/trabalho no servidor\n• Quem te convidou para a Familia\n\nClique no botão **Registrar** abaixo para começar.' },
    footerText: { type: String, default: 'Familia BlackGolden • Sistema de Registro' },
    embedColor: { type: String, default: '#FF0000' },
    button: {
      text: { type: String, default: 'Registrar' },
      emoji: { type: String, default: '📝' },
      style: { type: String, default: 'Primary' }
    }
  },
  // Step Configuration
  steps: {
    step1: {
      modalTitle: { type: String, default: 'Familia BlackGolden - Passo 1/3' },
      nameLabel: { type: String, default: 'Nome completo no Condado' },
      namePlaceholder: { type: String, default: 'Digite seu nome completo no condado' },
      pomboLabel: { type: String, default: 'Pombo' },
      pomboPlaceholder: { type: String, default: 'Digite seu pombo' }
    },
    step2: {
      embedTitle: { type: String, default: 'Passo 2/3 - Sua função na Familia' },
      embedDescription: { type: String, default: 'Selecione sua função/trabalho na Familia:' },
      dropdownPlaceholder: { type: String, default: 'Selecione sua função/trabalho na Familia' }
    },
    step3: {
      embedTitle: { type: String, default: 'Passo 3/3 - Quem te convidou?' },
      embedDescription: { type: String, default: 'Selecione quem te convidou para a Familia BlackGolden:\n\n✨ **Digite para buscar** - Você pode digitar o nome da pessoa para encontrá-la rapidamente!' },
      dropdownPlaceholder: { type: String, default: 'Selecione quem te convidou para a Familia' }
    }
  },
  // Post-Registration Configuration
  postRegistration: {
    nicknameFormat: { type: String, default: '{ingameName} | {pombo}' },
    sendDM: { type: Boolean, default: true },
    dmTitle: { type: String, default: 'Bem-vindo à Familia BlackGolden!' },
    dmMessage: { type: String, default: 'Olá {ingameName},\n\nSeu registro como **{functionName}** foi aprovado!\n\nAgora você tem acesso aos canais específicos da sua função.\n\n**Conexão com o Servidor:**\nIP: {serverIP}:{serverPort}\nComando: `connect {serverIP}:{serverPort}`\n\nAproveite seu tempo na Familia BlackGolden!' },
    assignRoles: { type: Boolean, default: true },
    welcomeChannelMessage: { type: Boolean, default: false },
    createChannel: { type: Boolean, default: false },
    channelNameFormat: { type: String, default: '{ingameName}' }
  },
  // Message Templates
  messages: {
    alreadyRegistered: { type: String, default: '❌ Você já está registrado!' },
    sessionExpired: { type: String, default: '❌ Registration session expired. Please start again.' },
    registrationSuccess: { type: String, default: '✅ Registro Realizado com Sucesso!' },
    errorGeneric: { type: String, default: '❌ An error occurred. Please try again.' },
    permissionDenied: { type: String, default: '❌ This is not your registration form.' }
  }
}, { timestamps: true });

// User Registration Schema
export interface IUserRegistration extends Document {
  userId: string; // Discord user ID
  username: string; // Discord username
  ingameName: string;
  mailId: string;
  functionId: string;
  functionName: string;
  invitedBy: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  deniedReason?: string;
  registeredAt: Date;
  metadata?: {
    discordAvatar?: string;
    discordDiscriminator?: string;
    assignedRoles?: string[];
  };
}

const UserRegistrationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  ingameName: { type: String, required: true },
  mailId: { type: String, required: true },
  functionId: { type: String, required: true },
  functionName: { type: String, required: true },
  invitedBy: { type: String, required: true },
  approved: { type: Boolean, default: true },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  deniedReason: { type: String },
  registeredAt: { type: Date, default: Date.now },
  metadata: {
    discordAvatar: { type: String },
    discordDiscriminator: { type: String },
    assignedRoles: [{ type: String }]
  }
});

export const RegistrationConfig = mongoose.model<IRegistrationConfig>('RegistrationConfig', RegistrationConfigSchema);
export const UserRegistration = mongoose.model<IUserRegistration>('UserRegistration', UserRegistrationSchema);