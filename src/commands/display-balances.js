import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import User from "../models/user.js";
import { security } from "../utils/constants.js";
import client from "../discord.js";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("display-balances")
    .setDescription("Display Users with a Balance.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits[security.permissions.admin]
    ),
  async execute(interaction) {
    let totalUsers = await User.find({ balance: { $gt: 0 } });
    totalUsers = totalUsers.length;
    if (totalUsers === 0) {
      const messageEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("No Active Balances :D")
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.avatarURL(),
        })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()
        .setFooter({
          text: `All caught up, good job!`,
          iconURL: client.user.avatarURL(),
        });
      await interaction.channel.send({
        embeds: [messageEmbed],
      });
    }
    for (let i = 0; i < totalUsers / 25; i++) {
      const activeUsers = await User.find({ balance: { $gt: 0 } })
        .limit(25)
        .skip(i);
      const messageEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Active Balances")
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.avatarURL(),
        })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()
        .setFooter({
          text: `${
            activeUsers.length > 0
              ? `Someone is slacking Madge.`
              : `All caught up, good job!`
          }`,
          iconURL: client.user.avatarURL(),
        });
      messageEmbed.data.fields = activeUsers.map((u) => ({
        name: u.settings.username,
        value: `${u.balance}k`,
        inline: true,
      }));
      await interaction.channel.send({
        embeds: [messageEmbed],
      });
    }
  },
};
