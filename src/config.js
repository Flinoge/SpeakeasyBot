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
  guild_id: process.env.DISCORD_SERVER || "",
  admin_channel: process.env.DISCORD_ADMIN_CHANNEL || "",
  mongo: {
    uri: `mongodb://127.0.0.1`,
    port: process.env.MONGO_PORT || 27017,
    db: "speakeasy",
  },
  whitelist,
};
