import {
  sendCommandError,
  runToMessage,
  mentionToId,
} from "../utils/methods.js";
import Run from "../models/run.js";

export default {
  data: { name: "Raid" },
  async execute(reaction, user, dbrun, add) {
    let run = await Run.findOne({
      _id: dbrun._id,
    }).catch((e) => {
      console.log("Error getting tracked run.", e);
      return null;
    });
    const message = await runToMessage(run, reaction);
    if (!message) {
      console.log("Error getting message.");
      return;
    }
    let messageEmbed = message.embeds[0];
    console.log(messageEmbed);
    let field = messageEmbed?.fields.find(
      (f) => f.name.toLowerCase() === reaction.emoji.name.toLowerCase()
    );
    if (!field) {
      sendCommandError(
        reaction.user,
        "Somehow got an incorrect field tracked."
      );
      return;
    }
    const index = run.participants.findIndex((u) => u.id === user.id);
    if (add) {
      if (index !== -1) {
        // User is already part of the run
        return;
      }
      if (field.value === "None") {
        field.value = "";
      } else {
        field.value += ", ";
      }
      field.value += user.toString();
      if (index === -1) {
        run.participants.push({ id: user.id, cut: 0 });
      }
    } else {
      if (field.value.includes(`, ${user.toString()}`)) {
        field.value = field.value.replace(`, ${user.toString()}`, "");
      } else if (field.value.includes(`${user.toString()},`)) {
        field.value = field.value.replace(`${user.toString()},`, "");
      } else if (field.value.includes(`${user.toString()}`)) {
        field.value = field.value.replace(`${user.toString()}`, "");
      }
      if (index !== -1) {
        run.participants.splice(index, 1);
      } else {
        // User wasn't part of the run
        return;
      }
    }
    if (field.value === "") {
      field.value = "None";
    }
    await run.save();
    message.edit({ embeds: [messageEmbed] });
  },
};
