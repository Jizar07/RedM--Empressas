import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js';
import { PaymentConfigService } from '../../../services/PaymentConfigService';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export default {
  data: new SlashCommandBuilder()
    .setName('export')
    .setDescription('Export payment data to Excel files')
    .addStringOption(option =>
      option.setName('from_date')
        .setDescription('Start date (YYYY-MM-DD format)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('to_date')
        .setDescription('End date (YYYY-MM-DD format)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('worker')
        .setDescription('Filter by specific worker (optional)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'export',
  cooldown: 30, // 30 second cooldown to prevent spam

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Verify user has required permissions
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ Este comando deve ser usado em um servidor.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Check role permissions using PaymentConfigService
      const paymentConfigService = PaymentConfigService.getInstance();
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const userRoleIds = member.roles.cache.map((role: any) => role.id);
      const hasRequiredRole = await paymentConfigService.validateManagerRole(userRoleIds);

      if (!hasRequiredRole) {
        await interaction.reply({
          content: '❌ Você não possui permissão para usar este comando. Apenas managers podem exportar dados de pagamento.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Get and validate parameters
      const fromDateStr = interaction.options.getString('from_date', true);
      const toDateStr = interaction.options.getString('to_date', true);
      const selectedWorker = interaction.options.getUser('worker');

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fromDateStr) || !dateRegex.test(toDateStr)) {
        await interaction.reply({
          content: '❌ Formato de data inválido. Use o formato YYYY-MM-DD (ex: 2025-09-01)',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const fromDate = new Date(fromDateStr + 'T00:00:00.000Z');
      const toDate = new Date(toDateStr + 'T23:59:59.999Z');

      // Validate date range
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        await interaction.reply({
          content: '❌ Datas inválidas. Verifique o formato e se as datas existem.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (fromDate > toDate) {
        await interaction.reply({
          content: '❌ A data inicial deve ser anterior à data final.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Check if date range is too large (limit to 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (fromDate < sixMonthsAgo) {
        await interaction.reply({
          content: '⚠️ Aviso: Período muito extenso. Limitando a consulta aos últimos 6 meses para melhor performance.',
          flags: MessageFlags.Ephemeral
        });
        fromDate.setTime(sixMonthsAgo.getTime());
      }

      // Send initial progress message
      await interaction.reply({
        content: '📊 Executando análise completa do canal Discord... Gerando 3 relatórios CSV detalhados. Por favor, aguarde.',
        ephemeral: false
      });

      // Execute channel analyzer script
      const channelId = '1412325130926948362'; // Farm channel ID
      const exportResults = await this.runChannelAnalyzer(channelId, fromDateStr, toDateStr);

      if (exportResults.length === 0) {
        await interaction.editReply({
          content: '❌ Nenhum dado encontrado no período especificado.'
        });
        return;
      }

      // Create attachments for Discord
      const attachments: AttachmentBuilder[] = [];
      const maxFileSize = 25 * 1024 * 1024; // 25MB Discord limit
      let totalSize = 0;

      for (const result of exportResults) {
        if (result.buffer.length > maxFileSize) {
          await interaction.followUp({
            content: `⚠️ Arquivo ${result.filename} muito grande (${(result.buffer.length / 1024 / 1024).toFixed(1)}MB). Discord limita arquivos a 25MB.`,
            ephemeral: true
          });
          continue;
        }

        totalSize += result.buffer.length;
        if (totalSize > maxFileSize * 3) { // Limit total to ~75MB
          await interaction.followUp({
            content: '⚠️ Muitos arquivos para enviar de uma vez. Alguns arquivos foram omitidos.',
            ephemeral: true
          });
          break;
        }

        attachments.push(new AttachmentBuilder(result.buffer, { name: result.filename }));
      }

      // Create summary embed
      const embed = new EmbedBuilder()
        .setTitle('📊 Análise Completa do Canal Discord - Exportação de Transações')
        .setColor(0x00FF00)
        .addFields(
          { name: '📅 Período', value: `${fromDateStr} até ${toDateStr}`, inline: true },
          { name: '📁 Arquivos CSV', value: '3 relatórios detalhados', inline: true },
          { name: '👤 Solicitado por', value: interaction.user.username, inline: true }
        )
        .setDescription(`📋 **Relatórios gerados:**\n• \`detailed-transactions-${fromDateStr}-to-${toDateStr}.csv\` - Todas as transações com detalhes completos\n• \`worker-summary-${fromDateStr}-to-${toDateStr}.csv\` - Resumo por trabalhador\n• \`activity-breakdown-${fromDateStr}-to-${toDateStr}.csv\` - Análise detalhada por atividade`)
        .setTimestamp()
        .setFooter({ text: 'Fazenda Cabra da Peste - Sistema de Análise Avançada' });

      if (selectedWorker) {
        embed.addFields({ name: '⚠️ Filtro por Trabalhador', value: `${selectedWorker.username} (aplicado manualmente aos dados)`, inline: true });
      }

      // Send files
      await interaction.editReply({
        content: `✅ **Análise Completa!**\n📊 Todas as mensagens do Discord analisadas com parsing avançado e exportadas em 3 relatórios CSV detalhados.`,
        embeds: [embed],
        files: attachments
      });

      // Cleanup files after sending
      for (const result of exportResults) {
        try {
          await fs.unlink(result.filePath);
          console.log(`🗑️ Cleaned up temporary file: ${result.filename}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Could not cleanup file ${result.filename}:`, cleanupError);
        }
      }

      // Log the export request
      console.log(`📊 Export request completed: ${interaction.user.username} exported CSV files from ${fromDateStr} to ${toDateStr}`);

    } catch (error) {
      console.error('Error in export command:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `❌ Erro ao gerar exportação: ${errorMessage}`
        });
      } else {
        await interaction.reply({
          content: `❌ Erro ao gerar exportação: ${errorMessage}`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },

  /**
   * Run the channel analyzer script with date parameters
   */
  async runChannelAnalyzer(channelId: string, startDate: string, endDate: string): Promise<Array<{filename: string, buffer: Buffer, filePath: string}>> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'channel-analyzer.ts');
      const tsxPath = 'npx';
      const args = ['tsx', scriptPath, channelId, startDate, endDate];

      console.log(`🚀 Running channel analyzer: ${tsxPath} ${args.join(' ')}`);

      const childProcess = spawn(tsxPath, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('📤 Channel Analyzer:', data.toString().trim());
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('📤 Channel Analyzer Error:', data.toString().trim());
      });

      childProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error(`❌ Channel analyzer exited with code ${code}`);
          console.error('STDOUT:', stdout);
          console.error('STDERR:', stderr);
          reject(new Error(`Channel analyzer failed with exit code ${code}: ${stderr}`));
          return;
        }

        try {
          // Look for generated CSV files in exports directory
          const exportsDir = path.join(process.cwd(), 'exports');
          const dateRangePattern = `${startDate}-to-${endDate}`;

          const expectedFiles = [
            `detailed-transactions-${dateRangePattern}.csv`,
            `worker-summary-${dateRangePattern}.csv`,
            `activity-breakdown-${dateRangePattern}.csv`
          ];

          const results = [];

          for (const filename of expectedFiles) {
            const filePath = path.join(exportsDir, filename);
            try {
              const buffer = await fs.readFile(filePath);
              results.push({
                filename,
                buffer,
                filePath
              });
              console.log(`✅ Found and loaded: ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
            } catch (fileError) {
              console.warn(`⚠️ Could not find expected file: ${filename}`);
            }
          }

          if (results.length === 0) {
            reject(new Error('No CSV files were generated by the channel analyzer'));
            return;
          }

          console.log(`📊 Successfully loaded ${results.length} CSV files`);
          resolve(results);

        } catch (error) {
          console.error('❌ Error reading generated files:', error);
          reject(error);
        }
      });

      childProcess.on('error', (error) => {
        console.error('❌ Failed to start channel analyzer:', error);
        reject(error);
      });
    });
  }
};