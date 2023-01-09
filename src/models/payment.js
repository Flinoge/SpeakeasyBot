import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  user: { type: String, required: true },
  amount: { type: Number, required: true },
  run: { type: String, required: true },
  settings: { type: Object, required: true },
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

export default mongoose.model(`Payments`, Schema);
