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
  sendCommandError,
} from "../utils/methods.js";
import Transaction from "../models/transaction.js";

export default {
  permission: "admin",
  data: new SlashCommandBuilder()
    .setName("deduct-balance")
    .setDescription("Deduct Balance from User (NOT USED FOR PAYMENT).")
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("User to Deduct")
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
        "settings.username": { $regex: `.*${focusedValue}.*` },
      })
        .limit(10)
        .sort({ "settings.username": 1 });
      let choices = users.map((u) => ({
        name: `${u.settings.username}`,
        value: u.id,
      }));
      await interaction.respond(choices);
    }
  },
  async execute(interaction) {
    const user = interaction.options.getString("user");
    const gold = interaction.options.getNumber("gold");
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
      settings: {
        description: "Deduct-Balance Command",
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
    dbUser.save();
    sendPaymentUpdate(dbUser, gold);
    sendCommandConfirmation(
      interaction.user,
      `Deducted ${dbUser.settings.username} for ${gold}k`
    );
  },
};
