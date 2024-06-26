import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Run from "../models/run.js";
import {
  findMessageInAdminChannel,
  formatBuyers,
  messageToRun,
  sendCommandConfirmation,
} from "../utils/methods.js";
import moment from "moment";

export default {
  role: "curator",
  data: new SlashCommandBuilder()
    .setName("add-buyer")
    .setDescription("Adds buyers to a Raid Sale")
    .addStringOption((option) =>
      option
        .setName("run")
        .setDescription("The run to add the buyer to.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("buyers")
        .setDescription(
          "Buyer Name-Realms Seperated by Commas (Ex-Thrall,Exx-Thrall)"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("gold")
        .setDescription(
          "Buyer Gold Amounts Seperated by Commas (10000000,2000000)"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription(
          "Buyer Descriptions Seperated by Commas (First Two,AOTC)"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("curatorcut")
        .setDescription("If curator gets a cut Seperated by Commas (yes,no)")
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "run") {
      const pendingRuns = await Run.find({
        status: { $not: new RegExp("Done") },
        type: "Raid",
      });
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
    const adminMessage = await findMessageInAdminChannel(
      runDB.settings.adminMessage,
      interaction
    );
    if (!adminMessage) {
      return;
    }
    let buyers = await formatBuyers(
      interaction.options.getString("buyers"),
      interaction.options.getString("gold"),
      interaction.options.getString("description"),
      interaction.options.getString("curatorcut"),
      interaction
    );
    if (!buyers) {
      return;
    }
    let messageEmbed = adminMessage.embeds[0];
    let buyerFields = messageEmbed.fields[0];
    for (let i = 0; i < buyers?.length; i++) {
      if (buyerFields.value === "None") {
        buyerFields.value = "";
      }
      buyerFields.value += `${buyerFields.value === "" ? "" : ", "}${
        buyers[i].name
      } : ${buyers[i].gold}k (${buyers[i].description})`;
    }
    messageEmbed.fields[0] = buyerFields;
    runDB.settings.buyers = [...runDB.settings.buyers, ...buyers];
    runDB.markModified("settings");
    runDB.gold = runDB.gold + buyers?.reduce((t, c) => t + c.gold, 0);
    runDB.save();
    let newEmbed = EmbedBuilder.from(messageEmbed).setTitle(
      `Raid Sale (${runDB.gold}k)`
    );
    await adminMessage.edit({
      embeds: [newEmbed],
    });
    sendCommandConfirmation(
      interaction.user,
      `Adding buyers ${buyers.reduce(
        (t, b, i) => t + `${i === 0 ? "" : ", "}${b.name} for ${b.gold}k`,
        ""
      )}`
    );
  },
};
