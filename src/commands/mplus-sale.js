import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Run from "../models/run.js";
import Bank from "../models/bank.js";
import { cuts } from "../utils/constants.js";
import { availableServers, sendCommandError } from "../utils/methods.js";

export default {
  role: "curator",
  data: new SlashCommandBuilder()
    .setName("mplus-sale")
    .setDescription("Create a M+ Sale Run")
    .addNumberOption((option) =>
      option
        .setName("gold")
        .setDescription("The Total Gold of Sale")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("server")
        .setDescription("The Server the Gold is Located")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("availability")
        .setDescription("The time when the run will be taking place.")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("level")
        .setDescription("The level of the M+ Sale")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("key").setDescription("The key of the M+ Sale (Optional)")
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
    }
  },
  async execute(interaction) {
    const gold = interaction.options.getNumber("gold");
    const boosterCuts = gold * cuts["M+"].booster;
    const server = interaction.options.getString("server");
    const availability = interaction.options.getString("availability");
    const level = interaction.options.getNumber("level");
    const key = interaction.options.getString("key") || false;
    let servers = await availableServers();
    let serverIndex = servers.find((s) => s.server === server);
    if (!serverIndex) {
      sendCommandError(
        interaction.user,
        "Server specified is not among available servers."
      );
      return;
    } else {
      serverIndex.amount = serverIndex.amount + gold;
    }
    const messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("M+ Sale")
      .setAuthor({
        name: interaction.member.user.tag,
        iconURL: interaction.member.user.avatarURL(),
      })
      .setThumbnail(interaction.member.user.avatarURL())
      .addFields(
        {
          name: `${key ? `${key} ` : ""}+${level} `,
          value: `${boosterCuts}k cuts`,
        },
        { name: "\u200B", value: "\u200B" },
        {
          name: "Realm Availability",
          value: `${servers
            .filter((s) => s.amount > boosterCuts)
            .reduce(
              (t, s, index) => `${t}${index > 0 ? ", " : ""}${s.server}`,
              ""
            )}`,
          inline: true,
        },
        { name: "Run Time", value: `${availability}`, inline: true }
      )
      .setTimestamp()
      .setFooter({
        text: "React with roles and if you have key.",
        iconURL: interaction.member.user.avatarURL(),
      });
    let message = await interaction.channel.send({
      embeds: [messageEmbed],
    });
    await Run.create({
      type: "M+",
      gold: gold,
      server,
      participants: [],
      messageId: message.id,
      settings: {
        key,
        level,
        cuts: boosterCuts,
        availability,
      },
      createdBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
      updatedBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
    });
    const dps = message.guild.emojis.cache.find(
      (emoji) => emoji.name === "dps"
    );
    const healer = message.guild.emojis.cache.find(
      (emoji) => emoji.name === "healer"
    );
    const tank = message.guild.emojis.cache.find(
      (emoji) => emoji.name === "tank"
    );
    const havekey = message.guild.emojis.cache.find(
      (emoji) => emoji.name === "havekey"
    );
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
