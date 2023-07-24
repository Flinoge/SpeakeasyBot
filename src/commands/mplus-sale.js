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
        .setName("buyer")
        .setDescription("The buyer (For logging only).")
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
      option
        .setName("curatorcut")
        .setDescription("Wether or not Curator gets a cut (yes/no).")
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option.setName("key").setDescription("The key of the M+ Sale")
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
    } else if (focusedOption.name === "curatorcut") {
      await interaction.respond([
        { name: "Yes", value: "yes" },
        { name: "No", value: "no" },
      ]);
    }
  },
  async execute(interaction) {
    let curatorcut = interaction.options.getString("curatorcut");
    if (!curatorcut) {
      curatorcut = "yes";
    } else {
      curatorcut = curatorcut.toLowerCase();
    }
    if (curatorcut !== "no" && curatorcut !== "yes") {
      sendCommandError(
        interaction.user,
        'CuratorCut must either be "yes" or "no".'
      );
      return;
    }
    let gold = interaction.options.getNumber("gold");
    gold = gold / 1000.0;
    const boosterCuts =
      curatorcut === "yes" ? (gold * cuts["M+"].booster) / 4 : gold / 4;
    let server = interaction.options.getString("server");
    const buyer = interaction.options.getString("buyer");
    const availability = interaction.options.getString("availability");
    const level = interaction.options.getNumber("level");
    const key = interaction.options.getString("key") || false;
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
      serverIndex.amount = serverIndex.amount + gold;
    }
    const messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("M+ Sale")
      .setAuthor({
        name: interaction.member?.user?.tag,
        iconURL: interaction.member?.user?.avatarURL(),
      })
      .setThumbnail(interaction.member?.user?.avatarURL())
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
    const mPlusRole = await interaction.guild.roles.cache.find(
      (role) => role.name === "M+ sales"
    );
    if (!mPlusRole) {
      sendCommandError(
        interaction.user,
        '"M+ sales" role does not exist on the server.'
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
    const havekey = interaction.guild.emojis.cache.find(
      (emoji) => emoji.name === "havekey"
    );
    if (!dps || !healer || !tank || !havekey) {
      sendCommandError(
        interaction.user,
        "One or more emojis do not exist in server."
      );
      return;
    }
    let message = await interaction.channel.send({
      content: `<@&${mPlusRole.id}>`,
      embeds: [messageEmbed],
    });
    await Run.create({
      type: "M+",
      gold: gold,
      server,
      participants: [],
      messageId: message.id,
      channelId: message.channel.id,
      settings: {
        key,
        level,
        cuts: boosterCuts,
        availability,
        buyer,
        curatorcut,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
      updatedBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
    });
    if (!dps || !healer || !tank || !havekey) {
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
