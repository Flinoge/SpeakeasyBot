import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { security } from "../utils/constants.js";
import { sendCommandConfirmation, messageToRun } from "../utils/methods.js";
import Run from "../models/run.js";
import moment from "moment";

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
      const pendingRuns = await Run.find({ status: "Pending", type: "M+" });
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
    const { runDB, message } = await messageToRun(
      interaction.options.getString("run"),
      interaction
    );
    if (!runDB || !message) {
      return;
    }
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
    await message.edit({
      content: ``,
      embeds: [messageEmbed],
    });
    runDB.status = "Cancelled";
    runDB.save();
    sendCommandConfirmation(interaction.user, `Cancel Run.`);
  },
};
