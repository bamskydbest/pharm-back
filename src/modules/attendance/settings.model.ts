import { Schema, model } from "mongoose";

export interface IAttendanceSettings {
  key: string;
  defaultShiftStart: string;
  defaultShiftEnd: string;
}

const AttendanceSettingsSchema = new Schema<IAttendanceSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "attendance_config",
    },
    defaultShiftStart: {
      type: String,
      default: "09:00",
    },
    defaultShiftEnd: {
      type: String,
      default: "17:00",
    },
  },
  { timestamps: true }
);

export default model<IAttendanceSettings>("AttendanceSettings", AttendanceSettingsSchema);
