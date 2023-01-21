import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import User from "../models/user.js";
import { security } from "../utils/constants.js";
import {
  sendPaymentUpdate,
  sendCommandConfirmation,
  modifyBank,
} from "../utils/methods.js";
import Transaction from "../models/transaction.js";
import Bank from "../models/bank.js";
import { availableServers, sendCommandError } from "../utils/methods.js";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("payout")
    .setDescription("Payout gold to a user.")
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("User to payout")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("server")
        .setDescription("The Server the Gold is Located")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("gold")
        .setDescription("The amount of gold payed out.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits[security.permissions.admin]
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "user") {
      const users = await User.find({
        balance: { $gt: 0 },
        "settings.username": { $regex: `.*${focusedValue}.*` },
      })
        .limit(10)
        .sort({ "settings.username": 1 });
      let choices = users.map((u) => ({
        name: `${u.settings.username}`,
        value: u.id,
      }));
      await interaction.respond(choices);
    } else if (focusedOption.name === "server") {
      let banks = await Bank.find({
        server: { $regex: `.*${focusedValue}.*` },
      });
      let servers = banks.map((b) => ({ name: b.server, value: b.server }));
      await interaction.respond(servers);
    }
  },
  async execute(interaction) {
    const user = interaction.options.getString("user");
    let gold = interaction.options.getNumber("gold");
    gold = gold / 1000.0;
    let server = interaction.options.getString("server");
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
    const dbUser = await User.findOne({ id: user });
    if (!dbUser) {
      sendCommandError(
        interaction.user,
        "User specified does not exist in system."
      );
      return;
    }
    dbUser.balance = dbUser.balance - gold;
    let transaction = {
      user: dbUser.id,
      amount: gold * -1,
      server,
      settings: {
        description: "Payout Command",
      },
      createdBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
      updatedBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
    };
    await Transaction.create(transaction);
    let bankModified = await modifyBank(server, gold * -1);
    if (!bankModified) {
      return;
    }
    dbUser.save();
    sendPaymentUpdate(dbUser, gold * -1);
    sendCommandConfirmation(
      interaction.user,
      `Payment to ${dbUser.settings.username} for ${gold}k`
    );
  },
};
