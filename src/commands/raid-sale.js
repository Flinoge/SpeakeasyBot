import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import Run from "../models/run.js";
import Bank from "../models/bank.js";
import {
  availableServers,
  sendCommandError,
  mentionToId,
} from "../utils/methods.js";
import { security } from "../utils/constants.js";
import moment from "moment";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("raid-sale")
    .setDescription("Create a Raid Sale")
    .addStringOption((option) =>
      option
        .setName("server")
        .setDescription("The Server the Raid Will Be Located")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription(
          "Date of Sale in EST (YYYY-MM-DD hh:mm, 2022-01-25 8:30)"
        )
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("buyers")
        .setDescription(
          "Buyer Name-Realms Seperated by Commas (Ex-Thrall,Exx-Thrall)"
        )
    )
    .addStringOption((option) =>
      option
        .setName("gold")
        .setDescription(
          "Buyer Gold Amounts Seperated by Commas (10000000,2000000)"
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits[security.permissions.admin]
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "server") {
      let banks = await Bank.find({
        server: { $regex: `.*${focusedValue}.*` },
      });
      let servers = banks.map((b) => ({ name: b.server, value: b.server }));
      await interaction.respond(servers);
    } else if (focusedOption.name === "date") {
      const date = moment(focusedValue, "YYYY-MM-DD hh:mm");
      const formattedDate = date.format("YYYY-MM-DD hh:mm");
      if (date.isValid()) {
        await interaction.respond([
          { name: `${formattedDate}`, value: formattedDate },
        ]);
      } else {
        const date = moment();
        const formattedDate = date.format("YYYY-MM-DD hh:mm");
        await interaction.respond([
          { name: `${formattedDate}`, value: formattedDate },
        ]);
      }
    }
  },
  async execute(interaction) {
    let server = interaction.options.getString("server");
    const date = interaction.options.getString("date");
    let buyers = interaction.options.getString("buyers")?.replace(/\s+/g, "");
    let gold = interaction.options.getString("gold")?.replace(/\s+/g, "");
    let servers = await availableServers();
    let serverIndex = servers.find(
      (s) => s.server.toLowerCase() === server.toLowerCase()
    );
    if (!serverIndex) {
      sendCommandError(
        interaction.user,
        "Server specified is not among available servers."
      );
      return;
    } else {
      server = serverIndex.server;
    }
    const checkDate = moment(date, "YYYY-MM-DD hh:mm");
    if (!checkDate.isValid()) {
      sendCommandError(
        interaction.user,
        "Date provided is not a valid date (YYYY-MM-DD hh:mm)."
      );
      return;
    }
    buyers = buyers?.split(",");
    gold = gold?.split(",");
    if (buyers?.length !== gold?.length) {
      sendCommandError(
        interaction.user,
        "Buyers + Gold must contain same amount of comma separated values."
      );
      return;
    }
    let messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Raid Sale")
      .setDescription(`Run at: ${date} EST`)
      .setAuthor({
        name: interaction.member.user.tag,
        iconURL: interaction.member.user.avatarURL(),
      })
      .setThumbnail(interaction.member.user.avatarURL())
      .setTimestamp()
      .setFooter({
        text: "React to signup for this sale.",
        iconURL: interaction.member.user.avatarURL(),
      });
    const fields = [
      { name: "Current Signups", value: "\u200B" },
      { name: "Tank", value: "None", inline: true },
      { name: "Healer", value: "None", inline: true },
      { name: "DPS", value: "None", inline: true },
      // { name: "Buyers", value: "None" },
    ];
    for (let i = 0; i < buyers?.length; i++) {
      if (buyers[i] !== "" && gold[i] !== "") {
        if (isNaN(gold[i]) && isNaN(parseFloat(gold[i]))) {
          sendCommandError(
            interaction.user,
            "Gold must contain numeric values."
          );
          return;
        }
        if (buyers[i].split("-").length !== 2) {
          sendCommandError(
            interaction.user,
            "Buyers must be format Name-Realm."
          );
          return;
        }
        // Not sure if we want to display this honestly
        // fields[1].value += `${i === 0 ? "" : ", "}${buyers[i]}:${
        //   Number(gold[i]) / 1000.0
        // }k`;
      }
    }
    messageEmbed.addFields(fields);
    const raiderRole = await interaction.guild.roles.cache.find(
      (role) => role.name === "Raider"
    );
    if (!raiderRole) {
      sendCommandError(
        interaction.user,
        '"Raider" role does not exist on the server.'
      );
      return;
    }
    const dps = interaction.guild.emojis.cache.find(
      (emoji) => emoji.name === "dps"
    );
    const healer = interaction.guild.emojis.cache.find(
      (emoji) => emoji.name === "healer"
    );
    const tank = interaction.guild.emojis.cache.find(
      (emoji) => emoji.name === "tank"
    );
    if (!dps || !healer || !tank) {
      sendCommandError(
        interaction.user,
        "One or more emojis do not existin server."
      );
      return;
    }
    let message = await interaction.channel.send({
      content: `<@&${raiderRole.id}>`,
      embeds: [messageEmbed],
    });
    let settings = { date, buyers: [] };
    if (buyers) {
      settings.buyers = buyers.map((b, index) => ({
        name: b,
        gold: gold[index] / 1000.0,
      }));
    }
    let participants = [];
    let totalGold = 0;
    if (gold) {
      totalGold = gold.reduce((t, c) => t + Number(c) / 1000.0, 0);
    }
    await Run.create({
      type: "Raid",
      gold: totalGold,
      server,
      participants,
      messageId: message.id,
      settings,
      createdBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
      updatedBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
    });
  },
};
