import { Client, ActivityType } from 'discord.js';

class BotStatusService {
  private client: Client | null = null;
  private idleStatus = 'Vigiando o servidor';
  private currentStatus: string | null = null;
  private statusTimeout: NodeJS.Timeout | null = null;

  setClient(client: Client) {
    this.client = client;
    this.setIdleStatus();
  }

  // Set the bot to idle status
  private setIdleStatus() {
    if (!this.client) return;
    
    this.client.user?.setActivity(this.idleStatus, { 
      type: ActivityType.Custom 
    });
    this.currentStatus = this.idleStatus;
    console.log(`🤖 Bot status: ${this.idleStatus}`);
  }

  // Temporarily change status for an action, then return to idle
  public setActionStatus(action: string, duration: number = 3000) {
    if (!this.client) return;

    // Clear any existing timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }

    // Set the action status
    this.client.user?.setActivity(action, { 
      type: ActivityType.Custom 
    });
    this.currentStatus = action;
    console.log(`🔄 Bot status: ${action}`);

    // Return to idle after duration
    this.statusTimeout = setTimeout(() => {
      this.setIdleStatus();
    }, duration);
  }

  // Predefined action statuses
  public sendingData() {
    this.setActionStatus('Mandando dados', 2000);
  }

  public creatingRegistration() {
    this.setActionStatus('Fazendo registro', 4000);
  }

  public creatingChannel() {
    this.setActionStatus('Criando sala', 3000);
  }

  public assigningRole() {
    this.setActionStatus('Atribuindo cargo', 2000);
  }

  public processingMessages() {
    this.setActionStatus('Processando mensagens', 2500);
  }

  public managingChannel() {
    this.setActionStatus('Gerenciando canal', 2000);
  }

  public connectingToServer() {
    this.setActionStatus('Conectando ao servidor', 3000);
  }

  public fetchingData() {
    this.setActionStatus('Buscando dados', 2000);
  }

  public syncingData() {
    this.setActionStatus('Sincronizando dados', 3000);
  }

  public parsingChannel() {
    this.setActionStatus('Analisando canal', 2500);
  }

  // Manual status override (stays until changed)
  public setCustomStatus(status: string, type?: ActivityType) {
    if (!this.client) return;

    // Clear any existing timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    if (type) {
      this.client.user?.setActivity(status, { type });
    } else {
      this.client.user?.setActivity(status);
    }
    this.currentStatus = status;
    console.log(`🎯 Bot status (manual): ${status}`);
  }

  // Force return to idle
  public forceIdle() {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
    this.setIdleStatus();
  }

  // Get current status
  public getCurrentStatus(): string | null {
    return this.currentStatus;
  }
}

export default new BotStatusService();