import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import User from "../models/user.js";
import client from "../discord.js";
import { checkMember } from "../utils/methods.js";

export default {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Displays your balance."),
  async execute(interaction) {
    let user = await User.findOne({ id: interaction.user.id });
    // Check if user is in system.
    if (!user) {
      user = await checkMember(interaction.user);
    }
    const messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Active Balance")
      .setDescription(`${user.balance}k`)
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.avatarURL(),
      })
      .setThumbnail(client.user.avatarURL())
      .setTimestamp()
      .setFooter({
        text: `For help message an admin.`,
        iconURL: client.user.avatarURL(),
      });
    client.users.send(user.id, { embeds: [messageEmbed] });
  },
};
