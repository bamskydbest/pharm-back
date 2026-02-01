import { Schema, model } from "mongoose";

export interface IRole {
  name: string;
  permissions: string[];
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default model<IRole>("Role", RoleSchema);
