import * as dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const whitelist = [];

if (process.env.PROCESS_URL) {
  whitelist.push(process.env.PROCESS_URL);
}

if (process.env.NODE_ENV === "production") {
  // whitelist.push("https://modlinedesign.com");
}

if (process.env.NODE_ENV !== "production") {
  whitelist.push(`http://localhost:3000`);
}

export default {
  token: process.env.TOKEN || "",
  port: process.env.PORT,
  env: process.env.NODE_ENV || "development",
  client_id: process.env.DISCORD_CLIENT_ID || "",
  guild_id: process.env.DISCORD_DEV_SERVER || "",
  mongo: {
    uri: `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_DATABASE}/?retryWrites=true&w=majority`,
    port: process.env.MONGO_PORT || 27017,
    db: "Speakeasy",
  },
  whitelist,
};
