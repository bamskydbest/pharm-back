import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/allowRoles.js";
import User from "../auth/user.model.js";
import Attendance from "./attendance.model.js";
import AttendanceSettings from "./settings.model.js";

const router = Router();

// ── Helper: get an employee's effective shift start time ──
async function getShiftStart(employeeId: string): Promise<string> {
  const emp = await User.findById(employeeId).select("shiftStart");
  if (emp?.shiftStart) return emp.shiftStart;

  const settings = await AttendanceSettings.findOne({ key: "attendance_config" });
  return settings?.defaultShiftStart || "09:00";
}

// ── Helper: compare "HH:MM" times → true if a > b ──
function isAfter(a: string, b: string): boolean {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah > bh || (ah === bh && am > bm);
}

// ── Helper: calculate hours between two dates ──
function calcHours(clockIn: Date, clockOut: Date): number {
  const diff = clockOut.getTime() - clockIn.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

// ── Helper: today as YYYY-MM-DD ──
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ────────────────────────────────────────────────────────
// GET /settings — Get global attendance settings
// ────────────────────────────────────────────────────────
router.get("/settings", auth, allowRoles("ADMIN"), async (_req: Request, res: Response) => {
  try {
    let settings = await AttendanceSettings.findOne({ key: "attendance_config" });
    if (!settings) {
      settings = await AttendanceSettings.create({
        key: "attendance_config",
        defaultShiftStart: "09:00",
        defaultShiftEnd: "17:00",
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// PUT /settings — Update global attendance settings
// ────────────────────────────────────────────────────────
router.put("/settings", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { defaultShiftStart, defaultShiftEnd } = req.body;
    const settings = await AttendanceSettings.findOneAndUpdate(
      { key: "attendance_config" },
      { defaultShiftStart, defaultShiftEnd },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /summary/today — Today's attendance summary
// ────────────────────────────────────────────────────────
router.get("/summary/today", auth, allowRoles("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const date = todayStr();
    const totalEmployees = await User.countDocuments({ status: "active" });
    const records = await Attendance.find({ date });

    const present = records.filter(r => r.status === "present").length;
    const late = records.filter(r => r.status === "late").length;
    const absent = records.filter(r => r.status === "absent").length;
    const onLeave = records.filter(r => r.status === "leave").length;
    const notMarked = totalEmployees - records.length;

    res.json({
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      onLeaveToday: onLeave,
      notMarked: Math.max(notMarked, 0),
      totalEmployees,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /summary?date= — Attendance summary for any date
// ────────────────────────────────────────────────────────
router.get("/summary", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayStr();
    const totalEmployees = await User.countDocuments({ status: "active" });
    const records = await Attendance.find({ date });

    const present = records.filter(r => r.status === "present").length;
    const late = records.filter(r => r.status === "late").length;
    const absent = records.filter(r => r.status === "absent").length;
    const onLeave = records.filter(r => r.status === "leave").length;
    const notMarked = totalEmployees - records.length;

    res.json({
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      onLeaveToday: onLeave,
      notMarked: Math.max(notMarked, 0),
      totalEmployees,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /daily?date= — All employees' attendance for a date
// ────────────────────────────────────────────────────────
router.get("/daily", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayStr();
    const employees = await User.find({ status: "active" }).select("_id name");
    const records = await Attendance.find({ date });

    const recordMap = new Map(records.map(r => [r.employeeId.toString(), r]));

    const result = employees.map(emp => {
      const record = recordMap.get(emp._id.toString());
      return {
        employeeId: emp._id,
        employeeName: emp.name,
        status: record ? record.status : "not_marked",
        clockIn: record?.clockIn?.toISOString() || null,
        clockOut: record?.clockOut?.toISOString() || null,
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// POST / — Mark single attendance (upsert)
// ────────────────────────────────────────────────────────
router.post("/", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { employeeId, date, status, clockIn, clockOut, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: "employeeId, date, and status are required" });
    }

    let finalStatus = status;
    let clockInDate: Date | null = null;
    let clockOutDate: Date | null = null;
    let hoursWorked = 0;

    // Parse clock times if provided (format: "HH:MM")
    if (clockIn) {
      const [h, m] = clockIn.split(":").map(Number);
      clockInDate = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

      // Auto-detect late if status is "present"
      if (status === "present") {
        const shiftStart = await getShiftStart(employeeId);
        if (isAfter(clockIn, shiftStart)) {
          finalStatus = "late";
        }
      }
    }

    if (clockOut) {
      const [h, m] = clockOut.split(":").map(Number);
      clockOutDate = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    }

    if (clockInDate && clockOutDate) {
      hoursWorked = calcHours(clockInDate, clockOutDate);
    }

    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        employeeId,
        date,
        status: finalStatus,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        hoursWorked,
        notes: notes || "",
        markedBy: req.user!.id,
      },
      { new: true, upsert: true }
    );

    res.status(201).json(record);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Attendance already recorded for this date" });
    }
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// POST /bulk — Bulk mark attendance
// ────────────────────────────────────────────────────────
router.post("/bulk", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { date, employees } = req.body;

    if (!date || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: "date and employees array are required" });
    }

    const operations = [];

    for (const emp of employees) {
      let finalStatus = emp.status || "present";
      let clockInDate: Date | null = null;

      if (emp.clockIn) {
        const [h, m] = emp.clockIn.split(":").map(Number);
        clockInDate = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

        if (finalStatus === "present") {
          const shiftStart = await getShiftStart(emp.employeeId);
          if (isAfter(emp.clockIn, shiftStart)) {
            finalStatus = "late";
          }
        }
      }

      operations.push({
        updateOne: {
          filter: { employeeId: emp.employeeId, date },
          update: {
            $set: {
              employeeId: new Types.ObjectId(emp.employeeId),
              date,
              status: finalStatus,
              clockIn: clockInDate,
              notes: "",
              markedBy: new Types.ObjectId(req.user!.id),
            },
          },
          upsert: true,
        },
      });
    }

    await Attendance.bulkWrite(operations);
    res.status(201).json({ message: `${employees.length} attendance records saved` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// POST /clock — Clock in/out for an employee
// ────────────────────────────────────────────────────────
router.post("/clock", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { employeeId, action, time, date } = req.body;

    if (!employeeId || !action || !date) {
      return res.status(400).json({ message: "employeeId, action, and date are required" });
    }

    const clockTime = time ? new Date(time) : new Date();

    if (action === "in") {
      // Determine status based on shift start
      const shiftStart = await getShiftStart(employeeId);
      const clockHHMM = `${String(clockTime.getHours()).padStart(2, "0")}:${String(clockTime.getMinutes()).padStart(2, "0")}`;
      const status = isAfter(clockHHMM, shiftStart) ? "late" : "present";

      const record = await Attendance.findOneAndUpdate(
        { employeeId, date },
        {
          employeeId,
          date,
          status,
          clockIn: clockTime,
          markedBy: req.user!.id,
        },
        { new: true, upsert: true }
      );

      res.status(201).json(record);
    } else if (action === "out") {
      const existing = await Attendance.findOne({ employeeId, date });
      if (!existing) {
        return res.status(400).json({ message: "No clock-in record found for this date" });
      }

      existing.clockOut = clockTime;
      if (existing.clockIn) {
        existing.hoursWorked = calcHours(existing.clockIn, clockTime);
      }
      await existing.save();

      res.json(existing);
    } else {
      res.status(400).json({ message: "action must be 'in' or 'out'" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// POST /self-clock — Employee clocks themselves in/out
// Any authenticated user (no role restriction)
// ────────────────────────────────────────────────────────
router.post("/self-clock", auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const action = req.body.action as "in" | "out";
    const date = todayStr();
    const clockTime = new Date();

    if (!action || (action !== "in" && action !== "out")) {
      return res.status(400).json({ message: "action must be 'in' or 'out'" });
    }

    if (action === "in") {
      // Check if already clocked in today
      const existing = await Attendance.findOne({ employeeId: userId, date });
      if (existing && existing.clockIn) {
        return res.status(400).json({ message: "Already clocked in today" });
      }

      const shiftStart = await getShiftStart(userId);
      const clockHHMM = `${String(clockTime.getHours()).padStart(2, "0")}:${String(clockTime.getMinutes()).padStart(2, "0")}`;
      const status = isAfter(clockHHMM, shiftStart) ? "late" : "present";

      const record = await Attendance.findOneAndUpdate(
        { employeeId: userId, date },
        {
          employeeId: userId,
          date,
          status,
          clockIn: clockTime,
          markedBy: new Types.ObjectId(userId),
        },
        { new: true, upsert: true }
      );

      res.status(201).json({
        message: status === "late" ? "Clocked in (Late)" : "Clocked in successfully",
        status,
        clockIn: record.clockIn,
      });
    } else {
      const existing = await Attendance.findOne({ employeeId: userId, date });
      if (!existing || !existing.clockIn) {
        return res.status(400).json({ message: "You haven't clocked in today" });
      }
      if (existing.clockOut) {
        return res.status(400).json({ message: "Already clocked out today" });
      }

      existing.clockOut = clockTime;
      existing.hoursWorked = calcHours(existing.clockIn, clockTime);
      await existing.save();

      res.json({
        message: "Clocked out successfully",
        clockOut: existing.clockOut,
        hoursWorked: existing.hoursWorked,
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /my-status — Get own attendance status for today
// Any authenticated user (no role restriction)
// ────────────────────────────────────────────────────────
router.get("/my-status", auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const date = todayStr();

    const record = await Attendance.findOne({ employeeId: userId, date });

    res.json({
      date,
      status: record?.status || "not_marked",
      clockIn: record?.clockIn?.toISOString() || null,
      clockOut: record?.clockOut?.toISOString() || null,
      hoursWorked: record?.hoursWorked || 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /employee/:id — Records for an employee in date range
// NOTE: Must come after /settings, /summary, /daily, /bulk, /clock
// ────────────────────────────────────────────────────────
router.get("/employee/:id", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const query: any = { employeeId: id };
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    } else if (from) {
      query.date = { $gte: from };
    } else if (to) {
      query.date = { $lte: to };
    }

    const records = await Attendance.find(query).sort({ date: -1 });

    const result = records.map(r => ({
      _id: r._id,
      employeeId: r.employeeId,
      date: r.date,
      status: r.status,
      clockIn: r.clockIn?.toISOString() || null,
      clockOut: r.clockOut?.toISOString() || null,
      hoursWorked: r.hoursWorked,
      notes: r.notes,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────
// GET /employee/:id/stats — Attendance stats for an employee
// ────────────────────────────────────────────────────────
router.get("/employee/:id/stats", auth, allowRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const query: any = { employeeId: id };
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(query);

    const totalDays = records.length;
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    const leave = records.filter(r => r.status === "leave").length;

    const withHours = records.filter(r => r.hoursWorked > 0);
    const avgHoursWorked = withHours.length > 0
      ? Math.round((withHours.reduce((sum, r) => sum + r.hoursWorked, 0) / withHours.length) * 100) / 100
      : 0;

    res.json({
      totalDays,
      present,
      absent,
      late,
      leave,
      avgHoursWorked,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
