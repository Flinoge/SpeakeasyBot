import { Events } from "discord.js";
import { hasPermission, hasRole } from "../utils/methods.js";
import { security } from "../utils/constants.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    let individualAccess = true;
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await interaction.deferReply();
        await interaction.deleteReply();
        if (command.permission) {
          if (
            !hasPermission(
              interaction,
              security.permissions[command.permission]
            )
          ) {
            individualAccess = false;
          }
        }
        if (command.role) {
          if (!hasRole(interaction, security.roles[command.role])) {
            individualAccess = false;
          }
        }
        if (!individualAccess) {
          return;
        }
        await command.execute(interaction);
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
        if (command.permission) {
          if (
            !hasPermission(
              interaction,
              security.permissions[command.permission]
            )
          ) {
            individualAccess = false;
          }
        }
        if (command.role) {
          if (!hasRole(interaction, security.roles[command.role])) {
            individualAccess = false;
          }
        }
        if (!individualAccess) {
          return;
        }
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isButton()) {
      const button = interaction.client.buttons.get(interaction.customId);

      if (!button) {
        console.error(`No command matching ${interaction.customId} was found.`);
        return;
      }

      try {
        await interaction.deferReply();
        await interaction.deleteReply();
        if (button.permission) {
          if (
            !hasPermission(interaction, security.permissions[button.permission])
          ) {
            individualAccess = false;
          }
        }
        if (button.role) {
          if (!hasRole(interaction, security.roles[button.role])) {
            individualAccess = false;
          }
        }
        if (!individualAccess) {
          return;
        }
        await button.execute(interaction);
      } catch (error) {
        console.error(error);
      }
    }
  },
};
