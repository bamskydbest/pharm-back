import { Schema, model } from "mongoose";

const BranchSchema = new Schema({
  name: String,
  location: String,
  code: { type: String, unique: true }
}, { timestamps: true });

export default model("Branch", BranchSchema);
