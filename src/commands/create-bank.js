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
} from "../utils/methods.js";
import Transaction from "../models/transaction.js";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("create-bank")
    .setDescription("Create a Bank on a Server")
    .addStringOption((option) =>
      option
        .setName("server")
        .setDescription("The Server the Bank is on.")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("gold")
        .setDescription("The amount of gold in the bank.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits[security.permissions.admin]
    ),
  async execute(interaction) {
    const server = interaction.options.getString("server");
    const gold = interaction.options.getNumber("gold");
    const bank = {
      server,
      amount: gold,
      createdBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
      updatedBy: {
        username: interaction.user.username,
        id: interaction.user.id,
      },
    };
    await Bank.create(bank);
    let transaction = {
      amount: gold,
      server,
      settings: {
        description: `Bank created on ${server} with ${gold}k`,
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
    sendCommandConfirmation(
      interaction.user,
      `Bank created on ${server} with ${gold}k`
    );
  },
};
