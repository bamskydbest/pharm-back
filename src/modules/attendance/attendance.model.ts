import { Schema, model, Types } from "mongoose";

export interface IAttendance {
  _id?: Types.ObjectId;
  employeeId: Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  status: "present" | "absent" | "late" | "leave";
  clockIn: Date | null;
  clockOut: Date | null;
  hoursWorked: number;
  notes: string;
  markedBy: Types.ObjectId;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
    },
    clockIn: { type: Date, default: null },
    clockOut: { type: Date, default: null },
    hoursWorked: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ status: 1 });

export default model<IAttendance>("Attendance", AttendanceSchema);
