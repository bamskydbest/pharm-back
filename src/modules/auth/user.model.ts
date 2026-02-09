import { Schema, model, Types } from "mongoose";

export interface IUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT";
  branchId?: Types.ObjectId;
  // Employee details
  phone?: string;
  salary?: number;
  dateOfEmployment?: Date;
  department?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePicture?: string;
  status: "active" | "inactive";
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
    },

    // Employee details
    phone: { type: String },

    salary: { type: Number },

    dateOfEmployment: { type: Date, default: Date.now },

    department: { type: String },

    address: { type: String },

    emergencyContact: { type: String },

    emergencyPhone: { type: String },

    profilePicture: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);
