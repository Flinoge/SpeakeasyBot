import mongoose from "mongoose";

const types = ["M+"];

const stati = ["Pending", "Started", "Done"];

const Schema = new mongoose.Schema({
  type: { type: String, required: true, enum: types },
  gold: { type: Number, required: true },
  participants: [
    {
      displayName: { type: String, required: true },
      discordId: { type: String, required: true },
      tag: { type: String, required: true },
      cut: { type: Number, required: true },
    },
  ],
  status: { type: String, required: true, enum: stati, default: "Pending" },
  messageId: { type: String, required: true },
  settings: { type: Object, required: false },
  createdAt: { type: Date, required: true, default: Date.now() },
  createdBy: {
    username: { type: String, required: true },
    id: { type: String, required: true },
  },
  updatedAt: { type: Date, default: Date.now() },
  updatedBy: {
    username: { type: String, required: true },
    id: { type: String, required: true },
  },
});

export default mongoose.model(`Runs`, Schema);
