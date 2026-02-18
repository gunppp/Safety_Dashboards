import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Target,
  Flame,
  Activity,
  Calendar,
  Award,
  Zap,
  Clock,
  Upload,
  Image as ImageIcon,
  Edit,
  Save,
  Megaphone,
  Plus,
  Trash2,
  Monitor,
  Maximize2,
  LayoutGrid,
} from "lucide-react";

type DayStatus = "normal" | "non-absent" | "absent" | null;

interface DailyStatistic {
  day: number;
  status: DayStatus;
}

interface MonthlyData {
  month: number;
  year: number;
  completed: boolean;
  days: DailyStatistic[];
}

interface Announcement {
  id: string;
  text: string;
  createdAt: string; // ISO
}

type IncidentType = "firstAid" | "fire" | "nearMiss";

interface Incident {
  id: string;
  date: string; // YYYY-MM-DD
  type: IncidentType;
  title: string;
  note?: string;
}

type PersistedState = {
  version: 1;
  year: number;
  displayMonth: number;
  monthlyData: MonthlyData[];
  policyImage: string | null;
  announcements: Announcement[];
  incidents: Incident[];
  manHoursYear: number;
  updatedAt: string;
};

const STORAGE_KEY = "safety-dashboard:v1";
const SHEETS_CFG_KEY = "safety-dashboard:sheets";

