import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Edit,
  Flame,
  Image as ImageIcon,
  Lock,
  Plus,
  Save,
  Shield,
  Target,
  Trash2,
  Unlock,
  Monitor,
  Upload,
} from 'lucide-react';

import * as Recharts from 'recharts';
import nhkLogo from '@/assets/nhk-logo.png';
import holidays2026 from '@/assets/holidays_2026.json';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/app/components/ui/resizable';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

type DayStatus = 'safe' | 'near_miss' | 'accident' | null;
interface DailyStatistic { day: number; status: DayStatus }
interface MonthlyData { month: number; year: number; days: DailyStatistic[] }
interface Announcement { id: string; text: string }
interface SafetyMetric { id: string; label: string; value: string; unit?: string }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Keys are ISO dates: YYYY-MM-DD. Values are holiday notes.
const HOLIDAY_NOTES_2026: Record<string, string> = {
  '2026-01-01': 'NEW YEAR\'S DAY',
  '2026-01-02': 'NEW YEAR\'S DAY',
  '2026-01-03': 'วันหยุดสุดสัปดาห์',
  '2026-01-04': 'วันหยุดสุดสัปดาห์',
  '2026-01-10': 'วันหยุดสุดสัปดาห์',
  '2026-01-11': 'วันหยุดสุดสัปดาห์',
  '2026-01-18': 'วันหยุดสุดสัปดาห์',
  '2026-01-24': 'วันหยุดสุดสัปดาห์',
  '2026-01-25': 'วันหยุดสุดสัปดาห์',
  '2026-02-01': 'วันหยุดสุดสัปดาห์',
  '2026-02-07': 'วันหยุดสุดสัปดาห์',
  '2026-02-08': 'วันหยุดสุดสัปดาห์',
  '2026-02-15': 'วันหยุดสุดสัปดาห์',
  '2026-02-21': 'วันหยุดสุดสัปดาห์',
  '2026-02-28': 'วันหยุดสุดสัปดาห์',
  '2026-03-01': 'วันหยุดสุดสัปดาห์',
  '2026-03-02': 'วันหยุดพิเศษ',
  '2026-03-03': 'MAKHABUCHA DAY',
  '2026-03-07': 'วันหยุดสุดสัปดาห์',
  '2026-03-08': 'วันหยุดสุดสัปดาห์',
  '2026-03-15': 'วันหยุดสุดสัปดาห์',
  '2026-03-21': 'วันหยุดสุดสัปดาห์',
  '2026-03-22': 'วันหยุดสุดสัปดาห์',
  '2026-03-29': 'วันหยุดสุดสัปดาห์',
  '2026-04-04': 'วันหยุดสุดสัปดาห์',
  '2026-04-05': 'วันหยุดสุดสัปดาห์',
  '2026-04-11': 'วันหยุดสุดสัปดาห์',
  '2026-04-12': 'วันหยุดสุดสัปดาห์',
  '2026-04-13': 'SONGKRAN DAY',
  '2026-04-14': 'SONGKRAN DAY',
  '2026-04-15': 'SONGKRAN DAY',
  '2026-04-16': 'วันหยุดพิเศษ',
  '2026-04-17': 'วันหยุดพิเศษ',
  '2026-04-18': 'วันหยุดสุดสัปดาห์',
  '2026-04-19': 'วันหยุดสุดสัปดาห์',
  '2026-04-26': 'วันหยุดสุดสัปดาห์',
  '2026-05-01': 'NATIONAL LABOUR DAY',
  '2026-05-02': 'วันหยุดสุดสัปดาห์',
  '2026-05-03': 'วันหยุดสุดสัปดาห์',
  '2026-05-04': 'CORONATION DAY',
  '2026-05-10': 'วันหยุดสุดสัปดาห์',
  '2026-05-16': 'วันหยุดสุดสัปดาห์',
  '2026-05-17': 'วันหยุดสุดสัปดาห์',
  '2026-05-23': 'วันหยุดสุดสัปดาห์',
  '2026-05-24': 'วันหยุดสุดสัปดาห์',
  '2026-05-30': 'วันหยุดสุดสัปดาห์',
  '2026-05-31': 'วันหยุดสุดสัปดาห์',
  '2026-06-01': 'SUBSTITUTE VISAKHABUCHA DAY',
  '2026-06-02': 'วันหยุดพิเศษ',
  '2026-06-03': 'H.M. THE QUEEN\'S BIRTHDAY',
  '2026-06-07': 'วันหยุดสุดสัปดาห์',
  '2026-06-13': 'วันหยุดสุดสัปดาห์',
  '2026-06-14': 'วันหยุดสุดสัปดาห์',
  '2026-06-21': 'วันหยุดสุดสัปดาห์',
  '2026-06-27': 'วันหยุดสุดสัปดาห์',
  '2026-06-28': 'วันหยุดสุดสัปดาห์',
  '2026-07-04': 'วันหยุดสุดสัปดาห์',
  '2026-07-05': 'วันหยุดสุดสัปดาห์',
  '2026-07-11': 'วันหยุดสุดสัปดาห์',
  '2026-07-12': 'วันหยุดสุดสัปดาห์',
  '2026-07-19': 'วันหยุดสุดสัปดาห์',
  '2026-07-25': 'วันหยุดสุดสัปดาห์',
  '2026-07-26': 'วันหยุดสุดสัปดาห์',
  '2026-07-27': 'วันหยุดพิเศษ',
  '2026-07-28': 'H.M. THE KING\'S BIRTHDAY',
  '2026-07-29': 'A-SARNHA BUCHA DAY',
  '2026-08-02': 'วันหยุดสุดสัปดาห์',
  '2026-08-08': 'วันหยุดสุดสัปดาห์',
  '2026-08-09': 'วันหยุดสุดสัปดาห์',
  '2026-08-12': 'MOTHER\'S DAY',
  '2026-08-16': 'วันหยุดสุดสัปดาห์',
  '2026-08-22': 'วันหยุดสุดสัปดาห์',
  '2026-08-23': 'วันหยุดสุดสัปดาห์',
  '2026-08-29': 'วันหยุดสุดสัปดาห์',
  '2026-08-30': 'วันหยุดสุดสัปดาห์',
  '2026-09-05': 'วันหยุดสุดสัปดาห์',
  '2026-09-06': 'วันหยุดสุดสัปดาห์',
  '2026-09-13': 'วันหยุดสุดสัปดาห์',
  '2026-09-19': 'วันหยุดสุดสัปดาห์',
  '2026-09-20': 'วันหยุดสุดสัปดาห์',
  '2026-09-26': 'วันหยุดสุดสัปดาห์',
  '2026-09-27': 'วันหยุดสุดสัปดาห์',
  '2026-10-03': 'วันหยุดสุดสัปดาห์',
  '2026-10-04': 'วันหยุดสุดสัปดาห์',
  '2026-10-10': 'วันหยุดสุดสัปดาห์',
  '2026-10-11': 'วันหยุดสุดสัปดาห์',
  '2026-10-12': 'วันหยุดพิเศษ',
  '2026-10-13': 'RAMA IX MEMORIAL DAY',
  '2026-10-17': 'วันหยุดสุดสัปดาห์',
  '2026-10-18': 'วันหยุดสุดสัปดาห์',
  '2026-10-23': 'KING CHULALONGKORN DAY',
  '2026-10-24': 'วันหยุดสุดสัปดาห์',
  '2026-10-25': 'วันหยุดสุดสัปดาห์',
  '2026-10-31': 'วันหยุดสุดสัปดาห์',
  '2026-11-01': 'วันหยุดสุดสัปดาห์',
  '2026-11-07': 'วันหยุดสุดสัปดาห์',
  '2026-11-08': 'วันหยุดสุดสัปดาห์',
  '2026-11-14': 'วันหยุดสุดสัปดาห์',
  '2026-11-15': 'วันหยุดสุดสัปดาห์',
  '2026-11-21': 'วันหยุดสุดสัปดาห์',
  '2026-11-22': 'วันหยุดสุดสัปดาห์',
  '2026-11-28': 'วันหยุดสุดสัปดาห์',
  '2026-11-29': 'วันหยุดสุดสัปดาห์',
  '2026-12-05': 'วันหยุดสุดสัปดาห์',
  '2026-12-06': 'วันหยุดสุดสัปดาห์',
  '2026-12-07': 'SUBSTITUTE NATION DAY',
  '2026-12-12': 'วันหยุดสุดสัปดาห์',
  '2026-12-13': 'วันหยุดสุดสัปดาห์',
  '2026-12-19': 'วันหยุดสุดสัปดาห์',
  '2026-12-26': 'วันหยุดสุดสัปดาห์',
  '2026-12-27': 'วันหยุดสุดสัปดาห์',
  '2026-12-28': 'วันหยุดพิเศษ',
  '2026-12-29': 'วันหยุดพิเศษ',
  '2026-12-30': 'วันหยุดพิเศษ',
  '2026-12-31': 'NEW YEAR\'S EVE',
};

const AUTO_SAFE_HOUR = 16;

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', text: 'PPE Audit ประจำสัปดาห์ทุกวันพฤหัสบดี เวลา 09:00 น.' },
  { id: '2', text: 'Emergency Drill ไตรมาสนี้กำหนดวันที่ 28 มีนาคม 2026' },
];

const DEFAULT_METRICS: SafetyMetric[] = [
  { id: 'm1', label: 'First Aid', value: '0', unit: 'case' },
  { id: 'm2', label: 'Non-Absent', value: '0', unit: 'case' },
  { id: 'm3', label: 'Absent', value: '0', unit: 'case' },
  { id: 'm4', label: 'Fire', value: '0', unit: 'case' },
  { id: 'm5', label: 'IFR', value: '0', unit: '' },
  { id: 'm6', label: 'ISR', value: '1.2', unit: '' },
];

const DEFAULT_POSTER_TOP = '/company-policy-poster.png';
const DEFAULT_POSTER_BOTTOM = '/safety-culture.png';
const DEFAULT_POLICY_IMAGES: string[] = ['/policy-vp.png', '/policy-fgm.jpg'];

type MetricToneKey = 'firstAid' | 'nonAbsent' | 'absent' | 'fire' | 'neutral';

function metricToneKey(label: string): MetricToneKey {
  const l = label.trim().toLowerCase();
  if (l === 'first aid' || l.includes('first aid')) return 'firstAid';
  if (l === 'non-absent' || l.includes('non absent') || l.includes('non-absent')) return 'nonAbsent';
  if (l === 'absent' || (l.includes('absent') && !l.includes('non'))) return 'absent';
  if (l === 'fire' || l.includes('fire')) return 'fire';
  return 'neutral';
}

