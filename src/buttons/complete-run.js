import Run from "../models/run.js";
import Transaction from "../models/transaction.js";
import User from "../models/user.js";
import { security, cuts } from "../utils/constants.js";
import {
  hasPermission,
  sendBalanceUpdate,
  modifyBank,
  sendCommandError,
  checkMember,
} from "../utils/methods.js";

export default {
  data: { name: "complete-run", permission: "admin", role: "curator" },
  async execute(interaction) {
    const message = await interaction.message;
    const content = message.content.split("/");
    let run = await interaction.guild.channels.fetch(content[5]);
    run = await run.messages.fetch(content[6]);
    const runDB = await Run.findOne({
      messageId: run.id,
    });
    if (!runDB) {
      sendCommandError(
        interaction.user,
        "Run specified does not exist in system."
      );
      return;
    }
    // Mark as Running
    await message.edit({
      content: `This run is being approved by ${interaction.user.username}. ${run.url}`,
      components: [],
    });
    if (!hasPermission(interaction, security.permissions.admin)) {
      // Check to see if they are a curator that owns the run
      if (!interaction.user.id === runDB.createdBy.id) {
        // User is not an admin and not owner of the run
        return;
      }
    }
    const users = runDB.participants.map((p) => p.id);
    const dbUsers = await User.find({ id: { $in: users } });
    let transactions = [];
    let saveUsers = [];
    for (let i = 0; i < users.length; i++) {
      let dbUser = dbUsers.find((u) => u.id === users[i]);
      let user = runDB.participants.find((p) => p.id === dbUser.id);
      dbUser.balance = dbUser.balance + user.cut;
      let transaction = {
        user: dbUser.id,
        amount: user.cut,
        server: runDB.server,
        run: runDB._id,
        settings: {
          description: "Completed Run Balance Update",
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
      saveUsers.push(dbUser);
      transactions.push(transaction);
    }
    // Make sure it doesnt get ran 2 times
    const doubleCheck = await Run.findOne({
      messageId: run.id,
    });
    if (doubleCheck.status === "Done") {
      sendCommandError(
        interaction.user,
        "Complete run command has attempted to ran twice."
      );
      return;
    }
    let bankModified = await modifyBank(runDB.server, runDB.gold, interaction);
    if (!bankModified) {
      return;
    }
    runDB.status = "Done";
    await runDB.save();
    // Once all is ran, save 1 time.
    for (let i = 0; i < transactions.length; i++) {
      await Transaction.create(transactions[i]);
    }
    for (let i = 0; i < saveUsers.length; i++) {
      await saveUsers[i].save();
      let user = runDB.participants.find((p) => p.id === saveUsers[i].id);
      sendBalanceUpdate(saveUsers[i], runDB, user.cut);
    }
    if (runDB.settings.curatorcut === "yes") {
      let curator = await User.findOne({ id: runDB.createdBy.id });
      if (!curator) {
        curator = await checkMember(interaction.user);
      }
      let curatorCut = runDB.gold * cuts[runDB.type].curator;
      curator.balance = curator.balance + curatorCut;
      await curator.save();
      sendBalanceUpdate(curator, runDB, curatorCut);
    }
    message.edit({
      content: `This run has been marked as approved by ${interaction.user.username}. ${run.url}`,
      components: [],
    });
  },
};