type SheetsConfig = {
  endpoint: string; // Apps Script Web App URL
  writeToken?: string; // optional: required only for writing
  pullIntervalSec?: number;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_TH = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function IncidentQuickAdd({
  onAdd,
}: {
  onAdd: (incident: Incident) => void;
}) {
  const [date, setDate] = useState<string>(todayYmd());
  const [type, setType] = useState<IncidentType>("firstAid");
  const [title, setTitle] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const submit = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onAdd({
      id: String(Date.now()),
      date,
      type,
      title: cleanTitle,
      note: note.trim() || undefined,
    });
    setTitle("");
    setNote("");
  };

  return (
    <div className="col-span-8 bg-white/5 rounded-lg p-2 border border-gray-700">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <label className="block text-xs text-gray-300 mb-1">Date</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="w-full bg-gray-900/60 text-white rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-gray-300 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
            className="w-full bg-gray-900/60 text-white rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="firstAid">First Aid</option>
            <option value="nearMiss">Near Miss</option>
            <option value="fire">Fire</option>
          </select>
        </div>
        <div className="col-span-4">
          <label className="block text-xs text-gray-300 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น: บาดเจ็บเล็กน้อยที่นิ้ว"
            className="w-full bg-gray-900/60 text-white rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="col-span-2">
          <button
            onClick={submit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 font-semibold"
          >
            Add
          </button>
        </div>
        <div className="col-span-12">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-gray-900/40 text-white rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {showSheetsSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <LayoutGrid className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="font-semibold">Google Sheets (DB)</div>
                  <div className="text-xs text-gray-300">Sync statistics / announcements / incidents (calendar stays local)</div>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsSettings(false)}
                className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-12 gap-3 text-white">
              <div className="col-span-12">
                <label className="block text-xs text-gray-300 mb-1">Apps Script Web App URL (endpoint)</label>
                <input
                  value={sheetsConfig.endpoint}
                  onChange={(e) => setSheetsConfig((c) => ({ ...c, endpoint: e.target.value }))}
                  placeholder="https://script.google.com/macros/s/XXXXX/exec"
                  className="w-full bg-gray-950/50 rounded px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  แนะนำให้ตั้ง Apps Script ให้ <span className="text-gray-200">อ่านได้แบบ public</span> และ <span className="text-gray-200">เขียนต้องใช้ token</span>.
                </p>
              </div>

              <div className="col-span-12 md:col-span-7">
                <label className="block text-xs text-gray-300 mb-1">Write token (optional)</label>
                <input
                  value={sheetsConfig.writeToken || ""}
                  onChange={(e) => setSheetsConfig((c) => ({ ...c, writeToken: e.target.value }))}
                  placeholder="(leave blank for read-only display)"
                  className="w-full bg-gray-950/50 rounded px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs text-gray-300 mb-1">Auto sync every (sec)</label>
                <input
                  value={String(sheetsConfig.pullIntervalSec ?? 60)}
                  onChange={(e) =>
                    setSheetsConfig((c) => ({
                      ...c,
                      pullIntervalSec: Math.max(15, Number(e.target.value || 60)),
                    }))
                  }
                  type="number"
                  min={15}
                  className="w-full bg-gray-950/50 rounded px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="col-span-12 rounded-lg border border-gray-800 bg-white/5 p-3 text-xs text-gray-200">
                <div className="font-semibold mb-1">Synced fields</div>
                <ul className="list-disc ml-4 text-gray-300 space-y-1">
                  <li>Man-hours (Year), Announcement, Policy Poster, Incident Log</li>
                  <li><span className="text-gray-200">Calendar</span> ยังบันทึกในเครื่อง และจะ auto-run เป็นสีเขียวเวลา <span className="text-gray-200">16:00</span> (ถ้ายังไม่กรอก)</li>
                </ul>
              </div>

              {sheetsStatus.error ? (
                <div className="col-span-12 text-xs text-red-300">Error: {sheetsStatus.error}</div>
              ) : null}

              <div className="col-span-12 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={pullFromSheets}
                  className="text-xs px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center gap-2"
                  disabled={!sheetsConfig.endpoint.trim()}
                >
                  <Upload className="h-4 w-4" />
                  Pull now
                </button>
                <button
                  onClick={pushToSheets}
                  className="text-xs px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white inline-flex items-center gap-2"
                  disabled={!sheetsConfig.endpoint.trim()}
                  title={!sheetsConfig.writeToken?.trim() ? "Read-only (set write token to enable push)" : "Push local data to Sheets"}
                >
                  <Save className="h-4 w-4" />
                  Push
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SafetyDashboard() {
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [safetyStreak, setSafetyStreak] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [policyImage, setPolicyImage] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [manHoursYear, setManHoursYear] = useState<number>(200000);

  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>(() => {
    const saved = safeJsonParse<SheetsConfig>(window.localStorage.getItem(SHEETS_CFG_KEY));
    return (
      saved ?? {
        endpoint: import.meta.env.VITE_SHEETS_ENDPOINT || "",
        writeToken: import.meta.env.VITE_SHEETS_TOKEN || "",
        pullIntervalSec: 60,
      }
    );
  });
  const [sheetsStatus, setSheetsStatus] = useState<{
    connected: boolean;
    lastPull?: string;
    lastPush?: string;
    error?: string;
  }>({ connected: false });
  const [showSheetsSettings, setShowSheetsSettings] = useState(false);

const [displayMode, setDisplayMode] = useState<boolean>(false);
const [displayView, setDisplayView] = useState<"overview" | "poster" | "calendar">("overview");

const canEdit = !displayMode;

const requestFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // ignore
  }
};

  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const loadedPersistedRef = useRef(false);

  const exportJson = () => {
    const payload: PersistedState = {
      version: 1,
      year: currentYear,
      displayMonth,
      monthlyData,
      policyImage,
      announcements,
      incidents,
      manHoursYear,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safety-dashboard-${currentYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = safeJsonParse<PersistedState>(String(reader.result));
      if (!data || data.version !== 1) return;
      setCurrentYear(data.year);
      setDisplayMonth(data.displayMonth);
      setMonthlyData(data.monthlyData);
      setPolicyImage(data.policyImage);
      setAnnouncements(data.announcements);
      setIncidents(data.incidents);
      setManHoursYear(data.manHoursYear ?? 200000);
    };
    reader.readAsText(file);
  };

  // Persist Sheets config (endpoint/token) locally
  useEffect(() => {
    try {
      window.localStorage.setItem(SHEETS_CFG_KEY, JSON.stringify(sheetsConfig));
    } catch {
      // ignore
    }
  }, [sheetsConfig]);

  const pullFromSheets = async () => {
    const endpoint = (sheetsConfig.endpoint || "").trim();
    if (!endpoint) return;
    try {
      setSheetsStatus((s) => ({ ...s, error: undefined }));
      const res = await fetch(`${endpoint}?action=get`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<{
        policyImage: string | null;
        announcements: Announcement[];
        incidents: Incident[];
        manHoursYear: number;
        updatedAt: string;
      }>;

      // NOTE: calendar (monthlyData) remains local by design
      if (typeof data.manHoursYear === "number") setManHoursYear(data.manHoursYear);
      if (typeof data.policyImage !== "undefined") setPolicyImage(data.policyImage ?? null);
      if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      if (Array.isArray(data.incidents)) setIncidents(data.incidents);

      setSheetsStatus((s) => ({
        ...s,
        connected: true,
        lastPull: new Date().toISOString(),
        error: undefined,
      }));
    } catch (e: any) {
      setSheetsStatus({
        connected: false,
        error: e?.message ? String(e.message) : "Pull failed",
      });
    }
  };

  const pushToSheets = async () => {
    const endpoint = (sheetsConfig.endpoint || "").trim();
    if (!endpoint) return;
    const token = (sheetsConfig.writeToken || "").trim();
    if (!token) {
      setSheetsStatus((s) => ({ ...s, error: "Missing write token (read-only mode)" }));
      return;
    }
    try {
      setSheetsStatus((s) => ({ ...s, error: undefined }));
      const payload = {
        action: "set",
        token,
        data: {
          manHoursYear,
          policyImage,
          announcements,
          incidents,
          updatedAt: new Date().toISOString(),
        },
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSheetsStatus((s) => ({
        ...s,
        connected: true,
        lastPush: new Date().toISOString(),
        error: undefined,
      }));
    } catch (e: any) {
      setSheetsStatus((s) => ({
        ...s,
        connected: false,
        error: e?.message ? String(e.message) : "Push failed",
      }));
    }
  };

  // Auto-pull from Google Sheets (recommended for 4K factory display)
  useEffect(() => {
    const endpoint = (sheetsConfig.endpoint || "").trim();
    if (!endpoint) return;
    pullFromSheets();
    const every = Math.max(15, sheetsConfig.pullIntervalSec ?? 60) * 1000;
    const id = window.setInterval(pullFromSheets, every);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetsConfig.endpoint, sheetsConfig.pullIntervalSec]);

  // Load persisted state (localStorage)
  useEffect(() => {
    const persisted = safeJsonParse<PersistedState>(
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    );

    if (!persisted || persisted.version !== 1) return;
    loadedPersistedRef.current = true;

    setCurrentYear(persisted.year);
    setDisplayMonth(persisted.displayMonth);
    setMonthlyData(persisted.monthlyData);
    setPolicyImage(persisted.policyImage);
    setAnnouncements(persisted.announcements);
    setIncidents(persisted.incidents);
    setManHoursYear(persisted.manHoursYear ?? 200000);
  }, []);

  // Seed defaults (only if nothing persisted)
  useEffect(() => {
    if (loadedPersistedRef.current) return;
    if (announcements.length > 0) return;
    setAnnouncements([
      {
        id: "seed-1",
        text: "Fire drill will be held on January 30, 2026",
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [announcements.length]);

  // Persist state (debounced)
  useEffect(() => {
    if (monthlyData.length === 0) return; // avoid persisting before init

    const t = window.setTimeout(() => {
      const payload: PersistedState = {
        version: 1,
        year: currentYear,
        displayMonth,
        monthlyData,
        policyImage,
        announcements,
        incidents,
        manHoursYear,
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // If policy image is too large for localStorage, saving may fail.
        // The UI still works; user can export JSON as backup.
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [currentYear, displayMonth, monthlyData, policyImage, announcements, incidents, manHoursYear]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

// Display mode: auto-rotate views for factory TV screens
useEffect(() => {
  if (!displayMode) return;
  const order: Array<"overview" | "poster" | "calendar"> = ["overview", "poster", "calendar"];
  let idx = order.indexOf(displayView);
  const interval = window.setInterval(() => {
    idx = (idx + 1) % order.length;
    setDisplayView(order[idx]);
  }, 20000);
  return () => window.clearInterval(interval);
}, [displayMode, displayView]);



  // Auto-fill Normal status at 16:00 every day (calendar stays local; not synced to Sheets)
  useEffect(() => {
    const autoFillPastDays = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      setMonthlyData((prev) => {
        const newData = [...prev];
        let hasChanges = false;

        // Auto-fill past days in current month that are null
        const monthData = newData[currentMonth];
        if (monthData) {
          for (let dayIdx = 0; dayIdx < monthData.days.length; dayIdx++) {
            const dayNum = dayIdx + 1;
            
            // For past days (before today), auto-fill if null
            if (dayNum < currentDay && monthData.days[dayIdx].status === null) {
              monthData.days[dayIdx].status = "normal";
              hasChanges = true;
            }
            
            // For today, auto-fill only if it's 16:00 or later
            if (dayNum === currentDay && monthData.days[dayIdx].status === null) {
              if (currentHours > 16 || (currentHours === 16 && currentMinutes >= 0)) {
                monthData.days[dayIdx].status = "normal";
                hasChanges = true;
              }
            }
          }

          // Check if month is completed
          if (hasChanges) {
            const allDaysHaveStatus = monthData.days.every((d) => d.status !== null);
            monthData.completed = allDaysHaveStatus;

            // If month is completed, move to next month
            if (allDaysHaveStatus && currentMonth < 11) {
              setDisplayMonth(currentMonth + 1);
            }
          }
        }

        return hasChanges ? newData : prev;
      });
    };

    // Check every minute
    const interval = setInterval(autoFillPastDays, 60000);

    // Check immediately on mount
    autoFillPastDays();

    return () => clearInterval(interval);
  }, []);

  // Calculate Safety Streak
  useEffect(() => {
    if (monthlyData.length === 0) return;

    let streak = 0;
    let found = false;

    // Start from current month and go backwards through all days
    for (let m = displayMonth; m >= 0 && !found; m--) {
      const month = monthlyData[m];
      if (!month) continue;

      const maxDay =
        m === displayMonth
          ? month.days.filter((d) => d.status !== null).length
          : month.days.length;

      for (let d = maxDay - 1; d >= 0 && !found; d--) {
        const day = month.days[d];
        if (day.status === "normal") {
          streak++;
        } else if (
          day.status === "absent" ||
          day.status === "non-absent"
        ) {
          found = true;
          break;
        }
      }
    }

    setSafetyStreak(streak);
  }, [monthlyData, displayMonth]);

  // Initialize monthly data
  useEffect(() => {
    // If loaded from localStorage already, don't override.
    if (monthlyData.length === 12 && monthlyData[0]?.year === currentYear) return;

    const initData: MonthlyData[] = [];
    for (let i = 0; i < 12; i++) {
      const daysInMonth = new Date(currentYear, i + 1, 0).getDate();
      const days: DailyStatistic[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        // Initialize with null status
        days.push({ day, status: null });
      }

      initData.push({
        month: i,
        year: currentYear,
        completed: false,
        days,
      });
    }
    setMonthlyData(initData);
  }, [currentYear]);

  const handleDayClick = (monthIndex: number, dayIndex: number) => {
    setMonthlyData((prev) => {
      const newData = [...prev];
      const currentStatus = newData[monthIndex].days[dayIndex].status;

      // Cycle through statuses: null -> normal -> non-absent -> absent -> null
      let nextStatus: DayStatus = null;
      if (currentStatus === null) nextStatus = "normal";
      else if (currentStatus === "normal") nextStatus = "non-absent";
      else if (currentStatus === "non-absent") nextStatus = "absent";
      else nextStatus = null;

      newData[monthIndex].days[dayIndex].status = nextStatus;

      // Check if month is completed (all days have status)
      const allDaysHaveStatus = newData[monthIndex].days.every(
        (d) => d.status !== null
      );
      newData[monthIndex].completed = allDaysHaveStatus;

      // If current month is completed, move to next month
      if (
        allDaysHaveStatus &&
        monthIndex === displayMonth &&
        monthIndex < 11
      ) {
        setDisplayMonth(monthIndex + 1);
      }

      return newData;
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    setDisplayMonth(monthIndex);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPolicyImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Announcement functions
  const handleAddAnnouncement = () => {
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      text: "New announcement...",
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [...prev, newAnnouncement]);
    setIsEditingAnnouncement(true);
    setEditingAnnouncementId(newAnnouncement.id);
    setEditText(newAnnouncement.text);
  };

  const handleEditAnnouncement = (id: string) => {
    const announcement = announcements.find((a) => a.id === id);
    if (announcement) {
      setIsEditingAnnouncement(true);
      setEditingAnnouncementId(id);
      setEditText(announcement.text);
    }
  };

  const handleSaveAnnouncement = () => {
    if (editingAnnouncementId) {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === editingAnnouncementId ? { ...a, text: editText } : a
        )
      );
    }
    setIsEditingAnnouncement(false);
    setEditingAnnouncementId(null);
    setEditText("");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCancelEdit = () => {
    setIsEditingAnnouncement(false);
    setEditingAnnouncementId(null);
    setEditText("");
  };

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case "normal":
        return "bg-green-500 hover:bg-green-600";
      case "non-absent":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "absent":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-200 hover:bg-gray-300";
    }
  };

  const getStatusText = (status: DayStatus) => {
    switch (status) {
      case "normal":
        return "Normal";
      case "non-absent":
        return "Non-Absent";
      case "absent":
        return "Absent";
      default:
        return "No Data";
    }
  };

  const statistics = useMemo(() => {
    const allDays = monthlyData.flatMap((m) => m.days);
    const absentCase = allDays.filter((d) => d.status === "absent").length;
    const nonAbsentCase = allDays.filter((d) => d.status === "non-absent").length;
    const firstAidCase = incidents.filter((i) => i.type === "firstAid").length;
    const fireCase = incidents.filter((i) => i.type === "fire").length;

    const mh = Math.max(1, manHoursYear);
    // Common safety KPIs (simple version):
    // IFR ~ (Lost Time Cases * 1,000,000) / Man-hours
    // ISR ~ ((Lost Time + Recordable) * 1,000,000) / Man-hours
    const ifr = Number(((absentCase * 1_000_000) / mh).toFixed(2));
    const isr = Number((((absentCase + nonAbsentCase) * 1_000_000) / mh).toFixed(2));

    return { absentCase, nonAbsentCase, firstAidCase, fireCase, ifr, isr };
  }, [monthlyData, incidents, manHoursYear]);

  const currentMonthData = monthlyData[displayMonth];

  // Format date and time
  const formatDate = (date: Date) => {
    const dayName = DAYS_TH[date.getDay()];
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className={"h-screen w-screen bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(34,197,94,0.12),transparent_60%),linear-gradient(135deg,#0b1220,#0b1220_20%,#0f172a_55%,#0b1220)] dashboard-container overflow-hidden flex flex-col " + (displayMode ? "kiosk" : "")}>
      {/* Date and Time Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg dashboard-header shadow-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center section-gap">
            <Clock className="header-icon text-blue-400 flex-shrink-0" />
            <div>
              <p className="header-date font-bold">{formatDate(currentTime)}</p>
              <p className="header-subtitle text-gray-300">
                Safety Dashboard {currentYear}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="header-time font-bold font-mono tracking-wider text-blue-400">
              {formatTime(currentTime)}
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowSheetsSettings(true)}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white inline-flex items-center gap-1"
                title="Google Sheets settings"
              >
                <LayoutGrid className="h-3 w-3" />
                Sheets
              </button>
              {sheetsConfig.endpoint?.trim() ? (
                <button
                  onClick={pullFromSheets}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white inline-flex items-center gap-1"
                  title="Sync from Google Sheets"
                >
                  <Upload className="h-3 w-3" />
                  Sync
                </button>
              ) : null}
              <div
                className={
                  "text-[10px] px-2 py-1 rounded border inline-flex items-center gap-1 " +
                  (sheetsStatus.connected
                    ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200"
                    : sheetsConfig.endpoint?.trim()
                      ? "bg-amber-500/10 border-amber-400/40 text-amber-200"
                      : "bg-gray-800/40 border-gray-700 text-gray-300")
                }
                title={
                  sheetsStatus.error
                    ? `Sheets error: ${sheetsStatus.error}`
                    : sheetsStatus.lastPull
                      ? `Last sync: ${new Date(sheetsStatus.lastPull).toLocaleString()}`
                      : sheetsConfig.endpoint?.trim()
                        ? "Connected (waiting for first sync)"
                        : "Sheets not configured"
                }
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                {sheetsStatus.connected
                  ? "Sheets: OK"
                  : sheetsConfig.endpoint?.trim()
                    ? "Sheets: Check"
                    : "Sheets: Off"}
              </div>
              <button
                onClick={() => {
                  setDisplayMode((v) => {
                    const next = !v;
                    if (next) setDisplayView("overview");
                    return next;
                  });
                }}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white inline-flex items-center gap-1"
                title="Toggle Display Mode (for TV / kiosk screen)"
              >
                <Monitor className="h-3 w-3" />
                {displayMode ? "Exit Display" : "Display Mode"}
              </button>
              <button
                onClick={requestFullscreen}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white inline-flex items-center gap-1"
                title="Fullscreen"
              >
                <Maximize2 className="h-3 w-3" />
                Fullscreen
              </button>
              {!displayMode && (

              <button
                onClick={exportJson}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                title="Export dashboard data (JSON)"
              >
                Export
              </button>
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="text-xs px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white"
                title="Import dashboard data (JSON)"
              >
                Import
              </button>
              <input
                ref={jsonInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                }}
              />
            </div>
              )}
          </div>
        </div>
      </div>

            {displayView === "overview" && (
        <>
{/* Main Content Area - Top Section */}
      <div className="flex-1 grid grid-cols-12 dashboard-main min-h-0">
        {/* Left Section - Slogan & Streak */}
        <div className="col-span-3 flex flex-col section-gap">
          {/* Safety Slogan - Larger */}
          <div className="flex-[1.8] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-lg section-padding shadow-xl border-2 border-blue-400 flex flex-col justify-center">
            <div className="flex items-center slogan-gap mb-3">
              <Shield className="slogan-icon flex-shrink-0 text-blue-200" />
              <h2 className="slogan-title font-bold">Safety Slogan</h2>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg section-padding">
              <p className="slogan-text italic font-bold mb-2 text-center">
                "ความปลอดภัยเป็นหน้าที่ของทุกคน"
              </p>
              <p className="slogan-text-sm italic text-blue-100 text-center">
                "Safety is Everyone's Responsibility"
              </p>
            </div>
          </div>

          {/* Safety Streak - Smaller */}
          <div className="flex-1 bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-500 text-white rounded-lg section-padding-sm shadow-xl border-2 border-yellow-300 flex flex-col justify-center">
            <div className="flex items-center justify-between streak-padding">
              <div className="flex items-center streak-gap">
                <Award className="streak-icon text-yellow-100" />
                <div>
                  <p className="streak-title font-bold text-yellow-100">
                    Safety Streak
                  </p>
                  <div className="flex items-baseline streak-gap-sm">
                    <span className="streak-number font-bold text-white drop-shadow-2xl">
                      {safetyStreak}
                    </span>
                    <span className="streak-label text-yellow-100 font-semibold">
                      Days
                    </span>
                  </div>
                </div>
              </div>
              <Zap className="streak-icon text-yellow-100 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Middle Section - Targets & Statistics */}
        <div className="col-span-5 flex flex-col section-gap">
          {/* Safety Target */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-xl rounded-lg section-padding-sm">
            <h3 className="section-title font-bold text-white flex items-center">
              <Target className="section-icon text-green-400" />
              Safety Target
            </h3>
            <div className="grid grid-cols-4 target-grid">
              <div className="text-center target-item bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                <p className="target-label text-white font-medium">Zero Fatality</p>
                <p className="target-value font-bold text-white">0</p>
              </div>
              <div className="text-center target-item bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                <p className="target-label text-white font-medium">IFR Target</p>
                <p className="target-value font-bold text-white">0</p>
              </div>
              <div className="text-center target-item bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
                <p className="target-label text-white font-medium">ISR Target</p>
                <p className="target-value font-bold text-white">&lt; 3.0</p>
              </div>
              <div className="text-center target-item bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
                <p className="target-label text-white font-medium">Fire Target</p>
                <p className="target-value font-bold text-white">0</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-xl rounded-lg section-padding-sm">
            <h3 className="section-title font-bold text-white flex items-center">
              <Activity className="section-icon text-blue-400" />
              Statistics
            </h3>
            <div className="grid grid-cols-3 stat-grid">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">Absent Case</p>
                <p className="stat-value font-bold text-white">
                  {statistics.absentCase}
                </p>
                <AlertCircle className="stat-icon text-white mx-auto" />
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">Non-Absent</p>
                <p className="stat-value font-bold text-white">
                  {statistics.nonAbsentCase}
                </p>
                <Activity className="stat-icon text-white mx-auto" />
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">First Aid</p>
                <p className="stat-value font-bold text-white">
                  {statistics.firstAidCase}
                </p>
                <CheckCircle2 className="stat-icon text-white mx-auto" />
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">Fire Case</p>
                <p className="stat-value font-bold text-white">
                  {statistics.fireCase}
                </p>
                <Flame className="stat-icon text-white mx-auto" />
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">ISR</p>
                <p className="stat-value font-bold text-white">
                  {statistics.isr}
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg stat-item shadow-lg text-center">
                <p className="stat-label text-white">IFR</p>
                <p className="stat-value font-bold text-white">
                  {statistics.ifr}
                </p>
              </div>
            </div>

            {/* Inputs + Incident log */}
            <div className="mt-3 grid grid-cols-12 gap-2">
              <div className="col-span-4 bg-white/5 rounded-lg p-2 border border-gray-700">
                <label className="block text-xs text-gray-300 mb-1">Man-hours (Year)</label>
                <input
                  value={manHoursYear}
                  onChange={(e) => setManHoursYear(Number(e.target.value || 0))}
                  type="number"
                  min={0}
                  className="w-full bg-gray-900/60 text-white rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  IFR/ISR คำนวณจากเคสใน Calendar
                </p>
              </div>

              <IncidentQuickAdd
                onAdd={(incident) => setIncidents((prev) => [incident, ...prev])}
              />

              <div className="col-span-12 bg-white/5 rounded-lg p-2 border border-gray-700 max-h-28 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-200">Incident Log</div>
                  <button
                    onClick={() => setIncidents([])}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                    title="Clear incident log (local only)"
                  >
                    Clear
                  </button>
                </div>

                {incidents.length === 0 ? (
                  <div className="text-xs text-gray-400">ยังไม่มีรายการ (First Aid / Near Miss / Fire)</div>
                ) : (
                  <div className="space-y-1">
                    {incidents.slice(0, 20).map((i) => (
                      <div key={i.id} className="flex items-start justify-between gap-2 text-xs">
                        <div className="text-gray-200">
                          <span className="text-gray-400 mr-2">{i.date}</span>
                          <span className="font-semibold mr-2">[{i.type}]</span>
                          <span>{i.title}</span>
                          {i.note ? <span className="text-gray-400"> — {i.note}</span> : null}
                        </div>
                        <button
                          onClick={() => setIncidents((prev) => prev.filter((x) => x.id !== i.id))}
                          className="text-gray-300 hover:text-white"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Announcement & Policy */}
        <div className="col-span-4 flex flex-col section-gap">
          {/* Company Announcement - Dynamic Size */}
          <div
            className="bg-gradient-to-br from-orange-600 to-orange-700 border-2 border-orange-500 shadow-xl rounded-lg section-padding-sm overflow-y-auto"
            style={{
              flex: announcements.length > 2 ? "1.5" : "1",
            }}
          >
            <div className="flex items-center justify-between announcement-header">
              <h3 className="announcement-title font-bold text-white flex items-center">
                <Megaphone className="section-icon text-yellow-300" />
                Company Announcement ({announcements.length})
              </h3>
              <button
                onClick={handleAddAnnouncement}
                className="announcement-btn bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md flex items-center"
              >
                <Plus className="announcement-btn-icon" />
                Add
              </button>
            </div>

            <div className="announcement-list max-h-full overflow-y-auto flex flex-col">
              {announcements.map((announcement, index) => (
                <div
                  key={announcement.id}
                  className="bg-white/20 backdrop-blur rounded-lg announcement-item"
                >
                  {isEditingAnnouncement && editingAnnouncementId === announcement.id ? (
                    <div className="flex announcement-item">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="announcement-textarea flex-1 bg-white/20 rounded text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                      />
                      <div className="flex flex-col announcement-action-btn">
                        <button
                          onClick={handleSaveAnnouncement}
                          className="announcement-edit-btn bg-green-500 hover:bg-green-600 text-white rounded shadow-md"
                        >
                          <Save className="announcement-action-icon" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="announcement-edit-btn bg-gray-500 hover:bg-gray-600 text-white rounded shadow-md"
                        >
                          <Trash2 className="announcement-action-icon" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start announcement-item">
                      <div className="flex-1">
                        <div className="flex items-start announcement-text">
                          <span className="announcement-number font-bold text-yellow-300">
                            {index + 1}.
                          </span>
                          <p className="flex-1 announcement-text text-white font-medium leading-relaxed">
                            {announcement.text}
                          </p>
                        </div>
                      </div>
                      <div className="flex announcement-action-btn">
                        <button
                          onClick={() => handleEditAnnouncement(announcement.id)}
                          className="announcement-edit-btn bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow-md"
                        >
                          <Edit className="announcement-edit-icon" />
                        </button>
                        {announcements.length > 1 && (
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="announcement-edit-btn bg-red-500 hover:bg-red-600 text-white rounded shadow-md"
                          >
                            <Trash2 className="announcement-edit-icon" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Company Policy - Adjusted */}
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-xl rounded-lg section-padding-sm"
            style={{
              flex: announcements.length > 2 ? "0.8" : "1",
            }}
          >
            <h3 className="policy-title font-bold text-white flex items-center">
              <Shield className="section-icon text-orange-400" />
              Safety Policy
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageUpload}
              className="hidden"
            />
            {policyImage ? (
              <div className="relative group h-full">
                <img
                  src={policyImage}
                  alt="Company Safety Policy"
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                />
                <button
                  onClick={canEdit ? handleUploadClick : undefined}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                >
                  <div className="text-center text-white">
                    <Upload className="policy-change-icon mx-auto" />
                    <p className="policy-change-text font-semibold">Change</p>
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={canEdit ? handleUploadClick : undefined}
                className="policy-upload-container w-full h-full border-2 border-dashed border-gray-600 hover:border-orange-500 rounded-lg text-center bg-gray-700/30 hover:bg-gray-700/50 transition-all cursor-pointer group flex flex-col items-center justify-center"
              >
                <ImageIcon className="policy-upload-icon text-gray-400 group-hover:text-orange-400 transition-colors" />
                <p className="policy-upload-text text-gray-300 group-hover:text-white font-semibold">
                  Upload Safety Policy
                </p>
                <p className="policy-upload-hint text-gray-400">JPG, JPEG, PNG</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Calendar (Horizontal) & Year Overview */}
      <div className="grid grid-cols-12 section-gap calendar-height">
        {/* Monthly Calendar - Horizontal */}
        <div className="col-span-9 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-xl rounded-lg overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 calendar-header">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center calendar-header">
                <Calendar className="calendar-icon" />
                <div className="flex items-center calendar-title">
                  <div className="font-bold">
                    {currentMonthData && MONTHS[displayMonth]} {currentYear}
                  </div>
                  <div className="calendar-subtitle text-gray-300">
                    Daily Accident Tracking
                  </div>
                </div>
              </div>
              <div className="flex items-center calendar-title">
                {/* Legend */}
                <div className="flex items-center calendar-legend">
                  <div className="flex items-center calendar-legend-item">
                    <div className="calendar-legend-dot bg-green-500 rounded shadow"></div>
                    <span className="calendar-legend-text text-white">Normal</span>
                  </div>
                  <div className="flex items-center calendar-legend-item">
                    <div className="calendar-legend-dot bg-yellow-500 rounded shadow"></div>
                    <span className="calendar-legend-text text-white">Non-Absent</span>
                  </div>
                  <div className="flex items-center calendar-legend-item">
                    <div className="calendar-legend-dot bg-red-500 rounded shadow"></div>
                    <span className="calendar-legend-text text-white">Absent</span>
                  </div>
                </div>
                {currentMonthData?.completed && (
                  <div className="flex items-center calendar-complete bg-green-500 rounded-lg shadow-xl">
                    <CheckCircle2 className="calendar-complete-icon text-white" />
                    <span className="calendar-complete-text font-semibold">Complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 calendar-grid-container overflow-hidden">
            {/* Calendar Grid - Horizontal Layout */}
            {currentMonthData && (
              <div className="h-full bg-gray-700/30 rounded-lg calendar-grid-padding flex flex-col">
                <div className="grid grid-cols-7 calendar-grid-header">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center calendar-day-header font-bold text-gray-300"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>
                <div className="flex-1 grid grid-cols-7 calendar-grid content-start auto-rows-fr">
                  {/* Add empty cells for proper day alignment */}
                  {Array.from({
                    length: new Date(
                      currentYear,
                      displayMonth,
                      1
                    ).getDay(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {currentMonthData.days.map((day, dayIndex) => (
                    <button
                      key={day.day}
                      onClick={() => handleDayClick(displayMonth, dayIndex)}
                      className={`
                        calendar-day w-full h-full min-h-0 rounded-lg flex items-center justify-center font-bold
                        transition-all duration-200 cursor-pointer shadow-md
                        ${getStatusColor(day.status)}
                        ${day.status ? "text-white" : "text-gray-700"}
                        hover:scale-105 hover:shadow-xl
                      `}
                      title={`Day ${day.day} - ${getStatusText(day.status)}`}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Year Overview */}
        <div className="col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-xl rounded-lg section-padding-sm">
          <h3 className="year-overview-header font-bold text-white flex items-center">
            <Calendar className="year-overview-icon text-purple-400" />
            Year Overview {currentYear}
          </h3>
          <div className="grid grid-cols-3 year-grid">
            {monthlyData.map((monthData) => (
              <button
                key={monthData.month}
                onClick={() => handleMonthSelect(monthData.month)}
                className={`
                  year-month rounded-lg text-center transition-all duration-300 cursor-pointer
                  ${
                    displayMonth === monthData.month
                      ? "bg-purple-600 ring-2 ring-purple-400 scale-105 shadow-xl"
                      : monthData.completed
                      ? "bg-green-600 shadow-lg hover:bg-green-500"
                      : "bg-gray-600/50 hover:bg-gray-600"
                  }
                `}
              >
                <div className="flex items-center justify-center year-month-header">
                  <span className="year-month-name font-bold text-white">
                    {MONTHS[monthData.month].substring(0, 3)}
                  </span>
                  {monthData.completed && (
                    <CheckCircle2 className="year-month-icon text-white" />
                  )}
                </div>
                <div className="year-month-count text-gray-200">
                  {monthData.days.filter((d) => d.status === "normal").length}
                  /{monthData.days.length}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

        </>
      )}


{displayView === "poster" && (
  <div className="flex-1 min-h-0 flex flex-col section-gap">
    <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-2xl section-padding-sm">
      <div className="flex items-center section-gap">
        <LayoutGrid className="header-icon text-blue-400" />
        <div>
          <p className="header-date font-bold">Safety Poster + KPI Board</p>
          <p className="header-subtitle text-gray-300">
            Poster ครึ่งจอ + KPI ครึ่งจอ • Auto-rotates every 20s • Press ESC to exit fullscreen
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDisplayView("overview")}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center gap-1"
          title="Back to Overview"
        >
          <LayoutGrid className="h-3 w-3" />
          Overview
        </button>
        <button
          onClick={() => setDisplayView("calendar")}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center gap-1"
          title="Open Calendar"
        >
          <Calendar className="h-3 w-3" />
          Calendar
        </button>
      </div>
    </div>

    <div className="flex-1 min-h-0 grid grid-cols-12 section-gap">
      {/* LEFT: Poster (Half Screen) */}
      <div className="col-span-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
        {policyImage ? (
          <img
            src={policyImage}
            alt="Safety Policy Poster"
            className="w-full h-full object-contain bg-black/40"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <div className="text-center">
              <Shield className="mx-auto h-16 w-16 text-orange-400" />
              <p className="mt-4 text-2xl font-bold">No Policy Poster</p>
              <p className="mt-2 text-sm text-gray-400">
                Upload a Safety Policy image in Edit mode
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: KPI + Announcement (Half Screen) */}
      <div className="col-span-6 flex flex-col min-h-0 section-gap">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-xl section-padding-sm">
          <div className="flex items-center justify-between">
            <h3 className="section-title font-bold text-white flex items-center">
              <Target className="section-icon text-blue-400" />
              KPI (YTD)
            </h3>
            <span className="text-xs text-gray-400">Auto-sync via Sheets</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
              <div className="text-xs text-green-200/90">Safety Streak</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-5xl font-black text-white">{safetyStreak}</div>
                <div className="text-gray-200 font-semibold">days</div>
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-red-500/25 to-red-600/10 border border-red-500/30">
              <div className="text-xs text-red-200/90 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Absent
              </div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.absentCase}</div>
              <div className="mt-1 text-xs text-gray-300">Lost Time / Absent Case</div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-yellow-500/25 to-yellow-600/10 border border-yellow-500/30">
              <div className="text-xs text-yellow-200/90 flex items-center gap-1">
                <Activity className="h-4 w-4" /> Non-Absent
              </div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.nonAbsentCase}</div>
              <div className="mt-1 text-xs text-gray-300">Recordable (Non-Absent)</div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/25 to-blue-600/10 border border-blue-500/30">
              <div className="text-xs text-blue-200/90 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> First Aid
              </div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.firstAidCase}</div>
              <div className="mt-1 text-xs text-gray-300">First Aid Case</div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-orange-500/25 to-orange-600/10 border border-orange-500/30">
              <div className="text-xs text-orange-200/90 flex items-center gap-1">
                <Flame className="h-4 w-4" /> Fire
              </div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.fireCase}</div>
              <div className="mt-1 text-xs text-gray-300">Fire / Hot work incident</div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-500/25 to-indigo-600/10 border border-indigo-500/30">
              <div className="text-xs text-indigo-200/90">IFR</div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.ifr}</div>
              <div className="mt-1 text-xs text-gray-300">per 1,000,000 MH</div>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-500/25 to-purple-600/10 border border-purple-500/30">
              <div className="text-xs text-purple-200/90">ISR</div>
              <div className="mt-1 text-5xl font-black text-white">{statistics.isr}</div>
              <div className="mt-1 text-xs text-gray-300">per 1,000,000 MH</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-xl section-padding-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="section-title font-bold text-white flex items-center">
              <Megaphone className="section-icon text-blue-400" />
              Announcement
            </h3>
            <span className="text-xs text-gray-400">ล่าสุด</span>
          </div>

          <div className="mt-2 flex-1 min-h-0 overflow-auto rounded-2xl bg-gray-700/20 p-3">
            {announcements.length === 0 ? (
              <div className="text-gray-400 text-sm">No announcements</div>
            ) : (
              <div className="space-y-3">
                {announcements
                  .slice()
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .slice(0, 10)
                  .map((a) => (
                    <div key={a.id} className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
                      <div className="text-white font-semibold leading-snug text-lg">
                        {a.text}
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}


{displayView === "calendar" && (
  <div className="flex-1 min-h-0 flex flex-col section-gap">
    <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-2xl section-padding-sm">
      <div className="flex items-center section-gap">
        <Calendar className="header-icon text-blue-400" />
        <div>
          <p className="header-date font-bold">Daily Safety Calendar</p>
          <p className="header-subtitle text-gray-300">
            สีเขียว = ปกติ • เหลือง = Non-absent • แดง = Absent
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDisplayView("overview")}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center gap-1"
          title="Back to Overview"
        >
          <LayoutGrid className="h-3 w-3" />
          Overview
        </button>
        <button
          onClick={() => setDisplayView("poster")}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center gap-1"
          title="Open Poster"
        >
          <Shield className="h-3 w-3" />
          Poster
        </button>
      </div>
    </div>

    <div className="flex-1 min-h-0">
      <div className="h-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="h-full p-3">
          
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
