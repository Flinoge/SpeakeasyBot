import {
  sendCommandError,
  runToMessage,
  mentionToId,
} from "../utils/methods.js";

export default {
  data: { name: "Raid" },
  async execute(reaction, user, run, add) {
    console.log("Inside Raid Reaction");
    const message = await runToMessage(run, reaction);
    if (!message) {
      return;
    }
    let messageEmbed = message.embeds[0];
    let field = messageEmbed.fields.find(
      (f) => f.name.toLowerCase() === reaction.emoji.name.toLowerCase()
    );
    if (!field) {
      sendCommandError(
        reaction.user,
        "Somehow got an incorrect field tracked."
      );
      return;
    }
    if (field.value === "None") {
      field.value = "";
    } else {
      field.value = ", ";
    }
    const index = run.participants.indexOf(user.id);
    if (add) {
      field.value += user.toString();
      if (index === -1) {
        run.participants.push(user.id);
      }
    } else {
      field.value = field.value.replace(`, ${user.toString()}`, "");
      if (index !== -1) {
        run.participants.splice(index, 1);
      }
    }
    if (field.value === "") {
      field.value = "None";
    }
    run.save();
    message.edit({ embeds: [messageEmbed] });
  },
};
