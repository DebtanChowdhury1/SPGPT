import mongoose, { Schema, models } from "mongoose";

const ChatSchema = new Schema(
  {
    userId: { type: String, required: true },
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "Thread" },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    attachment: {
      name: { type: String },
      type: { type: String },
      size: { type: Number },
    },
  },
  { timestamps: true }
);

export const Chat = models.Chat || mongoose.model("Chat", ChatSchema);
