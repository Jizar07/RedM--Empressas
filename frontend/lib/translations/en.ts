export const en = {
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    admin: 'Admin',
    servicos: 'Services',
    atlantaServer: 'Atlanta Server',
    channelParser: 'Channel Parser',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    serverPlayers: 'Server Players',
    botStatus: 'Bot Status',
    activeFirms: 'Active Firms',
    quickActions: 'Quick Actions',
    accessibleToYou: 'Accessible to you',
    max: 'Max',
    online: 'Online',
    offline: 'Offline',
    ping: 'ping',
    connecting: 'Connecting...',
  },

  // Firms
  firms: {
    fazenda: 'Farm',
    ferrovia: 'Railway',
    bercario: 'Nursery',
    veterinaria: 'Veterinary',
    armaria: 'Armory',
    title: 'Companies',
    selectCompany: 'Select a company to access the management system',
    loading: 'Loading companies...',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    monitoring: 'Monitoring',
    roles: 'Roles',
    access: 'Access',
    noFirms: 'No companies available',
    noFirmsDescription: 'You don\'t have access to any companies or no companies have been configured yet.',
    manageCompanies: 'Manage multiple companies',
  },

  // Admin
  admin: {
    title: 'Admin Panel',
    registrationSettings: 'Registration Settings',
    registrationSettingsDesc: 'Configure registration forms, roles, and approval settings',
    registrationAnalytics: 'Registration Analytics',
    registrationAnalyticsDesc: 'View registration statistics, manage submissions, and analyze data',
    ordersSettings: 'Orders Settings',
    ordersSettingsDesc: 'Configure orders system, firms, and order management settings',
    channelLogsConfig: 'Channel Logs Config',
    channelLogsConfigDesc: 'Configure automatic channel log forwarding to external systems',
    discordCommands: 'Discord Commands',
    discordCommandsDesc: 'Manage Discord slash commands and bot interactions',
    moderationSettings: 'Moderation Settings',
    moderationSettingsDesc: 'Configure clear command, auto-mod, and auto-reply features',
    paymentSettings: 'Payment Settings',
    paymentSettingsDesc: 'Configure default pricing and payment system settings',
    paymentReceipts: 'Worker Payment Receipts',
    paymentReceiptsDesc: 'View worker payment receipts created by Pay Worker button',
    firmManagement: 'Firm Management',
    firmManagementDesc: 'Configure multiple firms with role-based access and monitoring',
    systemConfiguration: 'System Configuration',
    managementAnalytics: 'Management & Analytics',
    botModeration: 'Bot & Moderation',
  },

  // Services (Serviços)
  servicos: {
    title: 'Services',
    orders: 'Orders',
    ordersDesc: 'Order and request system',
    recipes: 'Recipes',
    recipesDesc: 'Recipe calculator',
    priceList: 'Price List',
    priceListDesc: 'Item price management',
    ordersRecipes: 'Orders, recipes and prices',
  },

  // Quick Actions
  quickActions: {
    serverStatus: 'Server Status',
    serverStatusDesc: 'Check server status',
    services: 'Services',
    servicesDesc: 'Orders, recipes and prices',
    registration: 'Registration',
    registrationDesc: 'Manage registration',
    channelParser: 'Channel Parser',
    channelParserDesc: 'Parse Discord channels',
    analytics: 'Analytics',
    analyticsDesc: 'View statistics',
    companies: 'Companies',
    companiesDesc: 'Manage multiple companies',
  },

  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    access: 'Access',
    configure: 'Configure',
    view: 'View',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    create: 'Create',
    update: 'Update',
    remove: 'Remove',
    add: 'Add',
    submit: 'Submit',
    reset: 'Reset',
    refresh: 'Refresh',
    download: 'Download',
    upload: 'Upload',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },

  // Auth
  auth: {
    login: 'Login',
    logout: 'Logout',
    loginWithDiscord: 'Login with Discord',
    welcome: 'Welcome',
    notAuthorized: 'Not Authorized',
    sessionExpired: 'Session Expired',
  },

  // Server
  server: {
    selectServer: 'Select Server',
    noServers: 'No servers available',
    switchServer: 'Switch Server',
  },

  // Theme
  theme: {
    light: 'Light Mode',
    dark: 'Dark Mode',
    toggle: 'Toggle Theme',
  },

  // Language
  language: {
    english: 'English',
    portuguese: 'Portuguese',
    switchTo: 'Switch to',
  },

  // Footer
  footer: {
    version: 'version',
    companyManager: 'Company Manager for RedM',
    api: 'API',
    bot: 'Bot',
    healthy: 'healthy',
  },
};

export type TranslationKeys = typeof en;
