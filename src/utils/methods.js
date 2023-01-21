import { EmbedBuilder, PermissionsBitField } from "discord.js";
import client from "../discord.js";
import { security } from "./constants.js";
import Bank from "../models/bank.js";
import User from "../models/user.js";

export function mentionToId(mention) {
  return mention.replace("<", "").replace(">", "").replace("@", "");
}

export function idToMention(id) {
  return `<@${id}>`;
}

export function hasPermission(interaction, permission) {
  // Checks for permission or admin
  return (
    interaction.member.permissions.has([
      PermissionsBitField.Flags[permission],
    ]) ||
    interaction.member.permissions.has([
      PermissionsBitField.Flags[security.permissions.admin],
    ])
  );
}

export function hasRole(interaction, role) {
  // Checks for a role or admin
  return (
    interaction.member.roles.cache.some((r) => r.name === role) ||
    interaction.member.permissions.has([
      PermissionsBitField.Flags[security.permissions.admin],
    ])
  );
}

export async function sendBalanceUpdate(user, runDB, cut) {
  const messageEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Payment Notification")
    .setDescription(`Your new balance is: ${user.balance}k.`)
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL(),
    })
    .setThumbnail(client.user.avatarURL())
    .addFields({
      name: `${runDB.type}`,
      value: `${cut}k cuts`,
    })
    .setTimestamp()
    .setFooter({
      text: "Thank you for all you do!",
      iconURL: client.user.avatarURL(),
    });
  client.users.send(user.id, { embeds: [messageEmbed] });
}

export async function sendPaymentUpdate(user, gold) {
  const messageEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Balance Notification")
    .setDescription(`Your new balance is: ${user.balance}k.`)
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL(),
    })
    .setThumbnail(client.user.avatarURL())
    .addFields({
      name: `Balance Change`,
      value: `Balance changed by: ${gold}k.`,
    })
    .setTimestamp()
    .setFooter({
      text: "Thank you for all you do! If there is an issue with this, please contact an administrator.",
      iconURL: client.user.avatarURL(),
    });
  client.users.send(user.id, { embeds: [messageEmbed] });
}

export async function sendCommandConfirmation(user, command) {
  const messageEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Command Completion Notification")
    .setDescription(`Command: ${command} has been completed.`)
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL(),
    })
    .setThumbnail(client.user.avatarURL())
    .setTimestamp()
    .setFooter({
      text: "Done and Done",
      iconURL: client.user.avatarURL(),
    });
  client.users.send(user.id, { embeds: [messageEmbed] });
}

export async function sendCommandError(user, error) {
  const messageEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Command Error Notification")
    .setDescription(`Command: ${error}.`)
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL(),
    })
    .setThumbnail(client.user.avatarURL())
    .setTimestamp()
    .setFooter({
      text: "Big Oof",
      iconURL: client.user.avatarURL(),
    });
  client.users.send(user.id, { embeds: [messageEmbed] });
}

export async function availableServers() {
  let banks = await Bank.find({});
  return banks.map((b) => ({ server: b.server, amount: b.amount }));
}

export async function modifyBank(server, gold) {
  let bank = await Bank.findOne({ server });
  if (!bank) {
    sendCommandError(
      interaction.user,
      "Bank specified does not exist in system."
    );
    return false;
  }
  bank.amount = bank.amount + gold;
  bank.save();
  return true;
}

export async function checkMember(user) {
  const userDB = await User.findOne({ id: user.id });
  if (!userDB) {
    const newUser = await User.create({
      id: user.id,
      balance: 0,
      settings: {
        username: user.username,
        avatarURL: user.avatarURL(),
      },
      createdBy: {
        username: user.username,
        id: user.id,
      },
      updatedBy: {
        username: user.username,
        id: user.id,
      },
    });
    return newUser;
  }
}
