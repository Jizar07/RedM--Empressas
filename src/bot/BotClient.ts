import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import config from '../config/config';
import RegistrationService from '../services/RegistrationService';
import OrdersService from '../services/OrdersService';
import MessageManagerService from '../services/MessageManagerService';
import BotStatusService from '../services/BotStatusService';
import { MultiChannelForwarder } from '../services/MultiChannelForwarder';
import { WeeklyRankingService } from '../services/WeeklyRankingService';
import { createDynamicRegistrationCommand } from './dynamicCommandRegistration';

export interface Command {
  name: string;
  description: string;
  execute: (interaction: any) => Promise<void>;
  cooldown?: number;
}

export class BotClient extends Client {
  public commands: Collection<string, Command>;
  public cooldowns: Collection<string, Collection<string, number>>;
  public messageManager: MessageManagerService;
  public statusService: typeof BotStatusService;
  public multiChannelForwarder!: MultiChannelForwarder;
  public weeklyRankingService: WeeklyRankingService;
  
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
      ],
    });
    
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.messageManager = new MessageManagerService(this);
    this.statusService = BotStatusService;
    this.multiChannelForwarder = MultiChannelForwarder.getInstance();
    this.weeklyRankingService = WeeklyRankingService.getInstance();
  }
  
  public async init(): Promise<void> {
    console.log('🤖 Initializing bot...');
    
    // Load events
    await this.loadEvents();
    
    // Load commands
    await this.loadCommands();
    
    // Register slash commands
    await this.registerCommands();

    // Initialize RegistrationService with bot client
    RegistrationService.setClient(this);
    
    // Initialize OrdersService with bot client
    OrdersService.setClient(this);

    // Initialize WeeklyRankingService with bot client
    this.weeklyRankingService.initialize(this);

    // Login to Discord
    await this.login(config.discord.token);
  }
  
  private async loadEvents(): Promise<void> {
    const eventsPath = path.join(__dirname, 'events');
    
    try {
      const eventFiles = readdirSync(eventsPath).filter(file => 
        (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts')
      );
      
      for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = await import(filePath);
        
        if (event.default?.name && event.default?.execute) {
          if (event.default.once) {
            this.once(event.default.name, (...args) => event.default.execute(...args, this));
          } else {
            this.on(event.default.name, (...args) => event.default.execute(...args, this));
          }
          console.log(`📌 Loaded event: ${event.default.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ No events found or error loading events:', error);
    }
  }
  
  private async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, 'commands');
    
    try {
      const commandFolders = readdirSync(commandsPath);
      
      for (const folder of commandFolders) {
        const commandFiles = readdirSync(path.join(commandsPath, folder)).filter(file =>
          (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts')
        );
        
        for (const file of commandFiles) {
          const filePath = path.join(commandsPath, folder, file);
          const command = await import(filePath);
          
          // Handle dynamic registration command specially
          if ((file === 'register-setup.js' || file === 'register-setup.ts') && command.default?.execute) {
            try {
              const dynamicData = await createDynamicRegistrationCommand();
              command.default.data = dynamicData;
              // Ensure the command has the correct name for cooldowns
              command.default.name = dynamicData.name;
              this.commands.set(dynamicData.name, command.default);
              console.log(`📌 Loaded command: ${dynamicData.name}`);
            } catch (error) {
              console.error('❌ Failed to load dynamic registration command:', error);
            }
          } else if (command.default?.data && command.default?.execute) {
            // Ensure the command has the correct name for cooldowns
            command.default.name = command.default.data.name;
            this.commands.set(command.default.data.name, command.default);
            console.log(`📌 Loaded command: ${command.default.data.name}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ No commands found or error loading commands:', error);
    }
  }
  
  private async registerCommands(): Promise<void> {
    const commands = [];
    
    for (const command of this.commands.values()) {
      if ((command as any).data) {
        commands.push((command as any).data.toJSON());
      }
    }
    
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    try {
      console.log(`🔄 Registering ${commands.length} slash commands...`);
      
      if (config.environment.isDevelopment && config.discord.guildId) {
        // Register commands for development guild
        await rest.put(
          Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
          { body: commands }
        );
        console.log(`✅ Registered commands for guild: ${config.discord.guildId}`);
      } else {
        // Register global commands
        await rest.put(
          Routes.applicationCommands(config.discord.clientId),
          { body: commands }
        );
        console.log('✅ Registered global commands');
      }
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }
  
}