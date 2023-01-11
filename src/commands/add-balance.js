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
    .setName("add-balance")
    .setDescription("Payout gold to a user.")
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("User to add Balance to")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("gold")
        .setDescription("The amount of gold to be added.")
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
    const gold = interaction.options.getNumber("gold");
    const server = interaction.options.getNumber("server");
    let servers = await availableServers();
    let serverIndex = servers.find((s) => s.server === server);
    if (!serverIndex) {
      sendCommandError(
        interaction.user,
        "Server specified is not among available servers."
      );
      return;
    }
    const dbUser = await User.find({ id: user });
    dbUser.balance = dbUser.balance - gold;
    dbUser.save();
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
    await modifyBank(server, gold * -1);
    sendPaymentUpdate(dbUser, gold);
    sendCommandConfirmation(
      interaction.user,
      `Payment to ${dbUser.settings.username} for ${gold}k`
    );
  },
};
