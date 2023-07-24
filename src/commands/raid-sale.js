import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import Run from "../models/run.js";
import Bank from "../models/bank.js";
import {
  availableServers,
  sendCommandError,
  getChannelById,
  formatBuyers,
} from "../utils/methods.js";
import { security } from "../utils/constants.js";
import moment from "moment";
import config from "../config.js";

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
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription(
          "Buyer Descriptions Seperated by Commas (First Two,AOTC)"
        )
    )
    .addStringOption((option) =>
      option
        .setName("curatorcut")
        .setDescription("If curator gets a cut Seperated by Commas (yes,no)")
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
    let buyers = await formatBuyers(
      interaction.options.getString("buyers"),
      interaction.options.getString("gold"),
      interaction.options.getString("description"),
      interaction.options.getString("curatorcut"),
      interaction
    );
    if (!buyers && interaction.options.getString("buyers")) {
      return;
    }
    let messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Raid Sale")
      .setDescription(`Run at: ${date} EST`)
      .setAuthor({
        name: interaction.member.user.username,
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
    ];
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
    const channel = await getChannelById(config.admin_channel, interaction);
    if (!channel) {
      return;
    }
    const buyerFields = { name: "Buyers", value: "None" };
    for (let i = 0; i < buyers?.length; i++) {
      if (buyerFields.value === "None") {
        buyerFields.value = "";
      }
      buyerFields.value += `${buyerFields.value === "" ? "" : ", "}${
        buyers[i].name
      }:${buyers[i].gold}k`;
    }
    let adminMessageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Raid Sale")
      .setDescription(`Run at: ${date} EST`)
      .setAuthor({
        name: interaction.member.user.username,
        iconURL: interaction.member.user.avatarURL(),
      })
      .setThumbnail(interaction.member.user.avatarURL())
      .setTimestamp()
      .setFooter({
        text: "Use this to track buyers.",
        iconURL: interaction.member.user.avatarURL(),
      });
    adminMessageEmbed.addFields([buyerFields]);
    const adminMessage = await channel.send({
      content: `${interaction.user.toString()} Raid is currently being signed up for. ${
        message.url
      }`,
      embeds: [adminMessageEmbed],
    });
    let settings = { date, buyers: [], adminMessage: adminMessage.id };
    if (buyers?.length > 0) {
      settings.buyers = buyers;
    }
    let participants = [];
    let totalGold = 0;
    if (buyers?.length > 0) {
      totalGold = buyers.reduce((t, c) => t + c.gold, 0);
    }
    await Run.create({
      type: "Raid",
      gold: totalGold,
      server,
      participants,
      messageId: message.id,
      channelId: message.channel.id,
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
    if (!dps || !healer || !tank) {
      sendCommandError(
        interaction.user,
        "One or more emojis do not exist specified does not exist in system."
      );
      return;
    }
    try {
      await message.react(tank);
      await message.react(healer);
      await message.react(dps);
      await message.react(havekey);
    } catch (e) {
      console.log("Error Reacting on message.");
    }
  },
};
