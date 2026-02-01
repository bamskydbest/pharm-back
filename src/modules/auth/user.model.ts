import { Schema, model, Types } from "mongoose";

export interface IUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT";
  branchId?: Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },

    email: { type: String, unique: true, required: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["ADMIN", "PHARMACIST", "CASHIER", "ACCOUNTANT"],
      required: true
    },

    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch"
    }
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);
