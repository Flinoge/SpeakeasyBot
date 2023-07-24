import { EmbedBuilder, PermissionsBitField } from "discord.js";
import client from "../discord.js";
import { security } from "./constants.js";
import Bank from "../models/bank.js";
import User from "../models/user.js";
import Run from "../models/run.js";
import config from "../config.js";

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
      name: client.user?.username,
      iconURL: client.user?.avatarURL() || "",
    })
    .setThumbnail(client.user.avatarURL() || "")
    .addFields({
      name: `${runDB.type}`,
      value: `${cut}k cuts`,
    })
    .setTimestamp()
    .setFooter({
      text: "Thank you for all you do!",
      iconURL: client.user.avatarURL() || "",
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
      iconURL: client.user.avatarURL() || "",
    })
    .setThumbnail(client.user.avatarURL() || "")
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
      iconURL: client.user.avatarURL() || "",
    })
    .setThumbnail(client.user.avatarURL() || "")
    .setTimestamp()
    .setFooter({
      text: "Done and Done",
      iconURL: client.user.avatarURL() || "",
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
      iconURL: client.user.avatarURL() || "",
    })
    .setThumbnail(client.user.avatarURL() || "")
    .setTimestamp()
    .setFooter({
      text: "Big Oof",
      iconURL: client.user.avatarURL() || "",
    });
  client.users.send(user.id, { embeds: [messageEmbed] });
}

export async function availableServers() {
  let banks = await Bank.find({});
  return banks.map((b) => ({ server: b.server, amount: b.amount }));
}

export async function modifyBank(server, gold, interaction) {
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
        avatarURL: user.avatarURL() || "",
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

export async function findMessageInChannel(messageId, channel) {
  const message = await channel.messages.fetch(messageId);
  if (!message) {
    return null;
  }
  return message;
}

export async function findMessageInAdminChannel(messageId, interaction) {
  const channel = client.channels.cache.get(config.admin_channel);
  if (!channel) {
    sendCommandError(
      interaction.user,
      "Channel specified does not exist in discord."
    );
    return null;
  }
  const message = await channel.messages.fetch(messageId);
  if (!message) {
    sendCommandError(
      interaction.user,
      "Message specified does not exist in discord/channel."
    );
    return null;
  }
  return message;
}

export async function getChannelById(channelId, interaction) {
  const channel = await client.channels.cache.get(channelId);
  if (!channel) {
    sendCommandError(
      interaction.user,
      "Channel specified does not exist in discord."
    );
    return null;
  }
  return channel;
}

export async function runToMessage(run, interaction) {
  const channel = await getChannelById(run.channelId, interaction);
  if (!channel) {
    sendCommandError(
      interaction.user,
      "Channel specified does not exist in discord."
    );
    return null;
  }
  const message = await findMessageInChannel(run.messageId, channel);
  if (!message) {
    sendCommandError(
      interaction.user,
      "Message specified does not exist in discord/channel."
    );
    return null;
  }
  return message;
}

export async function messageToRun(messageId, interaction) {
  const runDB = await Run.findOne({ messageId });
  if (!runDB) {
    sendCommandError(
      interaction.user,
      "Run specified does not exist in system."
    );
    return null;
  }
  const message = await runToMessage(runDB, interaction);
  if (!message) return null;
  return { message, runDB };
}

export async function formatBuyers(
  buyers,
  gold,
  description,
  curatorcut,
  interaction
) {
  buyers = buyers?.replace(/\s+/g, "").split(",");
  gold = gold?.replace(/\s+/g, "").split(",");
  description = description?.split(",");
  curatorcut = curatorcut?.replace(/\s+/g, "").split(",");
  if (buyers?.length !== gold?.length) {
    sendCommandError(
      interaction.user,
      "Buyers + Gold must contain same amount of comma separated values."
    );
    return null;
  }
  if (buyers?.length !== description?.length) {
    sendCommandError(
      interaction.user,
      "Buyers + Gold + Description + CuratorCut must contain same amount of comma separated values."
    );
    return null;
  }
  if (buyers?.length !== curatorcut?.length) {
    sendCommandError(
      interaction.user,
      "Buyers + Gold + Description + CuratorCut must contain same amount of comma separated values."
    );
    return null;
  }
  for (let i = 0; i < buyers?.length; i++) {
    if (buyers[i] !== "" && gold[i] !== "") {
      if (isNaN(gold[i]) && isNaN(parseFloat(gold[i]))) {
        sendCommandError(interaction.user, "Gold must contain numeric values.");
        return null;
      }
      if (buyers[i].split("-").length !== 2) {
        sendCommandError(interaction.user, "Buyers must be format Name-Realm.");
        return null;
      }
    }
    curatorcut[i] = curatorcut[i].toLowerCase();
    if (curatorcut !== "no" && curatorcut !== "yes") {
      sendCommandError(
        interaction.user,
        'CuratorCut must either be "yes" or "no".'
      );
      return null;
    }
  }
  let newBuyers;
  if (buyers) {
    newBuyers = buyers.map((b, index) => ({
      name: b,
      gold: Number(gold[index]) / 1000.0,
      description: description[index],
      curatorcut: curatorcut[index],
      curator: interaction.user.id,
    }));
  }
  return newBuyers;
}
