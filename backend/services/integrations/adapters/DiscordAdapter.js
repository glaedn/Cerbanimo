import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ThreadAutoArchiveDuration, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } from 'discord.js';
import BaseAdapter from './BaseAdapter.js';
import pool from '../../../db.js';
import { findMatchesForNeed, findMatchesForResource } from '../../matchingService.js';
import NeedService from '../../NeedService.js';
import ResourceService from '../../ResourceService.js';
import PotentialUserService from '../../PotentialUserService.js';
import taskController from '../../../controllers/taskController.js';

class DiscordAdapter extends BaseAdapter {
  constructor() {
    super('discord');
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });
    this.token = process.env.DISCORD_TOKEN;
    this.clientId = process.env.DISCORD_CLIENT_ID;
  }

  async initialize() {
    if (!this.token) {
      console.warn('DISCORD_TOKEN not found. Discord adapter disabled.');
      return;
    }

    try {
      await this.client.login(this.token);
      this.client.once(Events.ClientReady, async (c) => {
        console.log(`Discord Adapter Ready! Logged in as ${c.user.tag}`);
        this.isReady = true;
        await this.registerSlashCommands();
      });

      this.setupEventListeners();
      this.setupGuildEvents();
    } catch (err) {
      console.error('Failed to initialize Discord adapter:', err);
    }
  }

  async getLinkedUser(discordUserId) {
    try {
      // Check user_integrations first
      const uiResult = await pool.query(
        'SELECT user_id FROM user_integrations WHERE platform = $1 AND external_user_id = $2',
        ['discord', discordUserId]
      );
      if (uiResult.rows.length > 0) {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [uiResult.rows[0].user_id]);
        return userResult.rows[0] || null;
      }

      // Fallback to legacy discord_user_id column
      const legacyResult = await pool.query('SELECT * FROM users WHERE discord_user_id = $1', [discordUserId]);
      return legacyResult.rows[0] || null;
    } catch (err) {
      console.error('Error fetching linked user:', err);
      return null;
    }
  }

  async broadcast(integration, payload) {
    const { type, entity } = payload;
    if (type === 'need') {
      return this.broadcastNeed(entity, integration.external_channel_id);
    } else if (type === 'resource') {
      return this.broadcastResource(entity, integration.external_channel_id);
    }
  }

  async notifyUser(externalUserId, payload) {
    if (!this.isReady) return;
    try {
      const user = await this.client.users.fetch(externalUserId);
      if (user) {
        await user.send(payload.message || payload.text);
      }
    } catch (err) {
      console.error(`Failed to notify Discord user ${externalUserId}:`, err);
    }
  }

  async resolveInvite(inviteUrl) {
    if (!this.isReady) return null;
    try {
      const code = inviteUrl.split('/').pop();
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

  async broadcastNeed(need, channelId = null) {
    if (!this.isReady) return;
    try {
      let finalChannelId = channelId;
      if (!finalChannelId && need.requestor_community_id) {
        const configResult = await pool.query('SELECT need_channel_id FROM community_discord_config WHERE community_id = $1', [need.requestor_community_id]);
        finalChannelId = configResult.rows[0]?.need_channel_id;
      }

      if (!finalChannelId) return;
      const channel = await this.client.channels.fetch(finalChannelId);
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

      await pool.query('UPDATE needs SET discord_message_id = $1, discord_channel_id = $2, discord_thread_id = $3 WHERE id = $4', [message.id, channel.id, thread.id, need.id]);

      // Record in mapping table
      await pool.query(
        'INSERT INTO need_discord_threads (need_id, guild_id, channel_id, thread_id, is_primary) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (need_id, thread_id) DO NOTHING',
        [need.id, channel.guildId, channel.id, thread.id]
      );

      this.matchAndPing(need, 'need').catch(console.error);

      return { messageId: message.id, threadId: thread.id };
    } catch (err) {
      console.error('Error broadcasting need to Discord:', err);
    }
  }

  async broadcastResource(resource, channelId = null) {
    if (!this.isReady) return;
    try {
      let finalChannelId = channelId;
      if (!finalChannelId) {
        const communityId = resource.owner_community_id || resource.community_id;
        if (communityId) {
            const configResult = await pool.query('SELECT need_channel_id FROM community_discord_config WHERE community_id = $1', [communityId]);
            finalChannelId = configResult.rows[0]?.need_channel_id;
        }
      }

      if (!finalChannelId) return;
      const channel = await this.client.channels.fetch(finalChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`📦 New Resource: ${resource.name}`)
        .setDescription(resource.description)
        .addFields(
          { name: 'Category', value: resource.category || 'Not specified', inline: true },
          { name: 'Type', value: resource.resource_type || 'Not specified', inline: true },
        )
        .setColor(0x00FF00)
        .setTimestamp();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('View in Cerbanimo')
            .setURL(`${frontendUrl}/resources/${resource.id}`)
            .setStyle(ButtonStyle.Link)
        );

      const message = await channel.send({ embeds: [embed], components: [row] });
      await pool.query('UPDATE resources SET discord_message_id = $1, discord_channel_id = $2 WHERE id = $3', [message.id, channel.id, resource.id]);

      this.matchAndPing(resource, 'resource').catch(console.error);

      return { messageId: message.id, channelId: channel.id };
    } catch (err) {
      console.error('Error broadcasting resource to Discord:', err);
    }
  }

  async registerSlashCommands() {
    if (!this.token || !this.clientId) return;

    const commands = [
        new SlashCommandBuilder()
            .setName('need')
            .setDescription('Need management commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Declare a new need in Cerbanimo'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('fulfill')
                    .setDescription('Mark one of your needs as fulfilled')),
        new SlashCommandBuilder()
            .setName('resource')
            .setDescription('Resource management commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Post a new resource in Cerbanimo')),
        new SlashCommandBuilder()
            .setName('account')
            .setDescription('Account management commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('link')
                    .setDescription('Link your Discord account to Cerbanimo')),
        new SlashCommandBuilder()
            .setName('tasks')
            .setDescription('Show active and urgent project tasks for this community'),
        new SlashCommandBuilder()
            .setName('accept')
            .setDescription('Task acceptance commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('task')
                    .setDescription('Accept a task, or signal interest before linking')
                    .addStringOption(option =>
                        option.setName('task_id')
                            .setDescription('The task ID')
                            .setRequired(true))),
        new SlashCommandBuilder()
            .setName('submit')
            .setDescription('Task submission commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('task')
                    .setDescription('Submit proof of work for an accepted task')
                    .addStringOption(option =>
                        option.setName('task_id')
                            .setDescription('The task ID')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('proof_link')
                            .setDescription('Link showing proof of work')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('reflection')
                            .setDescription('Short reflection on the work completed')
                            .setRequired(true))),
        new SlashCommandBuilder()
            .setName('my')
            .setDescription('Show your Cerbanimo activity')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('tasks')
                    .setDescription('View active tasks you accepted or signaled interest in')),
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show information about Cerbanimo and available commands'),
        new SlashCommandBuilder()
            .setName('community')
            .setDescription('Community management commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('configure')
                    .setDescription('Configure Discord channels for Cerbanimo')
                    .addChannelOption(option =>
                        option.setName('need_channel')
                            .setDescription('Channel for new need broadcasts'))
                    .addChannelOption(option =>
                        option.setName('alert_channel')
                            .setDescription('Channel for cross-community alerts'))),
        new SlashCommandBuilder()
            .setName('help-offer')
            .setDescription('Offer help for a specific need')
            .addStringOption(option =>
                option.setName('need_id')
                    .setDescription('The ID of the need you want to help with')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Optional message to the requestor')
                    .setRequired(false))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.token);

    try {
        console.log('Started refreshing Discord application (/) commands.');
        await rest.put(
            Routes.applicationCommands(this.clientId),
            { body: commands },
        );
        console.log('Successfully reloaded Discord application (/) commands.');
    } catch (error) {
        console.error('Error registering Discord slash commands:', error);
    }
  }

  setupGuildEvents() {
    this.client.on(Events.GuildCreate, async (guild) => {
      console.log(`Joined new guild: ${guild.name}`);
      try {
        const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('🌍 Welcome to Cerbanimo!')
            .setDescription('Thank you for adding Cerbanimo to your server.')
            .addFields(
              { name: '🚀 Getting Started', value: '1. Link your account: Use `/account link`' },
              { name: '🧭 Available Commands', value: '`/need`, `/resource`, `/account`, `/help`, `/help-offer`' }
            )
            .setColor(0x00FF00)
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error('Error sending welcome message:', err);
      }
    });
  }

  setupEventListeners() {
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      if (message.channel.isThread()) {
        const threadResult = await pool.query('SELECT need_id FROM need_discord_threads WHERE thread_id = $1', [message.channel.id]);
        if (threadResult.rows.length > 0) {
          const needId = threadResult.rows[0].need_id;
          const user = await this.getLinkedUser(message.author.id);
          if (!user) return;

          await pool.query(
            'INSERT INTO need_comments (need_id, user_id, content) VALUES ($1, $2, $3)',
            [needId, user.id, `[Discord] ${message.content}`]
          );
          this.relayDiscordMessage(needId, message.channel.id, user.username, message.content);
        }
      }
    });

    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch().catch(() => {});
      if (reaction.emoji.name === '👍') {
        const needResult = await pool.query('SELECT id, name FROM needs WHERE discord_message_id = $1', [reaction.message.id]);
        if (needResult.rows.length > 0) {
          const need = needResult.rows[0];
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          await user.send(`You reacted to "${need.name}". More details: ${frontendUrl}/needs/${need.id}`).catch(() => {});
        }
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const linkedUser = await this.getLinkedUser(interaction.user.id);
        const tier0Commands = new Set(['account', 'help', 'help-offer', 'need', 'resource', 'tasks', 'accept', 'my']);

        if (!linkedUser && !tier0Commands.has(interaction.commandName)) {
          return interaction.reply({
            content: "❌ You need to link your Cerbanimo account. Use `/account link`.",
            ephemeral: true
          });
        }

        if (interaction.commandName === 'account') {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'link') {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const embed = new EmbedBuilder()
              .setTitle('🔗 Link Cerbanimo Account')
              .setDescription(`Visit your profile to link: [Go to Cerbanimo Profile](${frontendUrl}/profile?discord_id=${interaction.user.id})`)
              .setColor(0x0099FF);
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
        } else if (interaction.commandName === 'tasks') {
            try {
              await interaction.deferReply({ ephemeral: true });
              const configResult = await pool.query(
                'SELECT community_id FROM community_discord_config WHERE guild_id = $1',
                [interaction.guildId]
              );
              const communityId = configResult.rows[0]?.community_id;

              if (!communityId) {
                return interaction.editReply({ content: 'This Discord server is not linked to a Cerbanimo community yet.' });
              }

              const tasksResult = await pool.query(
                `SELECT t.id, t.name, t.status, t.reward_tokens, p.name AS project_name
                 FROM tasks t
                 JOIN projects p ON p.id = t.project_id
                 WHERE p.community_id = $1
                   AND t.status IN ('active-unassigned', 'urgent-unassigned', 'active-assigned', 'urgent-assigned')
                 ORDER BY CASE WHEN t.status LIKE 'urgent%' THEN 0 ELSE 1 END, t.created_at DESC
                 LIMIT 15`,
                [communityId]
              );

              if (tasksResult.rows.length === 0) {
                return interaction.editReply({ content: 'No active or urgent tasks are open for this community right now.' });
              }

              const lines = tasksResult.rows.map((task) =>
                `#${task.id} ${task.name} (${task.status}, ${task.reward_tokens || 0} tokens) - ${task.project_name || 'Project'}`
              );
              return interaction.editReply({ content: `Active community tasks:\n${lines.join('\n')}` });
            } catch (err) {
              console.error('Error listing Discord tasks:', err);
              return interaction.editReply({ content: 'Failed to load community tasks.' });
            }
        } else if (interaction.commandName === 'accept') {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'task') {
              try {
                await interaction.deferReply({ ephemeral: true });
                const taskId = interaction.options.getString('task_id');
                const taskResult = await pool.query(
                  `SELECT t.id, t.name, t.project_id, p.community_id
                   FROM tasks t
                   JOIN projects p ON p.id = t.project_id
                   WHERE t.id = $1`,
                  [taskId]
                );

                if (taskResult.rows.length === 0) {
                  return interaction.editReply({ content: 'Task not found.' });
                }

                const task = taskResult.rows[0];
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

                if (!linkedUser) {
                  await PotentialUserService.recordTaskInterest({
                    discordUserId: interaction.user.id,
                    discordUsername: interaction.user.username,
                    taskId: task.id,
                    communityId: task.community_id,
                    projectId: task.project_id
                  });
                  return interaction.editReply({
                    content: `Interest signaled for "${task.name}". Link Discord on your profile to reserve it: ${frontendUrl}/profile?discord_id=${interaction.user.id}`
                  });
                }

                const acceptedTask = await taskController.acceptTask(task.id, linkedUser.id);
                return interaction.editReply({ content: `Task reserved: "${acceptedTask.name}".` });
              } catch (err) {
                console.error('Error accepting Discord task:', err);
                return interaction.editReply({ content: `Failed to accept task: ${err.message}` });
              }
            }
        } else if (interaction.commandName === 'submit') {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'task') {
              if (!linkedUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return interaction.reply({
                  content: `Link Discord on your profile before submitting work: ${frontendUrl}/profile?discord_id=${interaction.user.id}`,
                  ephemeral: true
                });
              }

              try {
                await interaction.deferReply({ ephemeral: true });
                const taskId = interaction.options.getString('task_id');
                const proofLink = interaction.options.getString('proof_link');
                const reflection = interaction.options.getString('reflection');

                const assignedResult = await pool.query(
                  'SELECT id FROM tasks WHERE id = $1 AND $2 = ANY(assigned_user_ids)',
                  [taskId, linkedUser.id]
                );
                if (assignedResult.rows.length === 0) {
                  return interaction.editReply({ content: 'You can only submit tasks you have accepted.' });
                }

                await taskController.submitTask({
                  params: { taskId },
                  body: {
                    proofOfWorkLinks: [proofLink],
                    reflection,
                    platformUserId: linkedUser.id
                  }
                }, null, (data) => {}); // Using dummy res object

                return interaction.editReply({ content: 'Task submitted for verification.' });
              } catch (err) {
                console.error('Error submitting Discord task:', err);
                return interaction.editReply({ content: `Failed to submit task: ${err.message}` });
              }
            }
        } else if (interaction.commandName === 'my') {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'tasks') {
              try {
                await interaction.deferReply({ ephemeral: true });
                if (linkedUser) {
                  const result = await pool.query(
                    `SELECT t.id, t.name, t.status, p.name AS project_name
                     FROM tasks t
                     LEFT JOIN projects p ON p.id = t.project_id
                     WHERE $1 = ANY(t.assigned_user_ids)
                       AND t.status NOT IN ('completed', 'cancelled')
                     ORDER BY t.accepted_at DESC NULLS LAST, t.created_at DESC
                     LIMIT 15`,
                    [linkedUser.id]
                  );
                  if (result.rows.length === 0) {
                    return interaction.editReply({ content: 'You do not have active accepted tasks.' });
                  }
                  return interaction.editReply({
                    content: `Your active tasks:\n${result.rows.map(task => `#${task.id} ${task.name} (${task.status})`).join('\n')}`
                  });
                }
                return interaction.editReply({ content: 'Link your account to see your tasks.' });
              } catch (err) {
                return interaction.editReply({ content: 'Failed to load tasks.' });
              }
            }
        } else if (interaction.commandName === 'help-offer') {
            try {
              await interaction.deferReply({ ephemeral: true });
              const needId = interaction.options.getString('need_id');
              const message = interaction.options.getString('message') || "I'd like to help!";

              if (!linkedUser) {
                const needResult = await pool.query('SELECT requestor_community_id FROM needs WHERE id = $1', [needId]);
                await PotentialUserService.recordInteraction({
                  discordUserId: interaction.user.id,
                  discordUsername: interaction.user.username,
                  communityId: needResult.rows[0]?.requestor_community_id,
                  actionType: 'need_help_offer',
                  payload: { needId, message }
                });
                return interaction.editReply({ content: `Help offer recorded. Link your account to publish it.` });
              }

              await pool.query(
                'INSERT INTO need_comments (need_id, user_id, content) VALUES ($1, $2, $3)',
                [needId, linkedUser.id, `[Discord Help Offer] ${message}`]
              );
              return interaction.editReply({ content: "Offer recorded!" });
            } catch (err) {
              return interaction.editReply({ content: "Failed to record offer." });
            }
        } else if (interaction.commandName === 'need') {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'create') {
              const modal = new ModalBuilder().setCustomId('need_create_modal').setTitle('🆘 Create a New Need');
              const titleInput = new TextInputBuilder().setCustomId('need_title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(true);
              const descriptionInput = new TextInputBuilder().setCustomId('need_description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true);
              modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descriptionInput));
              await interaction.showModal(modal);
            }
        } else if (interaction.commandName === 'resource') {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'create') {
              const modal = new ModalBuilder().setCustomId('resource_create_modal').setTitle('📦 Post a New Resource');
              const nameInput = new TextInputBuilder().setCustomId('resource_name').setLabel('Name').setStyle(TextInputStyle.Short).setRequired(true);
              const descriptionInput = new TextInputBuilder().setCustomId('resource_description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true);
              const categoryInput = new TextInputBuilder().setCustomId('resource_category').setLabel('Category').setStyle(TextInputStyle.Short).setRequired(true);
              modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(descriptionInput), new ActionRowBuilder().addComponents(categoryInput));
              await interaction.showModal(modal);
            }
        }
      } else if (interaction.isModalSubmit()) {
        const linkedUser = await this.getLinkedUser(interaction.user.id);
        if (interaction.customId === 'need_create_modal') {
            await interaction.deferReply({ ephemeral: true });
            const name = interaction.fields.getTextInputValue('need_title');
            const description = interaction.fields.getTextInputValue('need_description');
            try {
                const configResult = await pool.query('SELECT community_id FROM community_discord_config WHERE guild_id = $1', [interaction.guildId]);
                const communityId = configResult.rows[0]?.community_id;
                if (!linkedUser) return interaction.editReply({ content: 'Link your account first.' });

                const newNeed = await NeedService.createNeed({
                    name, description, urgency: 'medium', requestor_user_id: linkedUser.id, requestor_community_id: communityId, source: 'discord'
                });
                await this.broadcastNeed(newNeed);
                return interaction.editReply({ content: `Need "${name}" created!` });
            } catch (err) {
                return interaction.editReply({ content: 'Failed to create need.' });
            }
        }
      }
    });
  }

  async matchAndPing(entity, type) {
    if (!this.isReady) return;
    try {
        let matches;
        if (type === 'need') {
            matches = await findMatchesForNeed(entity.id, pool);
        } else {
            const result = await findMatchesForResource(entity.id, pool);
            matches = { needs: result };
        }

        const communityIds = new Set();
        if (type === 'need') {
            matches.resources.forEach(r => {
                if (r.owner_community_id) communityIds.add(r.owner_community_id);
            });
        } else {
            matches.needs.forEach(n => {
                if (n.requestor_community_id) communityIds.add(n.requestor_community_id);
            });
        }

        const originCommunityId = type === 'need' ? entity.requestor_community_id : (entity.owner_community_id || entity.community_id);
        if (originCommunityId) communityIds.delete(originCommunityId);

        if (communityIds.size === 0) return;

        const configsResult = await pool.query(
            'SELECT cdc.*, c.name FROM community_discord_config cdc JOIN communities c ON cdc.community_id = c.id WHERE cdc.community_id = ANY($1)',
            [Array.from(communityIds)]
        );

        for (const config of configsResult.rows) {
            if (!config.alert_channel_id) continue;
            const channel = await this.client.channels.fetch(config.alert_channel_id);
            if (!channel) continue;

            const embed = new EmbedBuilder()
                .setTitle(`🌐 Cross-Community Alert: Potential Match!`)
                .setDescription(`A neighboring community is requesting something you might have, or offering something you need.`)
                .addFields(
                    { name: type === 'need' ? '🆘 Need' : '📦 Resource', value: entity.name },
                    { name: 'Description', value: entity.description.substring(0, 100) + '...' }
                )
                .setColor(0xFFA500);

            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Error in matchAndPing:', err);
    }
  }

  async relayDiscordMessage(needId, sourceThreadId, username, content) {
    if (!this.isReady) return;
    try {
      const threadsResult = await pool.query(
        'SELECT thread_id FROM need_discord_threads WHERE need_id = $1 AND thread_id != $2',
        [needId, sourceThreadId]
      );
      for (const row of threadsResult.rows) {
        const thread = await this.client.channels.fetch(row.thread_id);
        if (thread && thread.isThread()) {
          await thread.send(`**${username}** (via neighbor guild): ${content}`);
        }
      }
    } catch (err) {
      console.error('Error relaying Discord message:', err);
    }
  }

  async syncCommentToDiscord(needId, comment) {
    if (!this.isReady) return;
    try {
      const threadsResult = await pool.query('SELECT thread_id FROM need_discord_threads WHERE need_id = $1', [needId]);
      for (const row of threadsResult.rows) {
        const thread = await this.client.channels.fetch(row.thread_id);
        if (thread && thread.isThread()) {
          await thread.send(`**${comment.username}** (via Cerbanimo): ${comment.content}`);
        }
      }
    } catch (err) {
      console.error('Error syncing comment to Discord:', err);
    }
  }

  async syncNeedUpdate(need) {
    if (!this.isReady) return;
    try {
      if (need.discord_thread_id) {
        const thread = await this.client.channels.fetch(need.discord_thread_id);
        if (thread && thread.isThread()) {
          await thread.send(`🔄 **Update**: Status changed to **${need.status}**`);
          if (need.status === 'fulfilled' || need.status === 'closed') {
            await thread.setArchived(true);
          }
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

export default new DiscordAdapter();
