import { Events } from "discord.js";
import { trackedEmojis } from "../utils/constants";
import client from "../discord.js";

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (!reaction.me) {
      // Make sure its not the bot
      if (trackedEmojis.indexOf(reaction.emoji.name) !== -1) {
        // Make sure its only reactions we care about
        let trackedRun = await Run.findOne({
          messageId: reaction.message.id,
        });
        if (trackedRun) {
          // Make sure the message is a run that is tracked
          const reactionReact = client.reactions.get(trackedRun.type);

          if (!reactionReact) {
            console.error(`No reaction matching ${trackedRun.type} was found.`);
            return;
          }

          try {
            await reactionReact.execute(reaction, user, trackedRun, true);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
  },
};
