import { Events, PermissionsBitField } from "discord.js";
import { curatorRole, adminPermission } from "../discord.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const hasAccess =
      interaction.member.roles.cache.some(
        (role) => role.name === curatorRole
      ) ||
      interaction.member.permissions.has([
        PermissionsBitField[adminPermission],
      ]);
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        if (hasAccess) {
          await command.execute(interaction);
        } else {
          await interaction.deferReply();
          await interaction.deleteReply();
        }
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        if (hasAccess) {
          await command.autocomplete(interaction);
        } else {
          await interaction.deferReply();
          await interaction.deleteReply();
        }
      } catch (error) {
        console.error(error);
      }
    }
  },
};
