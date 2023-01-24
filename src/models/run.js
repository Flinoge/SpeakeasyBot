import mongoose from "mongoose";

const types = ["M+", "Raid"];

const stati = ["Cancelled", "Pending", "Started", "Awaiting Approval", "Done"];

const Schema = new mongoose.Schema({
  type: { type: String, required: true, enum: types },
  server: { type: String, required: true },
  gold: { type: Number, required: true, default: 0 },
  participants: [
    {
      id: { type: String, required: true },
      cut: { type: Number, required: true },
    },
  ],
  status: { type: String, required: true, enum: stati, default: "Pending" },
  messageId: { type: String, required: true },
  channelId: { type: String },
  settings: { type: Object, required: false, default: {} },
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
