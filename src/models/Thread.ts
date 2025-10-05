import mongoose, { Schema, models } from "mongoose";

const ThreadSchema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, default: "New Chat" },
  },
  { timestamps: true }
);

export const Thread = models.Thread || mongoose.model("Thread", ThreadSchema);
