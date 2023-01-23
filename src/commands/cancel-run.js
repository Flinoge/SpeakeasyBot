import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { security } from "../utils/constants.js";
import { sendCommandConfirmation } from "../utils/methods.js";
import { sendCommandError } from "../utils/methods.js";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("cancel-run")
    .setDescription("Cancel a run that is pending.")
    .addStringOption((option) =>
      option
        .setName("run")
        .setDescription("Run to cancel")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits[security.permissions.admin]
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "run") {
      const pendingRuns = await Run.find({ status: "Pending" });
      let choices = pendingRuns.map((r) => ({
        name: `${r.type} (${moment(r.createdAt).format(`YYYY-M-D h:m`)})`,
        value: r.messageId,
      }));
      const filtered = choices.filter(
        (r) => r.name.indexOf(focusedValue) !== -1
      );
      await interaction.respond(
        filtered.map((r) => ({ name: r.name, value: r.value }))
      );
    }
  },
  async execute(interaction) {
    const run = await interaction.channel.messages.fetch(
      interaction.options.getString("run")
    );
    if (!run) {
      sendCommandError(
        interaction.user,
        "Run message specified does not exist in discord."
      );
      return;
    }
    const runDB = await Run.findOne({
      messageId: interaction.options.getString("run"),
    });
    if (!runDB) {
      sendCommandError(
        interaction.user,
        "Run specified does not exist in system."
      );
      return;
    }
    if (run && runDB) {
      let messageEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("M+ Sale")
        .setAuthor({
          name: interaction.member.user.tag,
          iconURL: interaction.member.user.avatarURL(),
        })
        .setThumbnail(interaction.member.user.avatarURL())
        .addFields(
          {
            name: `${runDB.settings.key ? `${runDB.settings.key} ` : ""}+${
              runDB.settings.level
            } `,
            value: `${runDB.settings.cuts}k cuts`,
          },
          { name: "Run Time", value: `This run has been cancelled.` }
        )
        .setTimestamp()
        .setFooter({
          text: "Cancelled.",
          iconURL: interaction.member.user.avatarURL(),
        });
      await run.edit({
        content: ``,
        embeds: [messageEmbed],
      });
      runDB.status = "Cancelled";
      runDB.save();
      sendCommandConfirmation(interaction.user, `Run has been cancelled.`);
    }
  },
};
