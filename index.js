import express from "express";
import config from "./src/config.js";
import cors from "cors";
import morgan from "morgan";

import bodyParser from "body-parser";
import discord from "./src/discord.js";
import "./src/mongo.js";
import { disconnect } from "./src/mongo.js";

const app = express();
app.use(bodyParser.json());
morgan.token("body", (req) => (req.body ? JSON.stringify(req.body) : ""));
morgan.token("ip", (req) => req.ip || req.headers["remote-addr"]);
app.use(
  morgan(
    `:ip - [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":body"`
  )
);

const corsOptions = {
  origin: function (origin, callback) {
    if (config.whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));

// TODO Generate a session/token
// app.use(async (req, res, next) => {
//   if (config.env !== "production") {
//
//     next();
//   } else {
//     console.log(`Url ${req.hostname} attempted to access.`);
//     // Checks to see if it is the react-app service
//     if (req.hostname !== config.expected_url) {
//       res.status(404);
//     } else {
//       try {
//         const client = await auth.getIdTokenClient(req.hostname);
//         const response = await client.request({ url: config.process_url });
//         console.log(response.data);
//         next();
//       } catch (err) {
//         console.error(err.message);
//         res.status(404);
//       }
//     }
//   }
// });

// app.use("/email", EmailService);

app.get("/", (req, res) => {
  res.send("This is Speakeasy Backend");
});

let server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} with env ${config.env}.`);
});

app.close = () => {
  server.close(() => {
    console.log("API shutdown");
  });
};
