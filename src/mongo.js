import mongoose from "mongoose";
import config from "./config.js";
import path from "node:path";

mongoose.Promise = Promise;
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
  // process.exit(-1); // eslint-disable-line no-process-exit
});

let mongod;

if (config.env !== "production") {
  (async () => {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    await mongoose.disconnect();

    mongod = await MongoMemoryServer.create({
      instance: {
        port: parseInt(config.mongo.port),
        dbName: config.mongo.db,
      },
    });

    await mongoose.connect(mongod.getUri(), config.mongo.options);
  })();
} else {
  mongoose.connect(config.mongo.uri, config.mongo.options);
}

if (config.env !== "production") {
  // Make sure in memory Mongo DB is shutdown on exit or restart
  // Note:
  // I saw some documentation that said not to perform async operations
  // in side of a process exit handler, but this seems to work without any issues.
  process.once("SIGINT", async function () {
    await disconnect();
  });
}
export async function loadTestData(fileLocation) {
  if (config.env !== "production") {
    const TestData = require(path.resolve(fileLocation));
    mongoose.connection.useDb(config.mongo.db);
    await Promise.all(
      Object.keys(TestData).map(async (collection) => {
        if (
          Array.isArray(TestData[collection]) &&
          TestData[collection].length > 0
        ) {
          return mongoose.connection.collection(collection).insertMany(
            TestData[collection].map((doc) => ({
              ...doc,
              _id: mongoose.Types.ObjectId(doc._id),
            }))
          );
        } else {
          return false;
        }
      })
    );
  }
}

export async function closeDatabase() {
  if (config.env !== "production") {
    mongoose.connection.useDb(MONGODB_DATABASE);
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close(true);
    return mongod.stop();
  } else {
    console.error(
      "mongo.closeDatabase - This function is only available in non production environments."
    );
  }
}

export async function clearDatabase() {
  if (config.env === "test") {
    mongoose.connection.useDb(MONGODB_DATABASE);
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      try {
        await collection.deleteMany();
      } catch (ex) {
        //
      }
    }
  } else {
    console.error(
      "mongo.clearDatabase - This function is only available in the Test Environment."
    );
  }
}

export async function disconnect() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
