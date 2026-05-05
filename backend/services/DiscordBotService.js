import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ThreadAutoArchiveDuration, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import pool from '../db.js';
import { findMatchesForNeed, findMatchesForResource } from './matchingService.js';
import { PermissionFlagsBits } from 'discord.js';
import NeedService from './NeedService.js';
import ResourceService from './ResourceService.js';

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
      this.setupGuildEvents();
    } else {
      console.warn('DISCORD_TOKEN not found in environment variables. Discord bot is disabled.');
    }
  }

  async getLinkedUser(discordUserId) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE discord_user_id = $1', [discordUserId]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error fetching linked user:', err);
      return null;
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

  setupGuildEvents() {
    this.client.on(Events.GuildCreate, async (guild) => {
      console.log(`Joined new guild: ${guild.name}`);
      try {
        // Try to find the first text channel the bot can send to
        const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('🌍 Welcome to Cerbanimo!')
            .setDescription('Thank you for adding Cerbanimo to your server. We are here to help your community coordinate mutual aid and share resources effectively.')
            .addFields(
              { name: '🚀 Getting Started', value: '1. Link your account: Use `/account link`\n2. Need help? Use `/need create` to post a request.\n3. Have something to share? Use `/resource create` to offer it.' },
              { name: '🧭 Available Commands', value: '`/need`, `/resource`, `/account`, `/help`, `/help-offer`' },
              { name: '🔗 Platform Access', value: `[Visit Cerbanimo](${process.env.FRONTEND_URL || 'http://localhost:3000'})` }
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
        // Check if this thread belongs to a need (Cross-Guild Support)
        const threadResult = await pool.query('SELECT need_id FROM need_discord_threads WHERE thread_id = $1', [message.channel.id]);
        if (threadResult.rows.length > 0) {
          const needId = threadResult.rows[0].need_id;

          // Try to find Cerbanimo user by Discord ID
          const userResult = await pool.query('SELECT id, username FROM users WHERE discord_user_id = $1', [message.author.id]);
          let userId = userResult.rows[0]?.id;

          // Fallback to a system user or handle as anonymous if mapping doesn't exist
          if (!userId) {
            console.log(`No Cerbanimo user found for Discord ID ${message.author.id}. Message will not be synced to need_comments.`);
            return;
          }

          // 1. Sync to Cerbanimo
          await pool.query(
            'INSERT INTO need_comments (need_id, user_id, content) VALUES ($1, $2, $3)',
            [needId, userId, `[Discord] ${message.content}`]
          );
          console.log(`Synced message from Discord thread ${message.channel.id} to need ${needId}`);

          // 2. Relay to OTHER Discord guilds (Cross-Guild Communication)
          this.relayDiscordMessage(needId, message.channel.id, userResult.rows[0].username, message.content);
        }
      }
    });

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
      if (interaction.isChatInputCommand()) {
        const linkedUser = await this.getLinkedUser(interaction.user.id);

        if (!linkedUser && interaction.commandName !== 'account' && interaction.commandName !== 'help') {
          return interaction.reply({
            content: "❌ You need to link your Cerbanimo account to use this command. Use `/account link` to get started.",
            ephemeral: true
          });
        }

        if (interaction.commandName === 'account') {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'link') {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const embed = new EmbedBuilder()
              .setTitle('🔗 Link your Cerbanimo Account')
              .setDescription(`To link your Discord account, please visit your Cerbanimo profile. Your Discord ID (\`${interaction.user.id}\`) will be automatically filled in.\n\n[Go to Cerbanimo Profile](${frontendUrl}/profile?discord_id=${interaction.user.id})`)
              .setColor(0x0099FF);
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
        }

        if (interaction.commandName === 'community') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Only server administrators can configure community settings.", ephemeral: true });
          }

          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'configure') {
            const needChannel = interaction.options.getChannel('need_channel');
            const alertChannel = interaction.options.getChannel('alert_channel');

            try {
              const configResult = await pool.query('SELECT community_id FROM community_discord_config WHERE guild_id = $1', [interaction.guildId]);
              if (configResult.rows.length === 0) {
                return interaction.reply({ content: "❌ This server is not yet linked to a Cerbanimo community via the web dashboard.", ephemeral: true });
              }

              const communityId = configResult.rows[0].community_id;

              if (needChannel) {
                await pool.query('UPDATE community_discord_config SET need_channel_id = $1 WHERE community_id = $2', [needChannel.id, communityId]);
              }
              if (alertChannel) {
                await pool.query('UPDATE community_discord_config SET alert_channel_id = $1 WHERE community_id = $2', [alertChannel.id, communityId]);
              }

              return interaction.reply({ content: `✅ Community configuration updated for ${needChannel ? 'Need Channel: <#'+needChannel.id+'>' : ''} ${alertChannel ? 'Alert Channel: <#'+alertChannel.id+'>' : ''}`, ephemeral: true });
            } catch (err) {
              console.error('Error configuring community:', err);
              return interaction.reply({ content: "❌ Failed to update community configuration.", ephemeral: true });
            }
          }
        }

        if (interaction.commandName === 'help') {
          const embed = new EmbedBuilder()
            .setTitle('🌍 Welcome to Cerbanimo')
            .setDescription('Cerbanimo is a mutual aid platform for sharing needs and resources.')
            .addFields(
              { name: '🆘 /need create', value: 'Declare a new need in the community.' },
              { name: '✅ /need fulfill', value: 'Mark one of your needs as fulfilled.' },
              { name: '📦 /resource create', value: 'Post a new resource you can share.' },
              { name: '🔗 /account link', value: 'Link your Discord to Cerbanimo.' },
              { name: '🤝 /help-offer', value: 'Offer help for a specific need.' }
            )
            .setColor(0x00FF00);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.commandName === 'help-offer') {
          const needId = interaction.options.getString('need_id');
          const message = interaction.options.getString('message') || "I'd like to help!";

          try {
            await pool.query(
              'INSERT INTO need_comments (need_id, user_id, content) VALUES ($1, $2, $3)',
              [needId, linkedUser.id, `[Discord Help Offer] ${message}`]
            );

            await interaction.reply({ content: "Your help offer has been recorded and synced to Cerbanimo!", ephemeral: true });
          } catch (err) {
            console.error('Error in help-offer command:', err);
            await interaction.reply({ content: "Failed to record help offer.", ephemeral: true });
          }
        } else if (interaction.commandName === 'need') {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'create') {
            const modal = new ModalBuilder()
              .setCustomId('need_create_modal')
              .setTitle('🆘 Create a New Need');

            const titleInput = new TextInputBuilder()
              .setCustomId('need_title')
              .setLabel('Title')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Short title for your need')
              .setRequired(true);

            const descriptionInput = new TextInputBuilder()
              .setCustomId('need_description')
              .setLabel('Description')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Describe what you need help with')
              .setRequired(true);

            const urgencyInput = new TextInputBuilder()
              .setCustomId('need_urgency')
              .setLabel('Urgency (low, medium, high, critical)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('medium')
              .setRequired(false);

            const categoryInput = new TextInputBuilder()
                .setCustomId('need_category')
                .setLabel('Category (Goods, Services, Info)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Goods')
                .setRequired(false);

            const locationInput = new TextInputBuilder()
                .setCustomId('need_location')
                .setLabel('Location')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Where is this needed?')
                .setRequired(false);

            modal.addComponents(
              new ActionRowBuilder().addComponents(titleInput),
              new ActionRowBuilder().addComponents(descriptionInput),
              new ActionRowBuilder().addComponents(urgencyInput),
              new ActionRowBuilder().addComponents(categoryInput),
              new ActionRowBuilder().addComponents(locationInput)
            );

            await interaction.showModal(modal);
          } else if (subcommand === 'fulfill') {
            try {
                const needsResult = await pool.query(
                    "SELECT id, name FROM needs WHERE requestor_user_id = $1 AND status = 'open' LIMIT 25",
                    [linkedUser.id]
                );

                if (needsResult.rows.length === 0) {
                    return interaction.reply({ content: "You have no open needs to fulfill.", ephemeral: true });
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId('need_fulfill_select')
                    .setPlaceholder('Select a need to mark as fulfilled')
                    .addOptions(
                        needsResult.rows.map(need =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(need.name.substring(0, 100))
                                .setValue(need.id.toString())
                        )
                    );

                const row = new ActionRowBuilder().addComponents(select);

                await interaction.reply({
                    content: 'Choose a need to fulfill:',
                    components: [row],
                    ephemeral: true
                });
            } catch (err) {
                console.error('Error fetching needs for fulfillment:', err);
                await interaction.reply({ content: "❌ Failed to fetch your needs.", ephemeral: true });
            }
          }
        } else if (interaction.commandName === 'resource') {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'create') {
            const modal = new ModalBuilder()
              .setCustomId('resource_create_modal')
              .setTitle('📦 Post a New Resource');

            const nameInput = new TextInputBuilder()
              .setCustomId('resource_name')
              .setLabel('Name')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g., Power Drill, 10 hours of coding')
              .setRequired(true);

            const descriptionInput = new TextInputBuilder()
              .setCustomId('resource_description')
              .setLabel('Description')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Describe your resource and how it can be used')
              .setRequired(true);

            const categoryInput = new TextInputBuilder()
              .setCustomId('resource_category')
              .setLabel('Category')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g., Tools, Time, Skills')
              .setRequired(true);

            modal.addComponents(
              new ActionRowBuilder().addComponents(nameInput),
              new ActionRowBuilder().addComponents(descriptionInput),
              new ActionRowBuilder().addComponents(categoryInput)
            );

            await interaction.showModal(modal);
          }
        }
      } else if (interaction.isModalSubmit()) {
          const linkedUser = await this.getLinkedUser(interaction.user.id);
          const guildId = interaction.guildId;

          if (interaction.customId === 'need_create_modal') {
              const name = interaction.fields.getTextInputValue('need_title');
              const description = interaction.fields.getTextInputValue('need_description');
              const urgency = interaction.fields.getTextInputValue('need_urgency') || 'medium';
              const category = interaction.fields.getTextInputValue('need_category');

              try {
                  const configResult = await pool.query('SELECT community_id FROM community_discord_config WHERE guild_id = $1', [guildId]);
                  const communityId = configResult.rows[0]?.community_id;

                  const newNeed = await NeedService.createNeed({
                    name,
                    description,
                    urgency,
                    category,
                    location_text: interaction.fields.getTextInputValue('need_location'),
                    requestor_user_id: linkedUser.id,
                    requestor_community_id: communityId,
                    source: 'discord'
                  });

                  await interaction.reply({ content: `✅ Need "${name}" created successfully!`, ephemeral: true });
                  await this.broadcastNeed(newNeed);
                  this.matchAndPing(newNeed, 'need').catch(console.error);

              } catch (err) {
                  console.error('Error creating need from modal:', err);
                  await interaction.reply({ content: "❌ Failed to create need.", ephemeral: true });
              }
          } else if (interaction.customId === 'resource_create_modal') {
              const name = interaction.fields.getTextInputValue('resource_name');
              const description = interaction.fields.getTextInputValue('resource_description');
              const category = interaction.fields.getTextInputValue('resource_category');

              try {
                  const configResult = await pool.query('SELECT community_id FROM community_discord_config WHERE guild_id = $1', [guildId]);
                  const communityId = configResult.rows[0]?.community_id;

                  const newResource = await ResourceService.addResource(
                    linkedUser.id,
                    communityId,
                    name,
                    description,
                    category,
                    'new', // condition
                    1, // quantity
                    'item', // unit
                    'available',
                    [], // skillIds
                    '', // locationText
                    null, // resourceType
                    null, // availabilitySchedule
                    null // conditions
                  );

                  // Add source to resource as addResource doesn't support it yet in the args
                  await pool.query('UPDATE resources SET source = \'discord\' WHERE id = $1', [newResource.id]);
                  newResource.source = 'discord';

                  await interaction.reply({ content: `✅ Resource "${name}" posted successfully!`, ephemeral: true });
                  await this.broadcastResource(newResource);
                  this.matchAndPing(newResource, 'resource').catch(console.error);

              } catch (err) {
                  console.error('Error creating resource from modal:', err);
                  await interaction.reply({ content: "❌ Failed to post resource.", ephemeral: true });
              }
          }
      } else if (interaction.isStringSelectMenu()) {
          const linkedUser = await this.getLinkedUser(interaction.user.id);

          if (interaction.customId === 'need_fulfill_select') {
              const needId = interaction.values[0];
              try {
                  const result = await pool.query(
                      "UPDATE needs SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_via = 'discord', updated_at = NOW() WHERE id = $1 AND requestor_user_id = $2 RETURNING *",
                      [needId, linkedUser.id]
                  );

                  if (result.rows.length === 0) {
                      return interaction.reply({ content: "❌ Failed to fulfill need. You may not be the creator.", ephemeral: true });
                  }

                  const fulfilledNeed = result.rows[0];
                  await interaction.reply({ content: `🎉 Need "${fulfilledNeed.name}" has been marked as fulfilled!`, ephemeral: true });

                  // Update original Discord message if it exists
                  if (fulfilledNeed.discord_message_id && fulfilledNeed.discord_thread_id) {
                      await this.syncNeedUpdate(fulfilledNeed);
                  }

              } catch (err) {
                  console.error('Error fulfilling need from select:', err);
                  await interaction.reply({ content: "❌ Failed to fulfill need.", ephemeral: true });
              }
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

      await pool.query('UPDATE needs SET discord_message_id = $1, discord_channel_id = $2, discord_thread_id = $3 WHERE id = $4', [message.id, channel.id, thread.id, need.id]);

      // Also record in mapping table
      await pool.query(
        'INSERT INTO need_discord_threads (need_id, guild_id, channel_id, thread_id, is_primary) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (need_id, thread_id) DO NOTHING',
        [need.id, guild_id, channel.id, thread.id]
      );

      return { messageId: message.id, threadId: thread.id };
    } catch (err) {
      console.error('Error broadcasting need to Discord:', err);
    }
  }

  async broadcastResource(resource) {
    if (!this.isReady || (!resource.owner_community_id && !resource.community_id)) return;

    try {
      const communityId = resource.owner_community_id || resource.community_id;
      const configResult = await pool.query('SELECT guild_id, need_channel_id FROM community_discord_config WHERE community_id = $1', [communityId]);
      if (configResult.rows.length === 0) return;

      const { need_channel_id } = configResult.rows[0];
      const channel = await this.client.channels.fetch(need_channel_id);

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

      return { messageId: message.id, channelId: channel.id };
    } catch (err) {
      console.error('Error broadcasting resource to Discord:', err);
    }
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

        // Find unique communities involved in matches
        const communityIds = new Set();
        if (type === 'need') {
            matches.resources.forEach(r => {
                if (r.owner_community_id) communityIds.add(r.owner_community_id);
                if (r.community_id) communityIds.add(r.community_id);
            });
        } else {
            matches.needs.forEach(n => {
                if (n.requestor_community_id) communityIds.add(n.requestor_community_id);
            });
        }

        // Remove the origin community
        const originCommunityId = type === 'need' ? entity.requestor_community_id : (entity.owner_community_id || entity.community_id);
        if (originCommunityId) communityIds.delete(originCommunityId);

        if (communityIds.size === 0) return;

        // Fetch configs for these communities that have cross-community enabled
        const configsResult = await pool.query(
            'SELECT cdc.*, c.name FROM community_discord_config cdc JOIN communities c ON cdc.community_id = c.id WHERE cdc.community_id = ANY($1) AND c.cross_community_enabled = TRUE',
            [Array.from(communityIds)]
        );

        for (const config of configsResult.rows) {
            if (!config.alert_channel_id) continue;

            const channel = await this.client.channels.fetch(config.alert_channel_id);
            if (!channel) continue;

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const embed = new EmbedBuilder()
                .setTitle(`🌐 Cross-Community Alert: Potential Match!`)
                .setDescription(`A neighboring community is requesting something you might have, or offering something you need.`)
                .addFields(
                    { name: type === 'need' ? '🆘 Need' : '📦 Resource', value: entity.name },
                    { name: 'Description', value: entity.description.substring(0, 100) + '...' },
                    { name: 'Action', value: `[View in Cerbanimo](${frontendUrl}/${type === 'need' ? 'needs' : 'resources'}/${entity.id})` }
                )
                .setColor(0xFFA500)
                .setTimestamp();

            const alertMsg = await channel.send({ embeds: [embed] });

            // Create a thread on the alert for cross-guild coordination
            const alertThread = await alertMsg.startThread({
                name: `Alert Coordination: ${entity.name}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            });

            // Record this thread for cross-guild sync
            if (type === 'need') {
              await pool.query(
                'INSERT INTO need_discord_threads (need_id, guild_id, channel_id, thread_id, is_primary) VALUES ($1, $2, $3, $4, FALSE) ON CONFLICT (need_id, thread_id) DO NOTHING',
                [entity.id, config.guild_id, config.need_channel_id, alertThread.id]
              );
            }
        }
    } catch (err) {
        console.error('Error in matchAndPing:', err);
    }
  }

  async syncCommentToDiscord(needId, comment) {
    if (!this.isReady) return;

    try {
      const threadsResult = await pool.query('SELECT thread_id FROM need_discord_threads WHERE need_id = $1', [needId]);

      for (const row of threadsResult.rows) {
        try {
          const thread = await this.client.channels.fetch(row.thread_id);
          if (thread && thread.isThread()) {
            await thread.send(`**${comment.username}** (via Cerbanimo): ${comment.content}`);
          }
        } catch (threadErr) {
          console.error(`Failed to sync comment to thread ${row.thread_id}:`, threadErr);
        }
      }
    } catch (err) {
      console.error('Error syncing comment to Discord:', err);
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
        try {
          const thread = await this.client.channels.fetch(row.thread_id);
          if (thread && thread.isThread()) {
            await thread.send(`**${username}** (via neighbor guild): ${content}`);
          }
        } catch (threadErr) {
          console.error(`Failed to relay message to thread ${row.thread_id}:`, threadErr);
        }
      }
    } catch (err) {
      console.error('Error relaying Discord message:', err);
    }
  }

  async syncNeedUpdate(need) {
    if (!this.isReady) return;

    try {
      if (need.discord_thread_id) {
        const thread = await this.client.channels.fetch(need.discord_thread_id);
        if (thread && thread.isThread()) {
          const statusEmoji = need.status === 'fulfilled' ? '🎉' : '🔄';
          await thread.send(`${statusEmoji} **Update**: Status changed to **${need.status}**`);

          if (need.status === 'fulfilled' || need.status === 'closed') {
            await thread.setArchived(true);
          }
        }
      }

      // Also update original message embed if possible
      if (need.discord_message_id && need.discord_channel_id) {
        const channel = await this.client.channels.fetch(need.discord_channel_id);
        if (channel) {
          const message = await channel.messages.fetch(need.discord_message_id);
          if (message) {
            const embed = EmbedBuilder.from(message.embeds[0]);
            embed.setTitle(`${need.status === 'fulfilled' ? '✅' : '🚨'} Need: ${need.name} (${need.status.toUpperCase()})`);
            await message.edit({ embeds: [embed] });
          }
        }
      } else if (need.discord_message_id) {
          // Fallback to config if discord_channel_id is missing on the need record
          const configResult = await pool.query('SELECT need_channel_id FROM community_discord_config WHERE community_id = $1', [need.requestor_community_id]);
          if (configResult.rows.length > 0) {
              const channel = await this.client.channels.fetch(configResult.rows[0].need_channel_id);
              if (channel) {
                const message = await channel.messages.fetch(need.discord_message_id);
                if (message) {
                    const embed = EmbedBuilder.from(message.embeds[0]);
                    embed.setTitle(`${need.status === 'fulfilled' ? '✅' : '🚨'} Need: ${need.name} (${need.status.toUpperCase()})`);
                    await message.edit({ embeds: [embed] });
                }
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

export default new DiscordBotService();
