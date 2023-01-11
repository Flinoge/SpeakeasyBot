import mongoose from "mongoose";

const types = ["M+"];

const stati = ["Pending", "Started", "Awaiting Approval", "Done"];

const Schema = new mongoose.Schema({
  type: { type: String, required: true, enum: types },
  server: { type: String, required: true },
  gold: { type: Number, required: true },
  participants: [
    {
      id: { type: String, required: true },
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
