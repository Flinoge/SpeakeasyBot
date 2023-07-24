import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import Run from "../models/run.js";
import User from "../models/user.js";
import moment from "moment";
import {
  mentionToId,
  checkMember,
  sendCommandError,
  getChannelById,
} from "../utils/methods.js";
import config from "../config.js";
import Client from "../discord.js";

export default {
  role: "curator",
  data: new SlashCommandBuilder()
    .setName("start-mplus-sale")
    .setDescription("Start a M+ Sale Run")
    .addStringOption((option) =>
      option
        .setName("run")
        .setDescription("Run to start")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tank")
        .setDescription("Select a Tank")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("healer")
        .setDescription("Select a Healer")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("dps1")
        .setDescription("Select a DPS")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("dps2")
        .setDescription("Select a DPS")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("havekey")
        .setDescription("Select a someone with a key")
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "run") {
      const pendingRuns = await Run.find({ status: "Pending", type: "M+" });
      let choices = pendingRuns.map((r) => ({
        name: `${r.type} (${moment(r.createdAt).format(`YYYY-M-D h:m`)})`,
        value: r.messageId,
      }));
      const filtered = choices.filter(
        (r) => r.name.indexOf(focusedValue) !== -1
      );
      await interaction.respond(
        filtered.map((r) => ({ name: r.name, value: r.value }))
      );
    } else {
      const run = await interaction.channel.messages.fetch(
        interaction.options.getString("run")
      );
      if (run) {
        let role = JSON.parse(JSON.stringify(focusedOption.name));
        if (role === "dps1" || role === "dps2") role = "dps";
        if (!run) {
          sendCommandError(
            interaction.user,
            "Message specified does not exist in system."
          );
          return;
        }
        const reaction = await run.reactions.cache.find(
          (r) => r.emoji.name === role
        );
        if (!reaction) {
          sendCommandError(
            interaction.user,
            "Emoji specified does not exist on server."
          );
          return;
        }
        let reactedUsers = await reaction.users.fetch();
        let otherRoles = [];
        if (config.env === "production") {
          otherRoles = [
            interaction.options.getString("tank"),
            interaction.options.getString("healer"),
            interaction.options.getString("dps1"),
            interaction.options.getString("dps2"),
          ];
          if (role === "havekey") {
            reactedUsers = reactedUsers.filter(
              (user) => otherRoles.indexOf(user.toString()) !== -1
            );
          }
        }
        const users = await Promise.all(
          reactedUsers
            .filter(
              (u) =>
                !u.bot &&
                (otherRoles.indexOf(u.toString()) === -1 || role === "havekey")
            )
            .map(async (user) => {
              let member = await interaction.guild.members.fetch(user.id);
              checkMember(user);
              return {
                name: member.displayName || user.username,
                value: user.toString(),
              };
            })
        );
        const filtered = focusedValue
          ? users.filter((u) => u.name.indexOf(focusedValue) !== -1)
          : users;
        await interaction.respond(filtered);
      }
    }
  },
  async execute(interaction) {
    const { runDB, message } = await messageToRun(
      interaction.options.getString("run"),
      interaction
    );
    if (!runDB || !message) {
      return;
    }
    const tank = interaction.options.getString("tank");
    const healer = interaction.options.getString("healer");
    const dps1 = interaction.options.getString("dps1");
    const dps2 = interaction.options.getString("dps2");
    const keyholder = interaction.options.getString("havekey");
    const possibleReactors = [tank, healer, dps1, dps2];
    let keyParticipants = [];
    if (config.env === "production") {
      keyParticipants = [mentionToId(tank)];
      if (keyParticipants.indexOf(mentionToId(healer)) === -1) {
        keyParticipants.push(mentionToId(healer));
      } else {
        sendCommandError(
          interaction.user,
          "One or more selected users are repeated in run."
        );
        return;
      }
      if (keyParticipants.indexOf(mentionToId(dps1)) === -1) {
        keyParticipants.push(mentionToId(dps1));
      } else {
        sendCommandError(
          interaction.user,
          "One or more selected users are repeated in run."
        );
        return;
      }
      if (keyParticipants.indexOf(mentionToId(dps2)) === -1) {
        keyParticipants.push(mentionToId(dps2));
      } else {
        sendCommandError(
          interaction.user,
          "One or more selected users are repeated in run."
        );
        return;
      }
    } else {
      keyParticipants = [
        mentionToId(tank),
        mentionToId(healer),
        mentionToId(dps1),
        mentionToId(dps2),
      ];
    }
    for (let i = 0; i < keyParticipants.length; i++) {
      const participant = await User.findOne({
        id: keyParticipants[i],
      });
      if (!participant) {
        sendCommandError(
          interaction.user,
          "One or more selected users do not exist in system."
        );
        return;
      }
    }
    let messageEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("M+ Sale")
      .setAuthor({
        name: interaction.member.user.tag,
        iconURL: interaction.member.user.avatarURL() || "",
      })
      .setThumbnail(interaction.member.user.avatarURL() || "")
      .addFields(
        {
          name: `${runDB.settings.key ? `${runDB.settings.key} ` : ""}+${
            runDB.settings.level
          } `,
          value: `${runDB.settings.cuts}k cuts`,
        },
        { name: "Run Time", value: `${runDB.settings.availability}` },
        { name: "\u200B", value: "\u200B" },
        { name: "Tank", value: `${tank}`, inline: true },
        { name: "Healer", value: `${healer}`, inline: true },
        { name: "DPS", value: `${dps1}`, inline: true },
        { name: "DPS", value: `${dps2}`, inline: true }
      )
      .setTimestamp()
      .setFooter({
        text: "React when run is done.",
        iconURL: interaction.member.user.avatarURL() || "",
      });
    if (keyholder) {
      messageEmbed.addFields({
        name: "Key Holder",
        value: `${keyholder}`,
        inline: true,
      });
    }
    await message.edit({
      content: `${tank}, ${healer}, ${dps1}, ${dps2}`,
      embeds: [messageEmbed],
    });
    try {
      runDB.participants = [
        {
          id: mentionToId(tank),
          cut: runDB.settings.cuts,
        },
        {
          id: mentionToId(healer),
          cut: runDB.settings.cuts,
        },
        {
          id: mentionToId(dps1),
          cut: runDB.settings.cuts,
        },
        {
          id: mentionToId(dps2),
          cut: runDB.settings.cuts,
        },
      ];
      runDB.status = "Started";
      await runDB.save();
      await message.reactions.removeAll();
      await message.react("✅");
      const filter = (reaction, user) => {
        return (
          ["✅"].includes(reaction.emoji.name) &&
          possibleReactors.indexOf(user.toString()) !== -1
        );
      };
      message
        .awaitReactions({ filter, max: 1, time: 5400000, errors: ["time"] })
        .then(async (collected) => {
          const reaction = collected.first();

          if (reaction.emoji.name === "✅") {
            messageEmbed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle("M+ Sale")
              .setAuthor({
                name: interaction.member.user.tag,
                iconURL: interaction.member.user.avatarURL() || "",
              })
              .setThumbnail(interaction.member.user.avatarURL() || "")
              .addFields(
                {
                  name: `${
                    runDB.settings.key ? `${runDB.settings.key} ` : ""
                  }+${runDB.settings.level} `,
                  value: `${runDB.settings.cuts}k cuts`,
                },
                {
                  name: "Run Completed Time",
                  value: `${moment().format("YYYY-M-D h:m")}`,
                },
                { name: "\u200B", value: "\u200B" },
                { name: "Tank", value: `${tank}`, inline: true },
                { name: "Healer", value: `${healer}`, inline: true },
                { name: "DPS", value: `${dps1}`, inline: true },
                { name: "DPS", value: `${dps2}`, inline: true },
                { name: "Key Holder", value: `${keyholder}`, inline: true }
              )
              .setTimestamp()
              .setFooter({
                text: `This has been marked done by ${interaction.member.user.tag} and is awaiting approval.`,
                iconURL: interaction.member.user.avatarURL() || "",
              });
            if (keyholder) {
              messageEmbed.addFields({
                name: "Key Holder",
                value: `${keyholder}`,
                inline: true,
              });
            }
            await message.edit({
              content: ``,
              embeds: [messageEmbed],
            });
            runDB.status = "Awaiting Approval";
            const channel = getChannelById(config.admin_channel, interaction);
            await runDB.save();
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("complete-run")
                .setLabel("Approve")
                .setStyle(ButtonStyle.Primary)
            );
            const row2 = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("complete-and-payout-run")
                .setLabel("Approve w/ Payouts")
                .setStyle(ButtonStyle.Primary)
            );
            channel.send({
              content: `${interaction.user.toString()} There is a run waiting approval. ${
                message.url
              }`,
              components: [row, row2],
            });
          }
        })
        .catch((collected) => {
          const channel = getChannelById(config.admin_channel, interaction);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("complete-run")
              .setLabel("Approve")
              .setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("complete-and-payout-run")
              .setLabel("Approve w/ Payouts")
              .setStyle(ButtonStyle.Primary)
          );
          channel.send({
            content: `${interaction.user.toString()} There is a run that has been going for 1.5 Hours and isn't completed. ${
              message.url
            }`,
            components: [row, row2],
          });
        });
    } catch (e) {
      console.log(e);
      console.log("Error Reacting on message.");
    }
  },
};
