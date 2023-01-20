import Run from "../models/run.js";
import Transaction from "../models/transaction.js";
import User from "../models/user.js";
import { security, cuts } from "../utils/constants.js";
import { hasPermission } from "../utils/methods.js";

export default {
  data: {
    name: "complete-and-payout-run",
    permission: "admin",
    role: "curator",
  },
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
      content: `This run is being approved and paid out by ${interaction.user.tag}. ${run.url}`,
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
    for (let i = 0; i < users.length; i++) {
      let dbUser = dbUsers.find((u) => u.id === users[i]);
      let user = runDB.participants.find((p) => p.id === dbUser.id);
      const transaction1 = {
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
      transactions.push(transaction1);
      const transaction2 = {
        user: dbUser.id,
        amount: user.cut * -1,
        server: runDB.server,
        run: runDB._id,
        settings: {
          description: "Completed Run Payout",
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
      transactions.push(transaction2);
    }
    const curator = await User.findOne({ id: runDB.createdBy.id });
    if (!curator) {
      curator = await checkMember(interaction.user)
    }
    let curatorCut = runDB.gold * cuts[runDB.type].curator;
    let transaction1 = {
      user: curator.id,
      amount: curatorCut,
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
    transactions.push(transaction1);
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
    const transaction2 = {
      user: curator.id,
      amount: curatorCut * -1,
      server: runDB.server,
      run: runDB._id,
      settings: {
        description: "Completed Run Payout",
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
    transactions.push(transaction2);
    runDB.status = "Done";
    await runDB.save();
    // Once all is ran, save 1 time.
    for (let i = 0; i < transactions.length; i++) {
      await Transaction.create(transactions[i]);
    }
    message.edit({
      content: `This run has been marked as approved and paid out by ${interaction.user.tag}. ${run.url}`,
      components: [],
    });
  },
};
