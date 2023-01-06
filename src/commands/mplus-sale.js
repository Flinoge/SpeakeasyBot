import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Run from "../models/run.js";

export default {
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
        .setName("realm")
        .setDescription("The Realm Availability of Gold")
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
  async execute(interaction) {
    await interaction.deferReply();
    await interaction.deleteReply();
    const gold = interaction.options.getNumber("gold");
    const cuts = (gold * 0.9) / 4;
    const realm = interaction.options.getString("realm");
    const availability = interaction.options.getString("availability");
    const level = interaction.options.getNumber("level");
    const key = interaction.options.getString("key") || false;
    const messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("M+ Sale")
      .setAuthor({
        name: interaction.member.user.tag,
        iconURL: interaction.member.user.avatarURL(),
      })
      .setThumbnail(interaction.member.user.avatarURL())
      .addFields(
        { name: `${key ? `${key} ` : ""}+${level} `, value: `${cuts}k cuts` },
        { name: "\u200B", value: "\u200B" },
        { name: "Realm Availability", value: `${realm}`, inline: true },
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
      participants: [],
      messageId: message.id,
      settings: {
        key,
        level,
        cuts,
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
      await message.react(dps);
      await message.react(healer);
      await message.react(tank);
      await message.react(havekey);
    } catch (e) {
      console.log("Error Reacting on message.");
    }
  },
};
