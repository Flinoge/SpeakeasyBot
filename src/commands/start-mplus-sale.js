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
import { mentionToId } from "../utils/methods.js";
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
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;
    if (focusedOption.name === "run") {
      const pendingRuns = await Run.find({ status: "Pending" });
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
        const otherRoles = [];
        let role = JSON.parse(JSON.stringify(focusedOption.name));
        if (role === "dps1" || role === "dps2") role = "dps";
        const reaction = await run.reactions.cache.find(
          (r) => r.emoji.name === role
        );
        let reactedUsers = await reaction.users.fetch();
        // TODO Uncomment once testing for more than 1 user
        // const otherRoles = [
        //   interaction.options.getString("tank"),
        //   interaction.options.getString("healer"),
        //   interaction.options.getString("dps1"),
        //   interaction.options.getString("dps2"),
        // ];
        // if (role.name === "havekey") {
        //   reactedUsers = reactedUsers.filter(
        //     (user) => otherRoles.indexOf(user.id) !== -1
        //   );
        // }
        const users = await Promise.all(
          reactedUsers
            .filter(
              (u) =>
                !u.bot &&
                (otherRoles.indexOf(u.tag) === -1 || role.name === "havekey")
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
        const filtered = users.filter(
          (u) => u.name.indexOf(focusedValue) !== -1
        );
        await interaction.respond(filtered);
      }
    }
  },
  async execute(interaction) {
    const run = await interaction.channel.messages.fetch(
      interaction.options.getString("run")
    );
    const runDB = await Run.findOne({
      messageId: interaction.options.getString("run"),
    });
    if (run && runDB) {
      await run.reactions.removeAll();
      const tank = interaction.options.getString("tank");
      const healer = interaction.options.getString("healer");
      const dps1 = interaction.options.getString("dps1");
      const dps2 = interaction.options.getString("dps2");
      const keyholder = interaction.options.getString("havekey");
      const possibleReactors = [tank, healer, dps1, dps2];
      let messageEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("M+ Sale")
        .setAuthor({
          name: interaction.member.user.tag,
          iconURL: interaction.member.user.avatarURL(),
        })
        .setThumbnail(interaction.member.user.avatarURL())
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
          { name: "DPS", value: `${dps2}`, inline: true },
          { name: "Key Holder", value: `${keyholder}`, inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: "React when run is done.",
          iconURL: interaction.member.user.avatarURL(),
        });
      await run.edit({
        embeds: [messageEmbed],
      });
      try {
        runDB.status = "Started";
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
        await runDB.save();
        await run.react("✅");
        const filter = (reaction, user) => {
          return (
            ["✅"].includes(reaction.emoji.name) &&
            possibleReactors.indexOf(user.toString()) !== -1
          );
        };
        run
          .awaitReactions({ filter, max: 1, time: 5400000, errors: ["time"] })
          .then(async (collected) => {
            const reaction = collected.first();
            console.log(reaction);

            if (reaction.emoji.name === "✅") {
              messageEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle("M+ Sale")
                .setAuthor({
                  name: interaction.member.user.tag,
                  iconURL: interaction.member.user.avatarURL(),
                })
                .setThumbnail(interaction.member.user.avatarURL())
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
                  iconURL: interaction.member.user.avatarURL(),
                });
              await run.edit({
                embeds: [messageEmbed],
              });
              runDB.status = "Awaiting Approval";
              await runDB.save();
              const channel = Client.channels.cache.get(config.admin_channel);
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
                content: `There is a run waiting approval. ${run.url}`,
                components: [row, row2],
              });
            }
          })
          .catch((collected) => {
            const channel = Client.channels.cache.get(config.admin_channel);
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
              content: `There is a run that has been going for 1.5 Hours and isn't completed. ${run.url}`,
              components: [row, row2],
            });
          });
      } catch (e) {
        console.log(e);
        console.log("Error Reacting on message.");
      }
    } else {
      await interaction.reply({
        content:
          "The run you chose does not exist or the message has been deleted.",
        ephemeral: true,
      });
    }
  },
};

const checkMember = async (user) => {
  const userDB = await User.findOne({ id: user.id });
  if (!userDB) {
    await User.create({
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
  }
};
