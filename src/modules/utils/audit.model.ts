import { Schema, model } from "mongoose";

const AuditSchema = new Schema({
  userId: Schema.Types.ObjectId,
  action: String,
  resource: String,
  timestamp: { type: Date, default: Date.now },
  meta: Object
});

export default model("Audit", AuditSchema);
