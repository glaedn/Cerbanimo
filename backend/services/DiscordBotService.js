import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ThreadAutoArchiveDuration, REST, Routes, SlashCommandBuilder } from 'discord.js';
import pool from '../db.js';

class DiscordBotService {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });
console.log("RUNTIME:", typeof process);
    this.token = process.env.DISCORD_TOKEN;
    this.clientId = process.env.DISCORD_CLIENT_ID;
    this.isReady = false;

    if (this.token) {
      this.client.login(this.token).catch(err => {
        console.error('Failed to login to Discord:', err);
      });

      this.client.once(Events.ClientReady, async (c) => {
        console.log(`Discord Bot Ready! Logged in as ${c.user.tag}`);
        this.isReady = true;
        await this.registerSlashCommands();
      });

      this.setupEventListeners();
    } else {
      console.warn('DISCORD_TOKEN not found in environment variables. Discord bot is disabled.');
    }
  }

  async resolveInvite(inviteLink) {
    if (!this.isReady) return null;
    try {
      const code = inviteLink.split('/').pop();
      const invite = await this.client.fetchInvite(code);
      if (invite) {
        return {
          guildId: invite.guild?.id,
          channelId: invite.channel?.id,
        };
      }
    } catch (err) {
      console.error('Error resolving Discord invite:', err);
    }
    return null;
  }

  async registerSlashCommands() {
    if (!this.token || !this.clientId) {
        console.warn('DISCORD_TOKEN or DISCORD_CLIENT_ID missing. Cannot register slash commands.');
        return;
    }

    const commands = [
        new SlashCommandBuilder()
            .setName('need')
            .setDescription('Declare a new need in Cerbanimo')
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('What do you need help with?')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('urgency')
                    .setDescription('How urgent is this?')
                    .addChoices(
                        { name: 'Low', value: 'low' },
                        { name: 'Medium', value: 'medium' },
                        { name: 'High', value: 'high' },
                        { name: 'Critical', value: 'critical' }
                    ))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.token);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(this.clientId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
  }

  setupEventListeners() {
    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      if (user.bot) return;
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Something went wrong when fetching the message:', error);
          return;
        }
      }

      if (reaction.emoji.name === '👍') {
        const needResult = await pool.query('SELECT id, name FROM needs WHERE discord_message_id = $1', [reaction.message.id]);
        if (needResult.rows.length > 0) {
          const need = needResult.rows[0];
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            await user.send(`You reacted to "${need.name}". You can offer help or see more details here: ${frontendUrl}/needs/${need.id}`);
          } catch (err) {
            console.error(`Could not send DM to user: ${err}`);
          }
        }
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'need') {
        const description = interaction.options.getString('description');
        const urgency = interaction.options.getString('urgency') || 'medium';
        const guildId = interaction.guildId;

        try {
            // Find community associated with this guild
            const configResult = await pool.query('SELECT community_id FROM community_discord_config WHERE guild_id = $1', [guildId]);

            if (configResult.rows.length === 0) {
                return interaction.reply({ content: "This Discord server is not connected to a Cerbanimo community.", ephemeral: true });
            }

            const communityId = configResult.rows[0].community_id;

            // Create the need in Cerbanimo
            // Note: We don't have the user mapping yet, so we mark it as a community-requested need
            const result = await pool.query(
                `INSERT INTO needs (name, description, urgency, requestor_community_id, status)
                 VALUES ($1, $2, $3, $4, 'open')
                 RETURNING *`,
                [description.substring(0, 50), description, urgency, communityId]
            );

            const newNeed = result.rows[0];

            // Broadcast the newly created need back to Discord (this will create the thread)
            await this.broadcastNeed(newNeed);

            await interaction.reply({
              content: `Need created! Coordination thread started in the designated channel.`,
              ephemeral: true
            });
        } catch (err) {
            console.error('Error creating need from Discord:', err);
            await interaction.reply({ content: "Failed to create need in Cerbanimo.", ephemeral: true });
        }
      }
    });
  }

  async broadcastNeed(need) {
    if (!this.isReady || !need.requestor_community_id) return;

    try {
      const configResult = await pool.query('SELECT guild_id, need_channel_id FROM community_discord_config WHERE community_id = $1', [need.requestor_community_id]);
      if (configResult.rows.length === 0) return;

      const { guild_id, need_channel_id } = configResult.rows[0];
      const channel = await this.client.channels.fetch(need_channel_id);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🚨 New Need: ${need.name}`)
        .setDescription(need.description)
        .addFields(
          { name: 'Urgency', value: need.urgency || 'Medium', inline: true },
          { name: 'Location', value: need.location_text || 'Not specified', inline: true },
        )
        .setColor(this.getUrgencyColor(need.urgency))
        .setTimestamp();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('View in Cerbanimo')
            .setURL(`${frontendUrl}/needs/${need.id}`)
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Offer Help')
            .setURL(`${frontendUrl}/needs/${need.id}?action=offer`)
            .setStyle(ButtonStyle.Link),
        );

      const message = await channel.send({ embeds: [embed], components: [row] });
      await message.react('👍');

      const thread = await message.startThread({
        name: `Need: ${need.name}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      });

      await pool.query('UPDATE needs SET discord_message_id = $1, discord_thread_id = $2 WHERE id = $3', [message.id, thread.id, need.id]);

      return { messageId: message.id, threadId: thread.id };
    } catch (err) {
      console.error('Error broadcasting need to Discord:', err);
    }
  }

  async syncNeedUpdate(need) {
    if (!this.isReady || !need.discord_thread_id) return;

    try {
      const thread = await this.client.channels.fetch(need.discord_thread_id);
      if (thread && thread.isThread()) {
        await thread.send(`🔄 **Update**: Status changed to **${need.status}**`);

        if (need.status === 'fulfilled' || need.status === 'closed') {
          await thread.setArchived(true);
        }
      }
    } catch (err) {
      console.error('Error syncing need update to Discord:', err);
    }
  }

  getUrgencyColor(urgency) {
    switch (urgency?.toLowerCase()) {
      case 'critical': return 0xFF0000;
      case 'high': return 0xFFA500;
      case 'medium': return 0xFFFF00;
      case 'low': return 0x00FF00;
      default: return 0x0099FF;
    }
  }
}

export default new DiscordBotService();
