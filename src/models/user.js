import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  id: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 },
  settings: {
    username: { type: String, required: false },
    avatarURL: { type: String, required: false },
  },
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

export default mongoose.model(`Users`, Schema);
