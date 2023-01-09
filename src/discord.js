import config from "./config.js";
// Require the necessary discord.js classes
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  Partials,
} from "discord.js";
import fs from "node:fs";
// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
client.commands = new Collection();
client.buttons = new Collection();
// Log in to Discord with your client's token
client.login(config.token);
export default client;
export const curatorRole = "curator",
  adminPermission = "BanMembers";

const registerAll = async () => {
  /// COMMANDS SECTION
  const commands = [];
  // Grab all the command files from the commands directory you created earlier
  const commandFiles = fs
    .readdirSync("./src/commands")
    .filter((file) => file.endsWith(".js"));

  // Construct and prepare an instance of the REST module
  const rest = new REST({ version: "10" }).setToken(config.token);
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const command = (await import(`./commands/${file}`)).default;
    commands.push(command.data.toJSON());
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ./commands/${file} is missing a required "data" or "execute" property.`
      );
    }
  }
  // and deploy your commands!
  (async () => {
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );

      // The put method is used to fully refresh all commands in the guild with the current set
      const data = await rest.put(
        Routes.applicationGuildCommands(config.client_id, config.guild_id),
        { body: commands }
      );

      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      console.error(error);
    }
  })();

  /// EVENTS SECTION
  const eventFiles = fs
    .readdirSync("./src/events")
    .filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const event = (await import(`./events/${file}`)).default;
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  /// Buttons Section
  const buttonFiles = fs
    .readdirSync("./src/buttons")
    .filter((file) => file.endsWith(".js"));
  for (const file of buttonFiles) {
    const button = (await import(`./buttons/${file}`)).default;
    client.buttons.set(button.data.name, button);
  }
};

registerAll();