function metricAccentStyle(tone: MetricToneKey) {
  const varName = tone === 'neutral' ? 'var(--tone-cyan-600)' : `var(--color-${tone})`;
  return {
    borderColor: `color-mix(in oklab, ${varName} 35%, white)`,
    background:
      tone === 'neutral'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(236,254,255,0.9))'
        : `linear-gradient(135deg, rgba(255,255,255,0.95), color-mix(in oklab, ${varName} 18%, white))`,
  } as React.CSSProperties;
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function uid(prefix='id'){ return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`; }

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


const AUTO_WORKDAY_HOUR = 4;

const HOLIDAY_SET_2026 = new Set(Object.keys(HOLIDAY_NOTES_2026));

function isHoliday(iso: string, year: number): boolean {
  if (year === 2026) return HOLIDAY_SET_2026.has(iso);
  // Fallback: weekend-only if not 2026
  const dt = new Date(iso + 'T00:00:00');
  const wd = dt.getDay();
  return wd === 0 || wd === 6;
}

function workingDaysYear(year: number): number {
  if (year === 2026) return 365 - HOLIDAY_SET_2026.size;
  // Fallback: Mon-Fri count
  let count = 0;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) count += 1;
  }
  return count;
}

function workingDaysToDate(now: Date, year: number): number {
  if (now.getFullYear() !== year) return 0;
  const end = new Date(now);
  if (end.getHours() < AUTO_WORKDAY_HOUR) end.setDate(end.getDate() - 1);
  end.setHours(0, 0, 0, 0);

  const start = new Date(year, 0, 1);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISODate(d);
    if (!isHoliday(iso, year)) count += 1;
  }
  return count;
}


function nextDayStatus(status: DayStatus): DayStatus {
  if (status === null) return 'safe';
  if (status === 'safe') return 'near_miss';
  if (status === 'near_miss') return 'accident';
  return null;
}

function createYearData(year:number): MonthlyData[] {
  return Array.from({length:12}, (_,m)=> ({
    month:m, year,
    days: Array.from({length:new Date(year,m+1,0).getDate()},(_,i)=>({day:i+1,status:null}))
  }));
}

function isValidMonthlyData(data: unknown, year:number): data is MonthlyData[] {
  return Array.isArray(data) && data.length===12 && data.every((m:any, idx)=>
    m && m.month===idx && m.year===year && Array.isArray(m.days) && m.days.length===new Date(year, idx+1, 0).getDate()
  );
}

function applyAutoSafe(prev: MonthlyData[], now: Date, year: number): MonthlyData[] {
  if (now.getFullYear() !== year) return prev;
  const todayStart = new Date(year, now.getMonth(), now.getDate());
  const afterCutoff = (now.getHours() > AUTO_SAFE_HOUR) || (now.getHours() === AUTO_SAFE_HOUR && now.getMinutes() >= 0);

  let next: MonthlyData[] | null = null;
  const ensureNext = () => {
    if (!next) next = prev.map((mm) => ({ ...mm, days: mm.days.map((dd) => ({ ...dd })) }));
    return next;
  };

  let changed = false;

  for (let m = 0; m < 12; m++) {
    const month = prev[m];
    if (!month) continue;
    for (let i = 0; i < month.days.length; i++) {
      const dd = month.days[i];
      if (dd.status !== null) continue;
      const dt = new Date(year, m, dd.day);
      if (dt < todayStart) {
        const tgt = ensureNext()[m].days[i];
        tgt.status = 'safe';
        changed = true;
        continue;
      }
      if (afterCutoff && m === now.getMonth() && dd.day === now.getDate()) {
        const tgt = ensureNext()[m].days[i];
        tgt.status = 'safe';
        changed = true;
      }
    }
  }

  return changed && next ? next : prev;
}

const BASE_VIEWPORT = { width: 1920, height: 1080 };
function rootFontSize(w:number,h:number){
  const scale = Math.min(w/BASE_VIEWPORT.width, h/BASE_VIEWPORT.height);
  return clamp(16 * Math.pow(Math.max(scale,0.35), 0.45), 14, 24);
}

function panelScaleFromSize(w:number,h:number){
  const ratio = Math.min(w/560, h/360);
  return clamp(Math.pow(Math.max(ratio, 0.35), 0.42), 0.68, 1.18);
}

function scaledPx(base:number, panelScale:number, min?:number, max?:number){
  const px = clamp(base * panelScale, min ?? base*0.8, max ?? base*1.35);
  return `${px/16}rem`;
}

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const dateLabel = now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="flex flex-col items-center tabular-nums leading-none">
      <div className="font-extrabold text-slate-800 header-date">{dateLabel}</div>
      <div className="font-black text-slate-900 header-time mt-1">{timeLabel}</div>
    </div>
  );
}

function Card({
  title,
  icon,
  actions,
  titleEditable=false,
  onTitleClick,
  children,
  className='',
  bodyClassName='',
  tone='sky',
  panelScale=1,
}:{
  title:string;
  icon:React.ReactNode;
  actions?: React.ReactNode;
  titleEditable?: boolean;
  onTitleClick?: () => void;
  children:React.ReactNode;
  className?:string;
  bodyClassName?: string;
  tone?: 'sky'|'amber'|'green'|'blue'|'teal'|'slate';
  panelScale?: number;
}) {
  const toneMap = {
    sky: {
      outer: 'border-sky-200 bg-gradient-to-b from-sky-50/70 to-white',
      header: 'from-sky-100 via-white to-sky-50 border-sky-200',
      body: 'bg-gradient-to-b from-white to-sky-50/25',
    },
    amber: {
      outer: 'border-amber-200 bg-gradient-to-b from-amber-50/80 to-white',
      header: 'from-amber-100 via-white to-yellow-50 border-amber-200',
      body: 'bg-gradient-to-b from-white to-amber-50/20',
    },
    green: {
      outer: 'border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white',
      header: 'from-emerald-100 via-white to-lime-50 border-emerald-200',
      body: 'bg-gradient-to-b from-white to-emerald-50/20',
    },
    blue: {
      outer: 'border-blue-200 bg-gradient-to-b from-blue-50/70 to-white',
      header: 'from-blue-100 via-white to-cyan-50 border-blue-200',
      body: 'bg-gradient-to-b from-white to-blue-50/20',
    },
    teal: {
      outer: 'border-cyan-200 bg-gradient-to-b from-cyan-50/70 to-white',
      header: 'from-cyan-100 via-white to-teal-50 border-cyan-200',
      body: 'bg-gradient-to-b from-white to-cyan-50/20',
    },
    slate: {
      outer: 'border-slate-200 bg-gradient-to-b from-slate-50/70 to-white',
      header: 'from-slate-100 via-white to-slate-50 border-slate-200',
      body: 'bg-gradient-to-b from-white to-slate-50/25',
    },
  } as const;
  // Defensive fallback: if an unexpected tone is passed (e.g., from older saved layout/state)
  // avoid crashing the whole dashboard.
  const toneCls = (toneMap as any)[tone] ?? toneMap.sky;
  return (
    <section className={`rounded-2xl border shadow-sm min-h-0 flex flex-col overflow-hidden ${toneCls.outer} ${className}`}>
      <div className={`relative px-4 py-3 border-b bg-gradient-to-r ${toneCls.header} flex items-center gap-2 text-slate-800 font-semibold`}>
        <div className="h-7 w-7 rounded-lg bg-white/80 border border-white shadow-sm flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="min-w-0 truncate font-extrabold tracking-tight" style={{ fontSize: scaledPx(17, panelScale, 14, 22) }}>
          {titleEditable && onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="group inline-flex items-center gap-2 min-w-0 truncate hover:underline edit-only"
              title="Rename panel"
            >
              <span className="min-w-0 truncate">{title}</span>
              <Edit className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <span className="min-w-0 truncate">{title}</span>
          )}
        </h2>
        {actions ? (
          <div className="ml-auto flex items-center gap-1 card-actions edit-only">
            {actions}
          </div>
        ) : null}
      </div>
      <div className={`p-3 min-h-0 flex-1 overflow-hidden flex flex-col ${toneCls.body} ${bodyClassName}`} style={{ fontSize: scaledPx(14, 0.95 + (panelScale-1)*0.35, 11, 16) }}>{children}</div>
    </section>
  );
}

function PanelWrap({
  children,
}: {
  children: (panelScale: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const next = panelScaleFromSize(rect.width, rect.height);
        setScale((prev) => (Math.abs(prev - next) > 0.02 ? next : prev));
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className="h-full min-h-0">
      {children(scale)}
    </div>
  );
}

function safeEval(expr: string, vars: Record<string, number>): number | null {
  const s = (expr || '').trim();
  if (!s) return null;
  // allow only numbers, identifiers, operators and parentheses
  if (!/^[0-9a-zA-Z_+\-*/().\s]*$/.test(s)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('vars', `with(vars){ return (${s}); }`) as (v: Record<string, number>) => unknown;
    const out = fn(vars);
    if (typeof out === 'number' && Number.isFinite(out)) return out;
    return null;
  } catch {
    return null;
  }
}

function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

type TargetVars = {
  manpower: number;
  daysPerWeek: number;
  hoursPerDay: number;
  workingDaysYear: number;
  workingDaysSoFar: number;
};

const DEFAULT_TARGET_VARS: TargetVars = {
  manpower: 675,
  daysPerWeek: 6,
  hoursPerDay: 10,
  workingDaysYear: 250,
  workingDaysSoFar: 0,
};


export function SafetyDashboard() {
  const now = new Date();
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(() => createYearData(now.getFullYear()));

  // Posters (left column)
  const [posterTop, setPosterTop] = useState<string | null>(DEFAULT_POSTER_TOP);
  const [posterBottom, setPosterBottom] = useState<string | null>(DEFAULT_POSTER_BOTTOM);
  const [posterTopZoom, setPosterTopZoom] = useState(1);
  const [posterBottomZoom, setPosterBottomZoom] = useState(1);

  // Safety Policy (top-middle): up to 2 images
  const [policyImages, setPolicyImages] = useState<string[]>(DEFAULT_POLICY_IMAGES);
  const [policyZoom, setPolicyZoom] = useState(1);

  // Graph panels (4 slots)
  const [graphImages, setGraphImages] = useState<(string | null)[]>([null, null, null, null]);
  const [graphZooms, setGraphZooms] = useState<number[]>([1, 1, 1, 1]);
  const graphInputRefs = useRef<(HTMLInputElement | null)[]>([]);


// Data tables for graphs (editable on web)
type MonthlyTable = { items: number[]; actions: number[] }; // length 12
type MachineRow = { id: string; area: string; problem: number; action: number };
type RankCol = { id: string; name: string; items: number; action: number };

const [monthlyTable, setMonthlyTable] = useState<MonthlyTable>(() => ({
  items: [37, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  actions: [17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}));

const [machineRows, setMachineRows] = useState<MachineRow[]>(() => ([
  { id: uid('mc'), area: 'STB-C Showering Robot', problem: 17, action: 9 },
  { id: uid('mc'), area: 'Truck Robot Eye Grinding', problem: 13, action: 8 },
  { id: uid('mc'), area: 'Truck Auto Eye No.2', problem: 2, action: 1 },
  { id: uid('mc'), area: 'Truck Robot Shot C', problem: 6, action: 5 },
]));

const [rankCols, setRankCols] = useState<RankCol[]>(() => ([
  { id: uid('rk'), name: 'Rank A', items: 0, action: 0 },
  { id: uid('rk'), name: 'Rank B', items: 0, action: 0 },
  { id: uid('rk'), name: 'Rank C', items: 14, action: 3 },
]));


  // Target + metrics (center-bottom)
  const [targetVars, setTargetVars] = useState<TargetVars>(DEFAULT_TARGET_VARS);
  const [bestRecord, setBestRecord] = useState<number>(0);
  const [lossTimeAccidents, setLossTimeAccidents] = useState<number>(0);
  const [lastUpdateIso, setLastUpdateIso] = useState<string>(() => new Date().toISOString());

  const [metrics, setMetrics] = useState<SafetyMetric[]>(DEFAULT_METRICS);

  // Announcement ticker
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);

  const [layoutLocked, setLayoutLocked] = useState(true);
  const [displayMode, setDisplayMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('safety-dashboard-mode');
      return raw ? raw === 'display' : true;
    } catch {
      return true;
    }
  });
  const [uiScale, setUiScale] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('safety-dashboard-ui-scale');
      const v = raw ? Number(raw) : 1;
      return Number.isFinite(v) ? clamp(v, 0.8, 1.4) : 1;
    } catch {
      return 1;
    }
  });

  // Panel title overrides (rename headers)
  const [panelTitles, setPanelTitles] = useState<Record<string, string>>({});
  const [renamePanel, setRenamePanel] = useState<null | { key: string; draft: string; fallback: string }>(null);

  // dialogs
  const [editMetrics, setEditMetrics] = useState(false);
  const [metricsDraft, setMetricsDraft] = useState<SafetyMetric[]>([]);

  const [editTarget, setEditTarget] = useState(false);
  const [targetVarsDraft, setTargetVarsDraft] = useState<TargetVars>(DEFAULT_TARGET_VARS);
  const [bestRecordDraft, setBestRecordDraft] = useState('0');
  const [lossTimeAccidentsDraft, setLossTimeAccidentsDraft] = useState('0');

  const [editTicker, setEditTicker] = useState(false);
  const [tickerDraft, setTickerDraft] = useState('');

  // file inputs
  const posterTopInputRef = useRef<HTMLInputElement>(null);
  const posterBottomInputRef = useRef<HTMLInputElement>(null);
  const policyReplaceInputRef = useRef<HTMLInputElement>(null);
  const policyAddInputRef = useRef<HTMLInputElement>(null);

  const storageKey = `safety-dashboard-${currentYear}`;

  // Auto SAFE scheduler (16:00) + backfill
  useEffect(() => {
    const now = new Date();
    if (now.getFullYear() !== currentYear) return;

    let timer: number | undefined;

    const scheduleNext = () => {
      const current = new Date();
      const next = new Date(current);
      next.setHours(AUTO_SAFE_HOUR, 0, 0, 0);
      if (current.getTime() >= next.getTime()) next.setDate(next.getDate() + 1);

      const ms = Math.max(250, next.getTime() - current.getTime());
      timer = window.setTimeout(() => {
        const fireNow = new Date();
        setMonthlyData((prev) => applyAutoSafe(prev, fireNow, currentYear));
        scheduleNext();
      }, ms);
    };

    scheduleNext();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [currentYear]);

  // Root font size scaled for TV
  useEffect(() => {
    const onResize = () => {
      const root = document.documentElement;
      const base = rootFontSize(window.innerWidth, window.innerHeight);
      root.style.setProperty('--font-size', `${base * uiScale}px`);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [uiScale]);

  useEffect(() => {
    try { localStorage.setItem('safety-dashboard-ui-scale', String(uiScale)); } catch {}
  }, [uiScale]);

  useEffect(() => {
    try { localStorage.setItem('safety-dashboard-mode', displayMode ? 'display' : 'edit'); } catch {}
  }, [displayMode]);


// Auto-calc working days (year + to-date) from calendar (highlighted holidays)
useEffect(() => {
  const update = () => {
    const nowDt = new Date();
    const wdYear = workingDaysYear(currentYear);
    const wdSoFar = workingDaysToDate(nowDt, currentYear);
    setTargetVars((p) => ({ ...p, workingDaysYear: wdYear, workingDaysSoFar: wdSoFar }));
    setTargetVarsDraft((p) => ({ ...p, workingDaysYear: wdYear, workingDaysSoFar: wdSoFar }));
  };

  update();

  let timer: number | null = null;
  const scheduleNext = () => {
    const nowDt = new Date();
    const next = new Date(nowDt);
    next.setHours(AUTO_WORKDAY_HOUR, 0, 0, 0);
    if (next.getTime() <= nowDt.getTime()) next.setDate(next.getDate() + 1);
    const ms = Math.max(250, next.getTime() - nowDt.getTime());
    timer = window.setTimeout(() => {
      update();
      scheduleNext();
    }, ms);
  };
  scheduleNext();

  return () => {
    if (timer) window.clearTimeout(timer);
  };
}, [currentYear]);


  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setMonthlyData(applyAutoSafe(createYearData(currentYear), new Date(), currentYear));
        return;
      }
      const parsed = JSON.parse(raw);
      const loadedMonthly = isValidMonthlyData(parsed.monthlyData, currentYear) ? parsed.monthlyData : createYearData(currentYear);
      setMonthlyData(applyAutoSafe(loadedMonthly, new Date(), currentYear));

      setAnnouncements(Array.isArray(parsed.announcements) && parsed.announcements.length ? parsed.announcements : DEFAULT_ANNOUNCEMENTS);

      // Posters
      setPosterTop(typeof parsed.posterTop === 'string' ? parsed.posterTop : DEFAULT_POSTER_TOP);
      setPosterBottom(typeof parsed.posterBottom === 'string' ? parsed.posterBottom : DEFAULT_POSTER_BOTTOM);
      setPosterTopZoom(typeof parsed.posterTopZoom === 'number' ? clamp(parsed.posterTopZoom, 0.5, 1) : 1);
      setPosterBottomZoom(typeof parsed.posterBottomZoom === 'number' ? clamp(parsed.posterBottomZoom, 0.5, 1) : 1);

      // Safety Policy images
      if (Array.isArray(parsed.policyImages) && parsed.policyImages.length) {
        setPolicyImages(parsed.policyImages.slice(0, 2));
      } else {
        setPolicyImages(DEFAULT_POLICY_IMAGES);
      }
      setPolicyZoom(typeof parsed.policyZoom === 'number' ? clamp(parsed.policyZoom, 0.5, 1) : 1);
      // Graphs
      if (Array.isArray(parsed.graphImages) && parsed.graphImages.length) {
        setGraphImages(parsed.graphImages.slice(0, 4).map((v: any) => (typeof v === 'string' ? v : null)));
      }
      if (Array.isArray(parsed.graphZooms) && parsed.graphZooms.length) {
        setGraphZooms(parsed.graphZooms.slice(0, 4).map((v: any) => (typeof v === 'number' ? clamp(v, 0.5, 1) : 1)));
      }



// Graph data tables
if (parsed.monthlyTable && typeof parsed.monthlyTable === 'object') {
  const mt = parsed.monthlyTable as any;
  if (Array.isArray(mt.items) && Array.isArray(mt.actions) && mt.items.length === 12 && mt.actions.length === 12) {
    setMonthlyTable({
      items: mt.items.map((v: any) => Number(v) || 0).slice(0, 12),
      actions: mt.actions.map((v: any) => Number(v) || 0).slice(0, 12),
    });
  }
}
if (Array.isArray(parsed.machineRows)) {
  setMachineRows(parsed.machineRows.map((r: any) => ({
    id: typeof r.id === 'string' ? r.id : uid('mc'),
    area: typeof r.area === 'string' ? r.area : '',
    problem: Number(r.problem) || 0,
    action: Number(r.action) || 0,
  })));
}
if (Array.isArray(parsed.rankCols)) {
  setRankCols(parsed.rankCols.map((c: any) => ({
    id: typeof c.id === 'string' ? c.id : uid('rk'),
    name: typeof c.name === 'string' ? c.name : 'Rank',
    items: Number(c.items) || 0,
    action: Number(c.action) || 0,
  })));
}

      // Target
      {
      const base = (parsed.targetVars && typeof parsed.targetVars === 'object') ? (parsed.targetVars as Record<string, unknown>) : {};
      const mp = Number(base.manpower);
      const dpw = Number(base.daysPerWeek);
      const hpd = Number(base.hoursPerDay);
      setTargetVars({
        ...DEFAULT_TARGET_VARS,
        manpower: Number.isFinite(mp) ? mp : DEFAULT_TARGET_VARS.manpower,
        daysPerWeek: Number.isFinite(dpw) ? dpw : DEFAULT_TARGET_VARS.daysPerWeek,
        hoursPerDay: Number.isFinite(hpd) ? hpd : DEFAULT_TARGET_VARS.hoursPerDay,
        workingDaysYear: workingDaysYear(currentYear),
        workingDaysSoFar: workingDaysToDate(new Date(), currentYear),
      });
    }
      setBestRecord(Number.isFinite(Number(parsed.bestRecord)) ? Number(parsed.bestRecord) : 0);
      setLossTimeAccidents(Number.isFinite(Number(parsed.lossTimeAccidents)) ? Number(parsed.lossTimeAccidents) : 0);
      setLastUpdateIso(typeof parsed.lastUpdateIso === 'string' ? parsed.lastUpdateIso : new Date().toISOString());

      // Metrics
      setMetrics(Array.isArray(parsed.metrics) && parsed.metrics.length ? parsed.metrics : DEFAULT_METRICS);

      // Panel titles
      if (parsed.panelTitles && typeof parsed.panelTitles === 'object') {
        const obj = parsed.panelTitles as Record<string, unknown>;
        const clean: Record<string, string> = {};
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === 'string' && v.trim()) clean[k] = v;
        }
        setPanelTitles(clean);
      } else {
        setPanelTitles({});
      }

    } catch {
      setMonthlyData(applyAutoSafe(createYearData(currentYear), new Date(), currentYear));
    }
  }, [storageKey, currentYear]);

  // Persist state (debounced)
  useEffect(() => {
    const payload = {
      monthlyData,
      announcements,
      posterTop,
      posterBottom,
      posterTopZoom,
      posterBottomZoom,
      policyImages,
      policyZoom,
      graphImages,
      graphZooms,
      monthlyTable,
      machineRows,
      rankCols,
      targetVars,
      bestRecord,
      lossTimeAccidents,
      lastUpdateIso,
      metrics,
      panelTitles,
    };
    const t = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    storageKey,
    monthlyData,
    announcements,
    posterTop,
    posterBottom,
    posterTopZoom,
    posterBottomZoom,
    policyImages,
    policyZoom,
    targetVars,
    bestRecord,
    lossTimeAccidents,
    lastUpdateIso,
    metrics,
    graphImages,
    graphZooms,
    monthlyTable,
    machineRows,
    rankCols,
    panelTitles,
  ]);

  const displayMonthData = monthlyData[displayMonth];

  const safetyStreak = useMemo(() => {
    const nowDt = new Date();
    const y = nowDt.getFullYear();
    if (y !== currentYear) return 0;

    const todayM = nowDt.getMonth();
    const todayD = nowDt.getDate();
    const todayStatus = monthlyData[todayM]?.days?.[todayD - 1]?.status ?? null;

    // If today's status isn't set yet (e.g., before 16:00), count streak up to yesterday.
    const end = (todayStatus === 'safe' || todayStatus === 'near_miss')
      ? new Date(y, todayM, todayD)
      : new Date(y, todayM, todayD - 1);

    if (end.getFullYear() !== y) return 0;

    let streak = 0;
    for (let dt = new Date(end); ; ) {
      const m = dt.getMonth();
      const d = dt.getDate();
      const st = monthlyData[m]?.days?.[d - 1]?.status ?? null;

      // Count SAFE and NEAR MISS as streak days; break on ACCIDENT or NOT SET.
      if (st === 'safe' || st === 'near_miss') streak += 1;
      else break;

      dt.setDate(dt.getDate() - 1);
      if (dt.getFullYear() !== y) break;
    }
    return streak;
  }, [monthlyData, currentYear]);

  const monthSummary = useMemo(() => {
    if (!displayMonthData) return { safe: 0, near: 0, accident: 0 };
    let safe = 0, near = 0, accident = 0;
    for (const d of displayMonthData.days) {
      if (d.status === 'safe') safe += 1;
      if (d.status === 'near_miss') near += 1;
      if (d.status === 'accident') accident += 1;
    }
    return { safe, near, accident };
  }, [displayMonthData]);

  const firstDayOffset = useMemo(() => new Date(currentYear, displayMonth, 1).getDay(), [currentYear, displayMonth]);
  const daysInMonth = useMemo(() => new Date(currentYear, displayMonth + 1, 0).getDate(), [currentYear, displayMonth]);
  const gridCells = useMemo(() => {
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < firstDayOffset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    while (cells.length % 7 !== 0) cells.push({ day: null });
    return cells;
  }, [firstDayOffset, daysInMonth]);

  const setDayStatus = (day: number, status: DayStatus) => {
    setMonthlyData((prev) => {
      const next = prev.map((mm) => ({ ...mm, days: mm.days.map((dd) => ({ ...dd })) }));
      const month = next[displayMonth];
      if (!month) return prev;
      const target = month.days[day - 1];
      if (!target) return prev;
      target.status = status;
      return next;
    });
  };

  const cycleDayStatus = (day: number) => {
    const current = displayMonthData?.days?.[day - 1]?.status ?? null;
    setDayStatus(day, nextDayStatus(current));
  };

  const resetLayout = () => {
    try {
      localStorage.removeItem('react-resizable-panels:nhk-safety-layout-v2-structure');
    } catch {}
    try { window.location.reload(); } catch {}
  };

  const titleFor = useCallback((key: string, fallback: string) => {
    const v = panelTitles?.[key];
    return typeof v === 'string' && v.trim() ? v : fallback;
  }, [panelTitles]);

  const openRenameTitle = useCallback((key: string, fallback: string) => {
    const current = titleFor(key, fallback);
    setRenamePanel({ key, draft: current, fallback });
  }, [titleFor]);

  const saveRenameTitle = useCallback(() => {
    if (!renamePanel) return;
    const nextTitle = (renamePanel.draft || '').trim();
    setPanelTitles((prev) => {
      const next = { ...(prev || {}) };
      if (!nextTitle || nextTitle === renamePanel.fallback) delete next[renamePanel.key];
      else next[renamePanel.key] = nextTitle;
      return next;
    });
    setRenamePanel(null);
    setLastUpdateIso(new Date().toISOString());
  }, [renamePanel]);

  // ---- Upload helpers
  const readFileToDataUrl = (file: File, cb: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPosterTopSelected = (file?: File | null) => {
    if (!file) return;
    readFileToDataUrl(file, (url) => {
      setPosterTop(url);
      setPosterTopZoom(1);
      setLastUpdateIso(new Date().toISOString());
    });
  };

  const onPosterBottomSelected = (file?: File | null) => {
    if (!file) return;
    readFileToDataUrl(file, (url) => {
      setPosterBottom(url);
      setPosterBottomZoom(1);
      setLastUpdateIso(new Date().toISOString());
    });
  };

  const onPolicyReplaceSelected = (file?: File | null) => {
    if (!file) return;
    readFileToDataUrl(file, (url) => {
      setPolicyImages((p) => {
        const next = [...p];
        next[0] = url;
        return next.slice(0, 2);
      });
      setPolicyZoom(1);
      setLastUpdateIso(new Date().toISOString());
    });
  };

  const onPolicyAddSelected = (file?: File | null) => {
    if (!file) return;
    readFileToDataUrl(file, (url) => {
      setPolicyImages((p) => {
        const next = [...p];
        if (next.length < 2) next.push(url);
        else next[1] = url;
        return next.slice(0, 2);
      });
      setPolicyZoom(1);
      setLastUpdateIso(new Date().toISOString());
    });
  };
  const onGraphSelected = (index: number, file?: File | null) => {
    if (!file) return;
    readFileToDataUrl(file, (url) => {
      setGraphImages((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setGraphZooms((prev) => {
        const next = [...prev];
        next[index] = 1;
        return next;
      });
      setLastUpdateIso(new Date().toISOString());
    });
  };

  const clearGraph = (index: number) => {
    setGraphImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setGraphZooms((prev) => {
      const next = [...prev];
      next[index] = 1;
      return next;
    });
    setLastUpdateIso(new Date().toISOString());
  };

  const zoomGraph = (index: number, delta: number) => {
    setGraphZooms((prev) => {
      const next = [...prev];
      next[index] = clamp((next[index] ?? 1) + delta, 0.5, 1);
      return next;
    });
  };


  // ---- Editors
  const openMetricsEditor = useCallback(() => {
    setMetricsDraft(metrics.map((m) => ({ ...m })));
    setEditMetrics(true);
  }, [metrics]);

  const addMetricDraft = useCallback(() => {
    setMetricsDraft((p) => [{ id: uid('m'), label: 'New Metric', value: '0', unit: '' }, ...p]);
  }, []);

  const updateMetricDraft = useCallback((id: string, patch: Partial<SafetyMetric>) => {
    setMetricsDraft((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteMetricDraft = useCallback((id: string) => {
    setMetricsDraft((p) => p.filter((m) => m.id !== id));
  }, []);

  const saveMetricsEditor = useCallback(() => {
    setMetrics(metricsDraft.map((m) => ({ ...m })));
    setEditMetrics(false);
    setLastUpdateIso(new Date().toISOString());
  }, [metricsDraft]);

  const openTargetEditor = useCallback(() => {
    setTargetVarsDraft({ ...targetVars });
    setBestRecordDraft(String(bestRecord));
    setLossTimeAccidentsDraft(String(lossTimeAccidents));
    setEditTarget(true);
  }, [targetVars, bestRecord, lossTimeAccidents]);

  const saveTargetEditor = useCallback(() => {
    setTargetVars({ ...targetVarsDraft });
    setBestRecord(Number(bestRecordDraft) || 0);
    setLossTimeAccidents(Number(lossTimeAccidentsDraft) || 0);
    setEditTarget(false);
    setLastUpdateIso(new Date().toISOString());
  }, [targetVarsDraft, bestRecordDraft, lossTimeAccidentsDraft]);

  const openTickerEditor = useCallback(() => {
    setTickerDraft(announcements.map((a) => a.text).join('\n'));
    setEditTicker(true);
  }, [announcements]);

  const saveTickerEditor = useCallback(() => {
    const lines = tickerDraft
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = lines.length
      ? lines.map((text, idx) => ({ id: String(idx + 1), text }))
      : DEFAULT_ANNOUNCEMENTS;
    setAnnouncements(next);
    setEditTicker(false);
    setLastUpdateIso(new Date().toISOString());
  }, [tickerDraft]);

  // ---- Derived target numbers
  const totalManHours = useMemo(() => (targetVars.manpower * targetVars.daysPerWeek * targetVars.hoursPerDay * targetVars.workingDaysYear), [targetVars]);
  const toDateManHours = useMemo(() => (targetVars.manpower * targetVars.daysPerWeek * targetVars.hoursPerDay * targetVars.workingDaysSoFar), [targetVars]);

  const lastUpdateLabel = useMemo(() => {
    try {
      const d = new Date(lastUpdateIso);
      return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }, [lastUpdateIso]);

  const tickerText = useMemo(() => {
    const txt = announcements.map((a) => a.text).filter(Boolean).join('   •   ');
    return txt || 'No announcements.';
  }, [announcements]);

  // ticker speed based on length (keep calm)
  const tickerSeconds = useMemo(() => clamp(Math.round(tickerText.length / 6), 30, 90), [tickerText]);

  // ---- Graph data (from editable tables)
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const monthlyChartData = useMemo(() => {
    return MONTH_SHORT.map((m, i) => {
      const items = Number(monthlyTable.items[i]) || 0;
      const actions = Number(monthlyTable.actions[i]) || 0;
      const pct = items > 0 ? Math.round((actions / items) * 100) : 0;
      return { m, items, actions, pct };
    });
  }, [monthlyTable]);

  const machineChartData = useMemo(() => {
    return machineTable.map((r) => {
      const problem = Number(r.problem) || 0;
      const action = Number(r.action) || 0;
      const pct = problem > 0 ? Math.round((action / problem) * 100) : 0;
      return { name: r.areaMachine, problem, action, pct };
    });
  }, [machineTable]);

  const rankChartData = useMemo(() => {
    return rankTable.ranks.map((rk) => {
      const items = Number(rankTable.items[rk]) || 0;
      const actions = Number(rankTable.actions[rk]) || 0;
      const pct = items > 0 ? Math.round((actions / items) * 100) : 0;
      return { rank: rk.replace('Rank ', ''), items, actions, pct };
    });
  }, [rankTable]);

  const setMonthlyValue = useCallback((kind: 'items' | 'actions', idx: number, val: number) => {
    setMonthlyTable((p) => {
      const next = { ...p, [kind]: [...p[kind]] } as MonthlyKpiTable;
      next[kind][idx] = Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
      return next;
    });
  }, []);

  const updateMachineRow = useCallback((id: string, patch: Partial<MachineRow>) => {
    setMachineTable((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addMachineRow = useCallback(() => {
    setMachineTable((p) => [{ id: uid('mc'), areaMachine: 'New Machine', problem: 0, action: 0 }, ...p]);
  }, []);

  const deleteMachineRow = useCallback((id: string) => {
    setMachineTable((p) => p.filter((r) => r.id !== id));
  }, []);

  const addRank = useCallback(() => {
    setRankTable((p) => {
      const nextIndex = p.ranks.length + 1;
      const newRank = `Rank ${String.fromCharCode(64 + Math.min(26, nextIndex))}`;
      const ranks = [...p.ranks, newRank];
      return {
        ranks,
        items: { ...p.items, [newRank]: 0 },
        actions: { ...p.actions, [newRank]: 0 },
      };
    });
  }, []);

  const updateRankValue = useCallback((kind: 'items' | 'actions', rank: string, val: number) => {
    setRankTable((p) => ({
      ...p,
      [kind]: { ...p[kind], [rank]: Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0 },
    }));
  }, []);

  const deleteRank = useCallback((rank: string) => {
    setRankTable((p) => {
      const ranks = p.ranks.filter((r) => r !== rank);
      const items = { ...p.items };
      const actions = { ...p.actions };
      delete items[rank];
      delete actions[rank];
      return { ranks: ranks.length ? ranks : DEFAULT_RANK_TABLE.ranks, items, actions };
    });
  }, []);

  const renderMonthlyEditor = useCallback(() => {
    const accumItems = monthlyTable.items.reduce((a, b) => a + (Number(b) || 0), 0);
    const accumActions = monthlyTable.actions.reduce((a, b) => a + (Number(b) || 0), 0);
    return (
      <div className="p-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-extrabold text-slate-600">Monthly Summary (Editable)</div>
          <div className="text-[11px] font-bold text-slate-500">Accum Items: {accumItems} • Actual Action: {accumActions}</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Type</TableHead>
              {MONTH_SHORT.map((m) => (
                <TableHead key={m} className="text-center">{m}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">item</TableCell>
              {MONTH_SHORT.map((_, i) => (
                <TableCell key={i} className="text-center">
                  {displayMode ? (monthlyTable.items[i] ?? 0) : (
                    <input
                      className="w-14 text-center rounded-md border border-slate-200 px-1 py-0.5"
                      value={String(monthlyTable.items[i] ?? 0)}
                      onChange={(e) => setMonthlyValue('items', i, Number(e.target.value))}
                      inputMode="numeric"
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">action</TableCell>
              {MONTH_SHORT.map((_, i) => (
                <TableCell key={i} className="text-center">
                  {displayMode ? (monthlyTable.actions[i] ?? 0) : (
                    <input
                      className="w-14 text-center rounded-md border border-slate-200 px-1 py-0.5"
                      value={String(monthlyTable.actions[i] ?? 0)}
                      onChange={(e) => setMonthlyValue('actions', i, Number(e.target.value))}
                      inputMode="numeric"
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">%</TableCell>
              {MONTH_SHORT.map((_, i) => {
                const items = Number(monthlyTable.items[i]) || 0;
                const actions = Number(monthlyTable.actions[i]) || 0;
                const pct = items > 0 ? Math.round((actions / items) * 100) : 0;
                return (
                  <TableCell key={i} className="text-center font-bold">{items > 0 ? `${pct}%` : '-'} </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
        <div className="mt-2 text-[11px] text-slate-500 font-semibold">* % = action / item</div>
      </div>
    );
  }, [MONTH_SHORT, monthlyTable, displayMode, setMonthlyValue]);

  const renderMachineEditor = useCallback(() => {
    return (
      <div className="p-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-extrabold text-slate-600">Area / Machine (Editable)</div>
          {!displayMode ? (
            <button type="button" onClick={addMachineRow} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800">+ Add Row</button>
          ) : null}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area / Machine</TableHead>
              <TableHead className="text-center">Problem</TableHead>
              <TableHead className="text-center">Action</TableHead>
              <TableHead className="text-center">%</TableHead>
              {!displayMode ? <TableHead className="text-right"> </TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {machineTable.map((r) => {
              const pct = r.problem > 0 ? Math.round((r.action / r.problem) * 100) : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="min-w-[220px]">
                    {displayMode ? r.areaMachine : (
                      <input
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                        value={r.areaMachine}
                        onChange={(e) => updateMachineRow(r.id, { areaMachine: e.target.value })}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {displayMode ? r.problem : (
                      <input
                        className="w-16 text-center rounded-md border border-slate-200 px-1 py-1"
                        value={String(r.problem)}
                        onChange={(e) => updateMachineRow(r.id, { problem: Number(e.target.value) || 0 })}
                        inputMode="numeric"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {displayMode ? r.action : (
                      <input
                        className="w-16 text-center rounded-md border border-slate-200 px-1 py-1"
                        value={String(r.action)}
                        onChange={(e) => updateMachineRow(r.id, { action: Number(e.target.value) || 0 })}
                        inputMode="numeric"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold">{r.problem > 0 ? `${pct}%` : '-'} </TableCell>
                  {!displayMode ? (
                    <TableCell className="text-right">
                      <button type="button" onClick={() => deleteMachineRow(r.id)} className="h-8 px-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-extrabold hover:bg-rose-100">Delete</button>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }, [machineTable, displayMode, addMachineRow, updateMachineRow, deleteMachineRow]);

  const renderRankEditor = useCallback(() => {
    return (
      <div className="p-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-extrabold text-slate-600">Rank (Editable)</div>
          {!displayMode ? (
            <button type="button" onClick={addRank} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800">+ Add Rank</button>
          ) : null}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Type</TableHead>
              {rankTable.ranks.map((rk) => (
                <TableHead key={rk} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold">{rk}</span>
                    {!displayMode && rankTable.ranks.length > 1 ? (
                      <button type="button" onClick={() => deleteRank(rk)} className="text-rose-700 font-black" title="Remove rank">×</button>
                    ) : null}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(['items','actions'] as const).map((kind) => {
              const label = kind === 'items' ? 'Items' : 'Action';
              const total = rankTable.ranks.reduce((s, rk) => s + (Number((kind === 'items' ? rankTable.items[rk] : rankTable.actions[rk])) || 0), 0);
              return (
                <TableRow key={kind}>
                  <TableCell className="font-bold">{label}</TableCell>
                  {rankTable.ranks.map((rk) => {
                    const v = kind === 'items' ? rankTable.items[rk] : rankTable.actions[rk];
                    return (
                      <TableCell key={rk} className="text-center">
                        {displayMode ? v : (
                          <input
                            className="w-16 text-center rounded-md border border-slate-200 px-1 py-1"
                            value={String(v ?? 0)}
                            onChange={(e) => updateRankValue(kind, rk, Number(e.target.value))}
                            inputMode="numeric"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold">{total}</TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-bold">Remain</TableCell>
              {rankTable.ranks.map((rk) => {
                const items = Number(rankTable.items[rk]) || 0;
                const actions = Number(rankTable.actions[rk]) || 0;
                return <TableCell key={rk} className="text-center">{items - actions}</TableCell>
              })}
              <TableCell className="text-center font-bold">{rankTable.ranks.reduce((s,rk)=>s + ((Number(rankTable.items[rk])||0)-(Number(rankTable.actions[rk])||0)),0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">%</TableCell>
              {rankTable.ranks.map((rk) => {
                const items = Number(rankTable.items[rk]) || 0;
                const actions = Number(rankTable.actions[rk]) || 0;
                const pct = items > 0 ? Math.round((actions / items) * 100) : 0;
                return <TableCell key={rk} className="text-center font-bold">{items > 0 ? `${pct}%` : '-'}</TableCell>;
              })}
              {(() => {
                const ti = rankTable.ranks.reduce((s,rk)=>s + (Number(rankTable.items[rk])||0),0);
                const ta = rankTable.ranks.reduce((s,rk)=>s + (Number(rankTable.actions[rk])||0),0);
                const pct = ti > 0 ? Math.round((ta/ti)*100) : 0;
                return <TableCell className="text-center font-bold">{ti > 0 ? `${pct}%` : '-'}</TableCell>;
              })()}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }, [rankTable, displayMode, addRank, deleteRank, updateRankValue]);

  return (
    <div
      className={`h-screen max-h-screen max-w-[100vw] overflow-hidden flex flex-col bg-[radial-gradient(circle_at_top_left,_#dbeafe_0%,_#f0f9ff_30%,_#ffffff_55%,_#fefce8_80%,_#ecfdf5_100%)] text-slate-900 ${displayMode ? "display-mode" : ""}`}
      style={{
        fontSize: 'var(--font-size)',
        ['--color-firstAid' as any]: '#16a34a', // green
        ['--color-nonAbsent' as any]: '#2563eb', // blue
        ['--color-absent' as any]: '#f59e0b', // orange
        ['--color-fire' as any]: '#ef4444', // red
      }}
    >
      <style>
        {`
          .header-date { font-size: clamp(1.05rem, 1.1vw, 1.5rem); }
          .header-time { font-size: clamp(1.2rem, 1.35vw, 1.9rem); }
          :root { --ticker-h: clamp(46px, 5.2vh, 66px); }
          .ticker-wrap { height: var(--ticker-h); }
          .display-mode .edit-only { display: none !important; }
          @keyframes marqueeRTL { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        `}
      </style>

      {/* HEADER */}
      <header className="px-6 py-4 flex items-center gap-4 rounded-b-3xl border-b border-white/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-12 flex items-center rounded-2xl bg-white/80 border border-slate-200 shadow-sm px-3 overflow-hidden">
            <img src={nhkLogo} alt="NHK SPRING (THAILAND)" className="h-9 w-auto" />
          </div>
          <div className="text-2xl font-extrabold">Safety Dashboard</div>
        </div>

        <div className="flex-1 flex justify-center">
          <HeaderClock />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setUiScale((s) => clamp(Number((s - 0.05).toFixed(2)), 0.8, 1.4))}
              className="h-8 w-10 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50"
              aria-label="Decrease font size"
              title="ลดขนาดตัวอักษร"
            >
              A-
            </button>
            <div className="w-14 text-center text-xs font-extrabold text-slate-600">{Math.round(uiScale * 100)}%</div>
            <button
              type="button"
              onClick={() => setUiScale((s) => clamp(Number((s + 0.05).toFixed(2)), 0.8, 1.4))}
              className="h-8 w-10 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50"
              aria-label="Increase font size"
              title="เพิ่มขนาดตัวอักษร"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setUiScale(1)}
              className="h-8 px-3 rounded-xl border border-slate-200 bg-white text-xs font-extrabold hover:bg-slate-50"
              aria-label="Reset font size"
              title="รีเซ็ตขนาดตัวอักษร"
            >
              Reset
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDisplayMode((v) => !v)}
            className={`px-4 py-2 rounded-2xl border font-extrabold flex items-center gap-2 ${displayMode ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}
            title={displayMode ? 'Display mode: ซ่อนปุ่มแก้ไข/อัปโหลด' : 'Edit mode: แสดงปุ่มแก้ไข/อัปโหลด'}
          >
            <Monitor className="h-4 w-4" />
            {displayMode ? 'DISPLAY' : 'EDIT'}
          </button>


          <button
            type="button"
            onClick={() => setLayoutLocked((v) => !v)}
            className={`px-4 py-2 rounded-2xl border font-extrabold flex items-center gap-2 ${layoutLocked ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'}`}
            title={layoutLocked ? 'Unlock layout to resize panels' : 'Lock layout'}
          >
            {layoutLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {layoutLocked ? 'LOCKED' : 'UNLOCKED'}
          </button>

          <button type="button" onClick={resetLayout} className="px-4 py-2 rounded-2xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50" title="Reset layout">
            Reset Layout
          </button>
        </div>
      </header>

      {/* MAIN (leave space for ticker) */}
      <main className="px-4 pt-2 flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: "calc(var(--ticker-h) + 10px)" }}>
        <div className="h-full min-h-0 rounded-3xl overflow-hidden">
          {/* New structure based on your sketch (V2 split):
              Left: Poster(top) + Poster(bottom)
              Center: Safety Policy (images) + Safety & Environment Target
              Right: Streak + Calendar
          */}
          
          <ResizablePanelGroup direction="horizontal" className="h-full" autoSaveId="nhk-safety-layout-v2-structure">
            {/* LEFT */}
            <ResizablePanel defaultSize={23} minSize={18}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={50} minSize={22}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => (
                        <Card
                          title={titleFor('posterTop', 'Poster (Policy)')}
                          icon={<ImageIcon className="h-5 w-5 text-amber-700" />}
                          tone="amber"
                          panelScale={panelScale}
                          titleEditable={!displayMode}
                          onTitleClick={() => openRenameTitle('posterTop', 'Poster (Policy)')}
                          bodyClassName="p-2"
                          actions={
                            <>
                              <input ref={posterTopInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPosterTopSelected(e.target.files?.[0])} />
                              <button onClick={() => posterTopInputRef.current?.click()} className="p-2 rounded-lg hover:bg-amber-50" title="Upload">
                                <Upload className="h-4 w-4 text-amber-700" />
                              </button>
                              {posterTop ? (
                                <>
                                  <button onClick={() => setPosterTopZoom((z) => clamp(z - 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-amber-200" title="Zoom out">
                                    <span className="text-amber-800 font-bold">−</span>
                                  </button>
                                  <button onClick={() => setPosterTopZoom(1)} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-amber-200 bg-white hover:bg-amber-50" title="Reset size">
                                    {Math.round(posterTopZoom * 100)}%
                                  </button>
                                  <button onClick={() => setPosterTopZoom((z) => clamp(z + 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-amber-200" title="Zoom in">
                                    <span className="text-amber-800 font-bold">+</span>
                                  </button>
                                  <button onClick={() => setPosterTop(null)} className="p-2 rounded-lg hover:bg-rose-50" title="Remove">
                                    <Trash2 className="h-4 w-4 text-rose-600" />
                                  </button>
                                </>
                              ) : null}
                            </>
                          }
                        >
                          {!posterTop ? (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
                              <Upload className="h-8 w-8 text-slate-500" />
                              <div className="font-bold text-slate-700">Upload Poster</div>
                              <div className="text-sm text-slate-500">รองรับรูปแนวตั้ง/แนวนอน</div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col min-h-0">
                              <div className="w-full flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center relative">
                                <img
                                  src={posterTop}
                                  alt="Poster"
                                  className="max-h-full max-w-full object-contain select-none"
                                  style={{ transform: `scale(${posterTopZoom})`, transformOrigin: 'center center' }}
                                />
                              </div>
                            </div>
                          )}
                        </Card>
                      )}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
                <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                <ResizablePanel defaultSize={50} minSize={22}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => (
                        <Card
                          title={titleFor('posterBottom', 'Poster')}
                          icon={<ImageIcon className="h-5 w-5 text-amber-700" />}
                          tone="amber"
                          panelScale={panelScale}
                          titleEditable={!displayMode}
                          onTitleClick={() => openRenameTitle('posterBottom', 'Poster')}
                          bodyClassName="p-2"
                          actions={
                            <>
                              <input ref={posterBottomInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPosterBottomSelected(e.target.files?.[0])} />
                              <button onClick={() => posterBottomInputRef.current?.click()} className="p-2 rounded-lg hover:bg-amber-50" title="Upload">
                                <Upload className="h-4 w-4 text-amber-700" />
                              </button>
                              {posterBottom ? (
                                <>
                                  <button onClick={() => setPosterBottomZoom((z) => clamp(z - 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-amber-200" title="Zoom out">
                                    <span className="text-amber-800 font-bold">−</span>
                                  </button>
                                  <button onClick={() => setPosterBottomZoom(1)} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-amber-200 bg-white hover:bg-amber-50" title="Reset size">
                                    {Math.round(posterBottomZoom * 100)}%
                                  </button>
                                  <button onClick={() => setPosterBottomZoom((z) => clamp(z + 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-amber-200" title="Zoom in">
                                    <span className="text-amber-800 font-bold">+</span>
                                  </button>
                                  <button onClick={() => setPosterBottom(null)} className="p-2 rounded-lg hover:bg-rose-50" title="Remove">
                                    <Trash2 className="h-4 w-4 text-rose-600" />
                                  </button>
                                </>
                              ) : null}
                            </>
                          }
                        >
                          {posterBottom ? (
                            <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                              <img
                                src={posterBottom}
                                alt="Poster"
                                className="max-h-full max-w-full object-contain select-none"
                                style={{ transform: `scale(${posterBottomZoom})`, transformOrigin: 'center center' }}
                              />
                            </div>
                          ) : (
                            <div className="h-full rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 flex items-center justify-center">
                              <div className="text-amber-900 font-bold">Upload Poster</div>
                            </div>
                          )}
                        </Card>
                      )}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>


                
            <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
            {/* MAIN */}
            <ResizablePanel defaultSize={77} minSize={55}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* POLICY (span center + right) */}
                <ResizablePanel defaultSize={34} minSize={18}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => (
                        <Card
                          title={titleFor('policy', 'Safety Policy')}
                          icon={<Shield className="h-5 w-5 text-sky-700" />}
                          tone="sky"
                          panelScale={panelScale}
                          titleEditable={!displayMode}
                          onTitleClick={() => openRenameTitle('policy', 'Safety Policy')}
                          bodyClassName="p-2"
                          actions={
                            <>
                              <input ref={policyReplaceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPolicyReplaceSelected(e.target.files?.[0])} />
                              <input ref={policyAddInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPolicyAddSelected(e.target.files?.[0])} />

                              <button onClick={() => policyReplaceInputRef.current?.click()} className="p-2 rounded-lg hover:bg-white/70" title="Replace image">
                                <Upload className="h-4 w-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => policyAddInputRef.current?.click()}
                                disabled={policyImages.length >= 2}
                                className="p-2 rounded-lg hover:bg-white/70 disabled:opacity-40"
                                title="Add second image (max 2)"
                              >
                                <Plus className="h-4 w-4 text-slate-600" />
                              </button>
                              {policyImages.length > 1 ? (
                                <button
                                  onClick={() => setPolicyImages((p) => p.slice(0, 1))}
                                  className="p-2 rounded-lg hover:bg-rose-50"
                                  title="Remove second image"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" />
                                </button>
                              ) : null}
                              <button onClick={() => setPolicyZoom((z) => clamp(z - 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white/70" title="Zoom out">
                                <span className="text-slate-700 font-bold">−</span>
                              </button>
                              <button onClick={() => setPolicyZoom(1)} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50" title="Reset size">
                                {Math.round(policyZoom * 100)}%
                              </button>
                              <button onClick={() => setPolicyZoom((z) => clamp(z + 0.1, 0.5, 1))} className="p-2 rounded-lg hover:bg-white/70" title="Zoom in">
                                <span className="text-slate-700 font-bold">+</span>
                              </button>
                            </>
                          }
                        >
                          <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                            {policyImages.length <= 1 ? (
                              <img
                                src={policyImages[0]}
                                alt="Safety Policy"
                                className="max-h-full max-w-full object-contain select-none"
                                style={{ transform: `scale(${policyZoom})`, transformOrigin: 'center center' }}
                              />
                            ) : (
                              <div className="h-full w-full grid grid-cols-2 gap-2 p-2">
                                {policyImages.slice(0, 2).map((src, idx) => (
                                  <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                                    <img
                                      src={src}
                                      alt={`Policy ${idx + 1}`}
                                      className="max-h-full max-w-full object-contain select-none"
                                      style={{ transform: `scale(${policyZoom})`, transformOrigin: 'center center' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
                <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                {/* BODY */}
                <ResizablePanel defaultSize={66} minSize={40}>
                  <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* TARGET + METRICS */}
                    <ResizablePanel defaultSize={50} minSize={38}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => {
                        const metricCols = panelScale < 0.82 ? 1 : 2;
                        const metricRows = Math.max(1, Math.ceil(metrics.length / metricCols));
                        const densityScale = clamp((6 / Math.max(metrics.length, 1)) ** 0.28, 0.78, 1);
                        const cardScale = clamp(panelScale * densityScale * (metricRows >= 4 ? 0.92 : 1), 0.68, 1.08);

                        return (
                          <Card
                            title={titleFor('target', 'Safety & Environment Target')}
                            icon={<Target className="h-5 w-5 text-cyan-700" />}
                            tone="teal"
                            panelScale={panelScale}
                            titleEditable={!displayMode}
                            onTitleClick={() => openRenameTitle('target', 'Safety & Environment Target')}
                            actions={
                              <>
                                <button type="button" onClick={openTargetEditor} className="p-2 rounded-lg hover:bg-white/70" title="Edit Target / Formula" aria-label="Edit Target / Formula">
                                  <Edit className="h-4 w-4 text-slate-600" />
                                </button>
                                <button type="button" onClick={openMetricsEditor} className="p-2 rounded-lg hover:bg-white/70" title="Edit Metrics" aria-label="Edit Metrics">
                                  <Activity className="h-4 w-4 text-slate-600" />
                                </button>
                              </>
                            }
                          >
                            <div className="h-full min-h-0 flex flex-col overflow-hidden">
                              {/* Target summary (4 long rows, white + border) */}
                              {(() => {
                                const targetRowScale = clamp(panelScale * 0.98, 0.7, 1.08);
                                const items = [
                                  {
                                    key: 'total',
                                    label: 'Total Working Time',
                                    value: formatNumber(totalManHours),
                                    unit: 'man-hours',
                                    detail: `(${targetVars.manpower}×${targetVars.daysPerWeek}×${targetVars.hoursPerDay}×${targetVars.workingDaysYear})`,
                                  },
                                  {
                                    key: 'todate',
                                    label: 'To Date Record',
                                    value: formatNumber(toDateManHours),
                                    unit: 'man-hours',
                                    detail: `(${targetVars.manpower}×${targetVars.daysPerWeek}×${targetVars.hoursPerDay}×${targetVars.workingDaysSoFar})`,
                                  },
                                  {
                                    key: 'best',
                                    label: 'Best Record',
                                    value: formatNumber(bestRecord),
                                    unit: 'man-hours',
                                    detail: '',
                                  },
                                  {
                                    key: 'lta',
                                    label: 'Number of loss time accident in this year',
                                    value: formatNumber(lossTimeAccidents),
                                    unit: 'time',
                                    detail: '',
                                  },
                                ];

                                return (
                                  <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm">
                                    <div className="space-y-2">
                                      {items.map((it) => (
                                        <div
                                          key={it.key}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-4"
                                        >
                                          <div className="min-w-0">
                                            <div className="font-extrabold text-slate-700 truncate" style={{ fontSize: scaledPx(14, targetRowScale, 10, 16) }}>
                                              {it.label}
                                            </div>
                                            {it.detail && panelScale >= 0.95 ? (
                                              <div className="mt-0.5 text-slate-500 font-semibold truncate" style={{ fontSize: scaledPx(12, targetRowScale, 9, 13) }}>
                                                {it.detail}
                                              </div>
                                            ) : null}
                                          </div>
                                          <div className="flex items-baseline gap-2 shrink-0">
                                            <div className="font-black text-slate-900 leading-none" style={{ fontSize: scaledPx(30, targetRowScale, 16, 40) }}>
                                              {it.value}
                                            </div>
                                            <div className="font-bold text-slate-500" style={{ fontSize: scaledPx(14, targetRowScale, 9, 18) }}>
                                              {it.unit}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="my-3 h-px bg-cyan-200/70" />

                              {/* Metrics grid (no graph) */}
                              <div className="min-h-0 flex-1 overflow-hidden">
                                <div
                                  className="grid gap-2 h-full min-h-0"
                                  style={{
                                    gridTemplateColumns: `repeat(${metricCols}, minmax(0, 1fr))`,
                                    gridTemplateRows: `repeat(${metricRows}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {metrics.map((m) => (
                                    <div
                                      key={m.id}
                                      className="rounded-2xl border p-3 flex flex-col justify-between shadow-[0_1px_0_rgba(2,132,199,0.05)] min-h-0 overflow-hidden"
                                      style={metricAccentStyle(metricToneKey(m.label))}
                                    >
                                      <div className="font-semibold text-slate-700 leading-tight break-words line-clamp-2" style={{ fontSize: scaledPx(14, cardScale, 10, 16) }}>
                                        <span className="inline-flex items-center gap-2">
                                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: metricToneKey(m.label) === 'neutral' ? 'var(--tone-cyan-600)' : `var(--color-${metricToneKey(m.label)})` }} />
                                          <span className="min-w-0 truncate">{m.label}</span>
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-end gap-1 min-w-0">
                                        <div className="font-extrabold text-slate-900 leading-none truncate" style={{ fontSize: scaledPx(38, cardScale, 18, 48) }}>
                                          {m.value}
                                        </div>
                                        <div className="font-semibold text-slate-500 pb-[0.12rem] truncate" style={{ fontSize: scaledPx(16, cardScale, 9, 18) }}>
                                          {m.unit}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-2 flex justify-end text-slate-600 font-semibold" style={{ fontSize: scaledPx(12, panelScale, 10, 14) }}>
                                {lastUpdateLabel ? `Date Update: ${lastUpdateLabel}` : ''}
                              </div>
                            </div>
                          </Card>
                        );
                      }}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
                    <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                    {/* GRAPHS (4) */}
                    
                <ResizablePanel defaultSize={32} minSize={22}>
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={50} minSize={20}>
                      <ResizablePanelGroup direction="horizontal" className="h-full">
                        {[0, 1].map((idx) => (
                          <ResizablePanel key={`g-top-${idx}`} defaultSize={50} minSize={18}>
                            <div className="h-full min-h-0 p-1">
                              <PanelWrap>
                                {(panelScale) => (
                                  <Card
                                    title={titleFor(`graph${idx + 1}`, `Graph ${idx + 1}`)}
                                    icon={<Activity className="h-5 w-5 text-slate-700" />}
                                    tone="slate"
                                    panelScale={panelScale}
                                    titleEditable={!displayMode}
                                    onTitleClick={() => openRenameTitle(`graph${idx + 1}`, `Graph ${idx + 1}`)}
                                    bodyClassName="p-2"
                                    actions={
                                      <>
                                        <input
                                          ref={(el) => {
                                            graphInputRefs.current[idx] = el;
                                          }}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => onGraphSelected(idx, e.target.files?.[0])}
                                        />
                                        <button
                                          onClick={() => graphInputRefs.current[idx]?.click()}
                                          className="p-2 rounded-lg hover:bg-white/70"
                                          title="Upload graph image"
                                        >
                                          <Upload className="h-4 w-4 text-slate-600" />
                                        </button>
                                        {graphImages[idx] ? (
                                          <>
                                            <button onClick={() => zoomGraph(idx, -0.1)} className="p-2 rounded-lg hover:bg-white/70" title="Zoom out">
                                              <span className="text-slate-800 font-bold">−</span>
                                            </button>
                                            <button onClick={() => setGraphZooms((z) => { const n = [...z]; n[idx] = 1; return n; })} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white/80 hover:bg-white" title="Reset size">
                                              {Math.round((graphZooms[idx] ?? 1) * 100)}%
                                            </button>
                                            <button onClick={() => zoomGraph(idx, 0.1)} className="p-2 rounded-lg hover:bg-white/70" title="Zoom in">
                                              <span className="text-slate-800 font-bold">+</span>
                                            </button>
                                            <button onClick={() => clearGraph(idx)} className="p-2 rounded-lg hover:bg-rose-50" title="Remove">
                                              <Trash2 className="h-4 w-4 text-rose-600" />
                                            </button>
                                          </>
                                        ) : null}
                                      </>
                                    }
                                  >
                                    <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white/60 overflow-hidden flex flex-col">
  {idx === 0 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Month</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Item</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Accum</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Actual</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m, mi) => {
            const item = monthlyTable.items[mi] || 0;
            const act = monthlyTable.actions[mi] || 0;
            const accum = monthlyTable.items.slice(0, mi + 1).reduce((a, b) => a + (Number(b) || 0), 0);
            const actual = monthlyTable.actions.slice(0, mi + 1).reduce((a, b) => a + (Number(b) || 0), 0);
            const pct = item > 0 ? Math.round((act / item) * 100) : null;
            return (
              <tr key={m} className="odd:bg-white even:bg-slate-50/40">
                <td className="px-2 py-1 border-b border-slate-100">{m.slice(0,3)}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{item}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{act}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{accum}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{actual}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : idx === 1 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Area / Machine</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Problem</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
          </tr>
        </thead>
        <tbody>
          {machineRows.map((r) => {
            const pct = r.problem > 0 ? Math.round((r.action / r.problem) * 100) : null;
            return (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/40">
                <td className="px-2 py-1 border-b border-slate-100">{r.area}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{r.problem}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{r.action}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : idx === 2 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Rank</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Items</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Remain</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const totalItems = rankCols.reduce((a, c) => a + (Number(c.items) || 0), 0);
            const totalAct = rankCols.reduce((a, c) => a + (Number(c.action) || 0), 0);
            const rows = [...rankCols, { id: 'total', name: 'Total', items: totalItems, action: totalAct } as any];
            return rows.map((c:any) => {
              const remain = (Number(c.items) || 0) - (Number(c.action) || 0);
              const pct = (Number(c.items) || 0) > 0 ? Math.round(((Number(c.action) || 0) / (Number(c.items) || 0)) * 100) : null;
              return (
                <tr key={c.id} className={c.id === 'total' ? 'bg-emerald-50/60' : 'odd:bg-white even:bg-slate-50/40'}>
                  <td className="px-2 py-1 border-b border-slate-100 font-extrabold">{c.name}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{c.items}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{c.action}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{remain}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-white">
        <button type="button" onClick={() => setDataTab('monthly')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'monthly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Monthly</button>
        <button type="button" onClick={() => setDataTab('machine')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'machine' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Machine</button>
        <button type="button" onClick={() => setDataTab('rank')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'rank' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Rank</button>

        {!displayMode ? (
          <div className="ml-auto flex items-center gap-2">
            {dataTab === 'machine' ? (
              <button type="button" onClick={() => setMachineRows((p) => [...p, { id: uid('mc'), area: 'New Area', problem: 0, action: 0 }])} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add row
              </button>
            ) : null}
            {dataTab === 'rank' ? (
              <button type="button" onClick={() => setRankCols((p) => [...p, { id: uid('rk'), name: `Rank ${String.fromCharCode(65 + p.length)}`, items: 0, action: 0 }])} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add rank
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-2">
        {dataTab === 'monthly' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Row</th>
                  {MONTHS.map((m) => <th key={m} className="px-2 py-1 text-right border-b border-slate-200">{m.slice(0,3)}</th>)}
                </tr>
              </thead>
              <tbody>
                {(['item','action'] as const).map((rowKey) => (
                  <tr key={rowKey} className="odd:bg-white even:bg-slate-50/40">
                    <td className="px-2 py-1 border-b border-slate-100 font-extrabold">{rowKey}</td>
                    {MONTHS.map((_, mi) => (
                      <td key={mi} className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input
                            className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white"
                            value={String(rowKey === 'item' ? (monthlyTable.items[mi] || 0) : (monthlyTable.actions[mi] || 0))}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              if (rowKey === 'item') setMonthlyTable((p) => ({ ...p, items: p.items.map((x, i) => (i === mi ? v : x)) }));
                              else setMonthlyTable((p) => ({ ...p, actions: p.actions.map((x, i) => (i === mi ? v : x)) }));
                            }}
                          />
                        ) : (
                          <span>{rowKey === 'item' ? (monthlyTable.items[mi] || 0) : (monthlyTable.actions[mi] || 0)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[11px] font-semibold text-slate-500">หมายเหตุ: % / Accum / Actual คำนวณอัตโนมัติจาก item/action</div>
          </div>
        ) : null}

        {dataTab === 'machine' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Area / Machine</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Problem</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
                  {!displayMode ? <th className="px-2 py-1 text-right border-b border-slate-200"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {machineRows.map((r) => {
                  const pct = r.problem > 0 ? Math.round((r.action / r.problem) * 100) : null;
                  return (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1 border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-full rounded-md border border-slate-200 px-2 py-1 bg-white" value={r.area} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, area: e.target.value } : x))} />
                        ) : r.area}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(r.problem)} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, problem: Number(e.target.value) || 0 } : x))} />
                        ) : r.problem}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(r.action)} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, action: Number(e.target.value) || 0 } : x))} />
                        ) : r.action}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                      {!displayMode ? (
                        <td className="px-2 py-1 text-right border-b border-slate-100">
                          <button type="button" className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-extrabold hover:bg-rose-100" onClick={() => setMachineRows((p) => p.filter((x) => x.id !== r.id))}>Del</button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {dataTab === 'rank' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Rank</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Items</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Remain</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
                  {!displayMode ? <th className="px-2 py-1 text-right border-b border-slate-200"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {rankCols.map((c) => {
                  const remain = (c.items || 0) - (c.action || 0);
                  const pct = c.items > 0 ? Math.round((c.action / c.items) * 100) : null;
                  return (
                    <tr key={c.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1 border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-full rounded-md border border-slate-200 px-2 py-1 bg-white" value={c.name} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                        ) : c.name}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(c.items)} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, items: Number(e.target.value) || 0 } : x))} />
                        ) : c.items}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(c.action)} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, action: Number(e.target.value) || 0 } : x))} />
                        ) : c.action}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{remain}</td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                      {!displayMode ? (
                        <td className="px-2 py-1 text-right border-b border-slate-100">
                          <button type="button" className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-extrabold hover:bg-rose-100" onClick={() => setRankCols((p) => p.filter((x) => x.id !== c.id))}>Del</button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )}
</div>
                                  </Card>
                                )}
                              </PanelWrap>
                            </div>
                          </ResizablePanel>
                        ))}
                      </ResizablePanelGroup>
                    </ResizablePanel>
                    <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                    <ResizablePanel defaultSize={50} minSize={20}>
                      <ResizablePanelGroup direction="horizontal" className="h-full">
                        {[2, 3].map((idx) => (
                          <ResizablePanel key={`g-bot-${idx}`} defaultSize={50} minSize={18}>
                            <div className="h-full min-h-0 p-1">
                              <PanelWrap>
                                {(panelScale) => (
                                  <Card
                                    title={titleFor(`graph${idx + 1}`, `Graph ${idx + 1}`)}
                                    icon={<Activity className="h-5 w-5 text-slate-700" />}
                                    tone="slate"
                                    panelScale={panelScale}
                                    titleEditable={!displayMode}
                                    onTitleClick={() => openRenameTitle(`graph${idx + 1}`, `Graph ${idx + 1}`)}
                                    bodyClassName="p-2"
                                    actions={
                                      <>
                                        <input
                                          ref={(el) => {
                                            graphInputRefs.current[idx] = el;
                                          }}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => onGraphSelected(idx, e.target.files?.[0])}
                                        />
                                        <button
                                          onClick={() => graphInputRefs.current[idx]?.click()}
                                          className="p-2 rounded-lg hover:bg-white/70"
                                          title="Upload graph image"
                                        >
                                          <Upload className="h-4 w-4 text-slate-600" />
                                        </button>
                                        {graphImages[idx] ? (
                                          <>
                                            <button onClick={() => zoomGraph(idx, -0.1)} className="p-2 rounded-lg hover:bg-white/70" title="Zoom out">
                                              <span className="text-slate-800 font-bold">−</span>
                                            </button>
                                            <button onClick={() => setGraphZooms((z) => { const n = [...z]; n[idx] = 1; return n; })} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white/80 hover:bg-white" title="Reset size">
                                              {Math.round((graphZooms[idx] ?? 1) * 100)}%
                                            </button>
                                            <button onClick={() => zoomGraph(idx, 0.1)} className="p-2 rounded-lg hover:bg-white/70" title="Zoom in">
                                              <span className="text-slate-800 font-bold">+</span>
                                            </button>
                                            <button onClick={() => clearGraph(idx)} className="p-2 rounded-lg hover:bg-rose-50" title="Remove">
                                              <Trash2 className="h-4 w-4 text-rose-600" />
                                            </button>
                                          </>
                                        ) : null}
                                      </>
                                    }
                                  >
                                    <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white/60 overflow-hidden flex flex-col">
  {idx === 0 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Month</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Item</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Accum</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Actual</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m, mi) => {
            const item = monthlyTable.items[mi] || 0;
            const act = monthlyTable.actions[mi] || 0;
            const accum = monthlyTable.items.slice(0, mi + 1).reduce((a, b) => a + (Number(b) || 0), 0);
            const actual = monthlyTable.actions.slice(0, mi + 1).reduce((a, b) => a + (Number(b) || 0), 0);
            const pct = item > 0 ? Math.round((act / item) * 100) : null;
            return (
              <tr key={m} className="odd:bg-white even:bg-slate-50/40">
                <td className="px-2 py-1 border-b border-slate-100">{m.slice(0,3)}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{item}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{act}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{accum}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{actual}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : idx === 1 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Area / Machine</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Problem</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
          </tr>
        </thead>
        <tbody>
          {machineRows.map((r) => {
            const pct = r.problem > 0 ? Math.round((r.action / r.problem) * 100) : null;
            return (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/40">
                <td className="px-2 py-1 border-b border-slate-100">{r.area}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{r.problem}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{r.action}</td>
                <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : idx === 2 ? (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-[11px] font-semibold">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left border-b border-slate-200">Rank</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Items</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">Remain</th>
            <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const totalItems = rankCols.reduce((a, c) => a + (Number(c.items) || 0), 0);
            const totalAct = rankCols.reduce((a, c) => a + (Number(c.action) || 0), 0);
            const rows = [...rankCols, { id: 'total', name: 'Total', items: totalItems, action: totalAct } as any];
            return rows.map((c:any) => {
              const remain = (Number(c.items) || 0) - (Number(c.action) || 0);
              const pct = (Number(c.items) || 0) > 0 ? Math.round(((Number(c.action) || 0) / (Number(c.items) || 0)) * 100) : null;
              return (
                <tr key={c.id} className={c.id === 'total' ? 'bg-emerald-50/60' : 'odd:bg-white even:bg-slate-50/40'}>
                  <td className="px-2 py-1 border-b border-slate-100 font-extrabold">{c.name}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{c.items}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{c.action}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{remain}</td>
                  <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-white">
        <button type="button" onClick={() => setDataTab('monthly')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'monthly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Monthly</button>
        <button type="button" onClick={() => setDataTab('machine')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'machine' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Machine</button>
        <button type="button" onClick={() => setDataTab('rank')} className={`px-3 py-1.5 rounded-xl border font-extrabold ${dataTab === 'rank' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Rank</button>

        {!displayMode ? (
          <div className="ml-auto flex items-center gap-2">
            {dataTab === 'machine' ? (
              <button type="button" onClick={() => setMachineRows((p) => [...p, { id: uid('mc'), area: 'New Area', problem: 0, action: 0 }])} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add row
              </button>
            ) : null}
            {dataTab === 'rank' ? (
              <button type="button" onClick={() => setRankCols((p) => [...p, { id: uid('rk'), name: `Rank ${String.fromCharCode(65 + p.length)}`, items: 0, action: 0 }])} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add rank
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-2">
        {dataTab === 'monthly' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Row</th>
                  {MONTHS.map((m) => <th key={m} className="px-2 py-1 text-right border-b border-slate-200">{m.slice(0,3)}</th>)}
                </tr>
              </thead>
              <tbody>
                {(['item','action'] as const).map((rowKey) => (
                  <tr key={rowKey} className="odd:bg-white even:bg-slate-50/40">
                    <td className="px-2 py-1 border-b border-slate-100 font-extrabold">{rowKey}</td>
                    {MONTHS.map((_, mi) => (
                      <td key={mi} className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input
                            className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white"
                            value={String(rowKey === 'item' ? (monthlyTable.items[mi] || 0) : (monthlyTable.actions[mi] || 0))}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              if (rowKey === 'item') setMonthlyTable((p) => ({ ...p, items: p.items.map((x, i) => (i === mi ? v : x)) }));
                              else setMonthlyTable((p) => ({ ...p, actions: p.actions.map((x, i) => (i === mi ? v : x)) }));
                            }}
                          />
                        ) : (
                          <span>{rowKey === 'item' ? (monthlyTable.items[mi] || 0) : (monthlyTable.actions[mi] || 0)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[11px] font-semibold text-slate-500">หมายเหตุ: % / Accum / Actual คำนวณอัตโนมัติจาก item/action</div>
          </div>
        ) : null}

        {dataTab === 'machine' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Area / Machine</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Problem</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
                  {!displayMode ? <th className="px-2 py-1 text-right border-b border-slate-200"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {machineRows.map((r) => {
                  const pct = r.problem > 0 ? Math.round((r.action / r.problem) * 100) : null;
                  return (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1 border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-full rounded-md border border-slate-200 px-2 py-1 bg-white" value={r.area} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, area: e.target.value } : x))} />
                        ) : r.area}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(r.problem)} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, problem: Number(e.target.value) || 0 } : x))} />
                        ) : r.problem}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(r.action)} onChange={(e) => setMachineRows((p) => p.map((x) => x.id === r.id ? { ...x, action: Number(e.target.value) || 0 } : x))} />
                        ) : r.action}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                      {!displayMode ? (
                        <td className="px-2 py-1 text-right border-b border-slate-100">
                          <button type="button" className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-extrabold hover:bg-rose-100" onClick={() => setMachineRows((p) => p.filter((x) => x.id !== r.id))}>Del</button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {dataTab === 'rank' ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-semibold">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-200">Rank</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Items</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Action</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">Remain</th>
                  <th className="px-2 py-1 text-right border-b border-slate-200">%</th>
                  {!displayMode ? <th className="px-2 py-1 text-right border-b border-slate-200"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {rankCols.map((c) => {
                  const remain = (c.items || 0) - (c.action || 0);
                  const pct = c.items > 0 ? Math.round((c.action / c.items) * 100) : null;
                  return (
                    <tr key={c.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1 border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-full rounded-md border border-slate-200 px-2 py-1 bg-white" value={c.name} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                        ) : c.name}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(c.items)} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, items: Number(e.target.value) || 0 } : x))} />
                        ) : c.items}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">
                        {!displayMode ? (
                          <input className="w-16 text-right rounded-md border border-slate-200 px-2 py-1 bg-white" value={String(c.action)} onChange={(e) => setRankCols((p) => p.map((x) => x.id === c.id ? { ...x, action: Number(e.target.value) || 0 } : x))} />
                        ) : c.action}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{remain}</td>
                      <td className="px-2 py-1 text-right border-b border-slate-100">{pct === null ? '-' : `${pct}%`}</td>
                      {!displayMode ? (
                        <td className="px-2 py-1 text-right border-b border-slate-100">
                          <button type="button" className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-extrabold hover:bg-rose-100" onClick={() => setRankCols((p) => p.filter((x) => x.id !== c.id))}>Del</button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )}
</div>
                                  </Card>
                                )}
                              </PanelWrap>
                            </div>
                          </ResizablePanel>
                        ))}
                      </ResizablePanelGroup>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                    <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                    {/* RIGHT COLUMN */}
                    <ResizablePanel defaultSize={25} minSize={18}>
                      <ResizablePanelGroup direction="vertical" className="h-full">
                        <ResizablePanel defaultSize={34} minSize={22}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => (
                        <Card
                          title={titleFor('streak', 'Safety Streak')}
                          icon={<Flame className="h-5 w-5 text-emerald-700" />}
                          tone="green"
                          panelScale={panelScale}
                          titleEditable={!displayMode}
                          onTitleClick={() => openRenameTitle('streak', 'Safety Streak')}
                        >
                          <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="font-bold text-slate-600" style={{ fontSize: scaledPx(14, panelScale, 12, 18) }}>Zero Accident Days</div>
                            <div className="mt-2 font-extrabold text-emerald-700 leading-none" style={{ fontSize: scaledPx(84, panelScale, 46, 120) }}>{safetyStreak}</div>
                            <div className="mt-2 font-semibold text-slate-700" style={{ fontSize: scaledPx(16, panelScale, 12, 22) }}>days</div>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-50 border border-sky-100 px-4 py-2">
                              <Shield className="h-4 w-4 text-sky-700" />
                              <span className="text-sm font-bold text-slate-700">Zero Accident Workplace</span>
                            </div>
                          </div>
                        </Card>
                      )}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
                        <ResizableHandle disabled={layoutLocked} className={layoutLocked ? 'pointer-events-none opacity-0' : ''} />
                        <ResizablePanel defaultSize={66} minSize={30}>
                  <div className="h-full min-h-0 p-1">
                    <PanelWrap>
                      {(panelScale) => {
                        const weekRows = Math.max(4, Math.ceil(gridCells.length / 7));
                        const compactScale = clamp(panelScale * (weekRows >= 6 ? 0.9 : 1), 0.62, 1.08);
                        return (
                          <Card
                            title={titleFor('calendar', 'Safety Calendar')}
                            icon={<CalendarIcon className="h-5 w-5 text-sky-600" />}
                            tone="sky"
                            panelScale={panelScale}
                            titleEditable={!displayMode}
                            onTitleClick={() => openRenameTitle('calendar', 'Safety Calendar')}
                          >
                            <div className="h-full flex flex-col min-h-0">
                              <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button type="button" className="px-2 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50" onClick={() => setDisplayMonth((m) => (m + 11) % 12)} title="Prev">‹</button>
                                  <div className="text-base md:text-lg font-extrabold text-slate-900 truncate">{MONTHS[displayMonth]} {currentYear}</div>
                                  <button type="button" className="px-2 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50" onClick={() => setDisplayMonth((m) => (m + 1) % 12)} title="Next">›</button>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[10px] md:text-xs font-bold shrink-0">
                                  <div className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">{monthSummary.safe} SAFE</div>
                                  <div className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-800">{monthSummary.near} NM</div>
                                  <div className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">{monthSummary.accident} ACC</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
                                {DAY_HEADERS.map((d) => (
                                  <div key={d} className="text-[10px] md:text-xs font-bold text-slate-500 text-center">{d}</div>
                                ))}
                              </div>
                              <div className="mb-1 rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-1 text-[10px] md:text-xs font-semibold text-sky-800 shrink-0 leading-tight">
                                คลิกวันเพื่อเปลี่ยนสถานะ: ว่าง → SAFE → NEAR MISS → ACCIDENT → ว่าง
                              </div>

                              <div className="grid grid-cols-7 gap-1 h-full min-h-0" style={{ gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }}>
                                {gridCells.map((c, idx) => {
                                  if (!c.day) return <div key={idx} className="rounded-xl bg-transparent min-h-0" />;
                                  const cellDate = new Date(currentYear, displayMonth, c.day);
                                  const iso = toISODate(cellDate);
                                  const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                                  const holidayNote = HOLIDAY_NOTES_2026[iso];
                                  const isHoliday = isWeekend || !!holidayNote;
                                  const st = displayMonthData?.days?.[c.day - 1]?.status ?? null;
                                  const cls = st === 'safe' ? 'border-emerald-200 bg-emerald-50'
                                    : st === 'near_miss' ? 'border-amber-200 bg-amber-50'
                                    : st === 'accident' ? 'border-rose-200 bg-rose-50'
                                    : isHoliday ? 'border-slate-300 bg-slate-200/90'
                                    : 'border-slate-200 bg-white';
                                  const statusText = st === 'safe' ? 'SAFE' : st === 'near_miss' ? 'NEAR MISS' : st === 'accident' ? 'ACCIDENT' : 'NOT SET';
                                  const statusTone = st === 'safe'
                                    ? 'text-emerald-700 bg-emerald-100/80 border-emerald-200'
                                    : st === 'near_miss'
                                    ? 'text-amber-800 bg-amber-100/80 border-amber-200'
                                    : st === 'accident'
                                    ? 'text-rose-700 bg-rose-100/80 border-rose-200'
                                    : isHoliday
                                    ? 'text-slate-700 bg-slate-300/70 border-slate-400'
                                    : 'text-slate-500 bg-slate-50 border-slate-200';

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => cycleDayStatus(c.day!)}
                                      className={`rounded-xl border p-1 md:p-1.5 flex flex-col gap-1 text-left cursor-pointer hover:shadow-sm transition-shadow min-h-0 overflow-hidden ${cls}`}
                                      title={holidayNote ? `${holidayNote} • คลิกเพื่อเปลี่ยนสถานะ` : isWeekend ? `วันหยุดสุดสัปดาห์ • คลิกเพื่อเปลี่ยนสถานะ` : 'คลิกเพื่อเปลี่ยนสถานะ'}
                                    >
                                      <div className="flex items-center justify-between gap-1 shrink-0">
                                        <div className={`font-extrabold ${(!st && isHoliday) ? 'text-slate-700' : 'text-slate-900'}`} style={{ fontSize: scaledPx(13, compactScale, 10, 16) }}>{c.day}</div>
                                        {st === 'safe' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                                        {st === 'near_miss' && <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />}
                                        {st === 'accident' && <AlertTriangle className="h-3.5 w-3.5 text-rose-700 shrink-0" />}
                                      </div>
                                      <div className={`mt-auto rounded-md border px-1 py-0.5 font-bold text-center leading-tight ${statusTone}`} style={{ fontSize: scaledPx(10, compactScale, 8, 12) }}>
                                        {statusText}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </Card>
                        );
                      }}
                    </PanelWrap>
                  </div>
                </ResizablePanel>
                      </ResizablePanelGroup>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>

        </div>
      </main>

      {/* TICKER (bottom) */}
      <div className="ticker-wrap fixed bottom-0 left-0 right-0 z-20 border-t border-red-700 bg-red-600">
        <div className="h-full flex items-center gap-3 px-4">
          <div className="shrink-0 font-extrabold text-slate-900 text-[clamp(13px,1.6vh,18px)]">Announcement</div>
          <div className="flex-1 overflow-hidden">
            <div
              className="whitespace-nowrap font-black tracking-wide text-white text-[clamp(14px,1.8vh,24px)]"
              style={{
                animation: `marqueeRTL ${tickerSeconds}s linear infinite`,
                willChange: 'transform',
              }}
            >
              {tickerText}
            </div>
          </div>
          <button
            type="button"
            onClick={openTickerEditor}
            className="shrink-0 h-8 px-3 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50 inline-flex items-center gap-2 edit-only"
            title="Edit announcements"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      {/* Rename panel title dialog */}
      <Dialog open={!!renamePanel} onOpenChange={(open) => { if (!open) setRenamePanel(null); }}>
        <DialogContent className="w-[min(720px,96vw)] max-w-none">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-extrabold">Rename Panel</DialogTitle>
            <div className="text-sm text-slate-600 font-semibold">เปลี่ยนชื่อหัวช่องได้ตามต้องการ</div>
          </DialogHeader>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-500">Panel Title</label>
            <input
              value={renamePanel?.draft ?? ''}
              onChange={(e) => setRenamePanel((p) => (p ? { ...p, draft: e.target.value } : p))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="Enter title"
              autoFocus
            />
            <div className="text-xs text-slate-500 font-semibold">ปล่อยว่างเพื่อกลับไปใช้ชื่อเดิม</div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setRenamePanel(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveRenameTitle}
              className="h-10 px-4 rounded-xl bg-cyan-600 text-white font-extrabold hover:bg-cyan-700"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics dialog */}
      <Dialog open={editMetrics} onOpenChange={(open) => { if (!open) setEditMetrics(false); }}>
        <DialogContent className="w-[min(980px,96vw)] max-w-none">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-extrabold">Safety Metrics Settings</DialogTitle>
            <div className="text-sm text-slate-600 font-semibold">เพิ่ม/ลบ/แก้ไขหัวข้อได้สะดวก • กด Save เพื่อบันทึก</div>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={addMetricDraft}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-extrabold hover:bg-cyan-700 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> เพิ่มหัวข้อ
            </button>
            <div className="text-xs font-bold text-slate-500">รายการทั้งหมด: {metricsDraft.length}</div>
          </div>

          <ScrollArea className="h-[60vh] rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
            <div className="space-y-2">
              {metricsDraft.map((m, idx) => (
                <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="grid gap-2 items-end" style={{ gridTemplateColumns: 'minmax(220px,1.6fr) minmax(110px,0.5fr) minmax(90px,0.45fr) auto' }}>
                    <div className="min-w-0">
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">หัวข้อ #{idx + 1}</label>
                      <input
                        value={m.label}
                        onChange={(e) => updateMetricDraft(m.id, { label: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">ค่า</label>
                      <input
                        value={m.value}
                        onChange={(e) => updateMetricDraft(m.id, { value: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-right bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">หน่วย</label>
                      <input
                        value={m.unit || ''}
                        onChange={(e) => updateMetricDraft(m.id, { unit: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => deleteMetricDraft(m.id)}
                        className="h-10 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold inline-flex items-center gap-1"
                        title="ลบหัวข้อ"
                      >
                        <Trash2 className="h-4 w-4" /> ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setEditMetrics(false)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={saveMetricsEditor} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-2">
              <Save className="h-4 w-4" /> Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target dialog */}
      <Dialog open={editTarget} onOpenChange={(open) => { if (!open) setEditTarget(false); }}>
        <DialogContent className="w-[min(980px,96vw)] max-w-none">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-extrabold">Safety & Environment Target Settings</DialogTitle>
            <div className="text-sm text-slate-600 font-semibold">แก้ไขตัวแปรและค่า Best record / Loss time accident (Working Days คำนวณอัตโนมัติ)</div>
          </DialogHeader>

          <ScrollArea className="h-[60vh] rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="font-extrabold text-slate-800 mb-2">Variables</div>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
  {([
    ['manpower','Manpower (man)'],
    ['daysPerWeek','Day/Week'],
    ['hoursPerDay','Hr/Day'],
  ] as Array<[keyof TargetVars, string]>).map(([k, label]) => (
    <div key={String(k)}>
      <label className="block text-xs font-extrabold text-slate-500 mb-1">{label}</label>
      <input
        value={String(targetVarsDraft[k])}
        onChange={(e) => setTargetVarsDraft((p) => ({ ...p, [k]: Number(e.target.value) || 0 }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
        inputMode="decimal"
      />
    </div>
  ))}
  <div>
    <label className="block text-xs font-extrabold text-slate-500 mb-1">Working Days/Year (Auto)</label>
    <input
      value={String(targetVarsDraft.workingDaysYear)}
      readOnly
      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700 font-bold"
    />
  </div>
  <div>
    <label className="block text-xs font-extrabold text-slate-500 mb-1">Working Days (To Date) (Auto)</label>
    <input
      value={String(targetVarsDraft.workingDaysSoFar)}
      readOnly
      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700 font-bold"
    />
    <div className="mt-1 text-[11px] font-semibold text-slate-500">อัปเดตอัตโนมัติทุกวันเวลา 04:00</div>
  </div>
</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="font-extrabold text-slate-800 mb-2">Values</div>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1">Best Record (man-hours)</label>
                    <input
                      value={bestRecordDraft}
                      onChange={(e) => setBestRecordDraft(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1">Loss time accident (Time)</label>
                    <input
                      value={lossTimeAccidentsDraft}
                      onChange={(e) => setLossTimeAccidentsDraft(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setEditTarget(false)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={saveTargetEditor} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-2">
              <Save className="h-4 w-4" /> Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticker edit dialog */}
      <Dialog open={editTicker} onOpenChange={(open) => { if (!open) setEditTicker(false); }}>
        <DialogContent className="w-[min(980px,96vw)] max-w-none">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-extrabold">Announcement Ticker</DialogTitle>
            <div className="text-sm text-slate-600 font-semibold">พิมพ์ 1 บรรทัด = 1 ข้อความ • ระบบจะนำไปวิ่งเป็นแถบด้านล่าง</div>
          </DialogHeader>

          <textarea
            value={tickerDraft}
            onChange={(e) => setTickerDraft(e.target.value)}
            className="w-full h-[55vh] rounded-2xl border border-slate-200 p-4 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="พิมพ์ข้อความ..."
          />

          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setEditTicker(false)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={saveTickerEditor} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 inline-flex items-center gap-2">
              <Save className="h-4 w-4" /> Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}