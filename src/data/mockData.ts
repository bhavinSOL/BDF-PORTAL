import { format, subDays, startOfMonth, startOfWeek } from "date-fns";

export interface BDFIssue {
  id: number;
  line: string;
  section: string;
  issue: string;
  problem: string;
  mark: "Solved" | "Not Solved";
  date: string;
  rootCause?: string;
  solution?: string;
  imageUrl?: string;
}

const lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const sections = ["Body Shop", "Paint Shop", "Trim Line", "Chassis", "Final Assembly", "Quality Gate"];
const problems = [
  "Panel Gap Misalignment",
  "Weld Spatter on Frame",
  "Paint Orange Peel",
  "Door Hinge Misfit",
  "Seal Leakage",
  "Bolt Torque Deviation",
  "Scratch on Body Panel",
  "Clip Missing",
  "Wire Harness Routing",
  "Adhesive Bond Failure",
  "Surface Dent",
  "Color Mismatch",
  "Underbody Coating Gap",
  "Headlamp Fitment Issue",
  "Dashboard Rattle Noise",
];

const rootCauses: Record<string, string> = {
  "Panel Gap Misalignment": "Fixture calibration drift over 500 cycles",
  "Weld Spatter on Frame": "Welding current set 15% above specification",
  "Paint Orange Peel": "Paint viscosity too high due to temperature variance",
  "Door Hinge Misfit": "Supplier dimension out of tolerance by 0.3mm",
  "Seal Leakage": "Seal compression ratio below 40% threshold",
  "Bolt Torque Deviation": "Torque gun calibration expired",
  "Scratch on Body Panel": "Transfer conveyor roller contamination",
  "Clip Missing": "Operator skip due to line speed increase",
  "Wire Harness Routing": "Incorrect routing template at Station 12",
  "Adhesive Bond Failure": "Primer application missed on left panel",
  "Surface Dent": "Material handling damage during transfer",
  "Color Mismatch": "Batch pigment variation exceeding delta E > 1.5",
  "Underbody Coating Gap": "Spray nozzle blockage at position 3",
  "Headlamp Fitment Issue": "Bracket mounting point shifted",
  "Dashboard Rattle Noise": "Insufficient foam padding at joint area",
};

const solutions: Record<string, string> = {
  "Panel Gap Misalignment": "Recalibrate fixture every 250 cycles. Implement SPC monitoring.",
  "Weld Spatter on Frame": "Adjust welding parameters to spec. Add spatter guard.",
  "Paint Orange Peel": "Control booth temperature ±2°C. Adjust thinner ratio.",
  "Door Hinge Misfit": "Issue SCAR to supplier. 100% inspection incoming.",
  "Seal Leakage": "Replace seal batch. Verify compression with gauge.",
  "Bolt Torque Deviation": "Recalibrate torque tools weekly. Digital tracking.",
  "Scratch on Body Panel": "Clean rollers every shift. Add protective film.",
  "Clip Missing": "Add poka-yoke check at station. Visual board update.",
  "Wire Harness Routing": "Update routing template. Retrain operators.",
  "Adhesive Bond Failure": "Add primer verification step. UV light check.",
  "Surface Dent": "Padded handling fixtures. Anti-dent conveyor upgrade.",
  "Color Mismatch": "Tighten batch acceptance criteria to delta E < 1.0.",
  "Underbody Coating Gap": "Nozzle maintenance schedule. Backup nozzle ready.",
  "Headlamp Fitment Issue": "Jig correction. Dimensional audit of brackets.",
  "Dashboard Rattle Noise": "Increase foam density. Add anti-rattle clips.",
};

function randomDate(daysBack: number): string {
  const d = subDays(new Date(), Math.floor(Math.random() * daysBack));
  return format(d, "yyyy-MM-dd");
}

function generateMockData(): BDFIssue[] {
  const data: BDFIssue[] = [];
  let id = 1;
  for (let i = 0; i < 350; i++) {
    const problem = problems[Math.floor(Math.random() * problems.length)];
    const line = lines[Math.floor(Math.random() * lines.length)];
    const section = sections[Math.floor(Math.random() * sections.length)];
    data.push({
      id: id++,
      line,
      section,
      issue: `BDF-${String(id).padStart(4, "0")}`,
      problem,
      mark: Math.random() > 0.35 ? "Solved" : "Not Solved",
      date: randomDate(90),
      rootCause: rootCauses[problem],
      solution: solutions[problem],
    });
  }
  return data;
}

export const mockData = generateMockData();

export const TOTAL_PRODUCTION = 5000; // monthly production volume

export function getFilteredData(
  data: BDFIssue[],
  filter: "today" | "weekly" | "monthly" | "custom" | "all",
  lineFilter?: string,
  sectionFilter?: string,
  startDate?: Date,
  endDate?: Date
): BDFIssue[] {
  const today = new Date();
  let filtered = [...data];

  if (filter === "all") {
    // No date filtering — show everything
  } else if (filter === "today") {
    const todayStr = format(today, "yyyy-MM-dd");
    filtered = filtered.filter((d) => d.date === todayStr);
  } else if (filter === "weekly") {
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");
    filtered = filtered.filter((d) => d.date >= weekStart && d.date <= todayStr);
  } else if (filter === "monthly") {
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");
    filtered = filtered.filter((d) => d.date >= monthStart && d.date <= todayStr);
  } else if (filter === "custom" && startDate && endDate) {
    const s = format(startDate, "yyyy-MM-dd");
    const e = format(endDate, "yyyy-MM-dd");
    filtered = filtered.filter((d) => d.date >= s && d.date <= e);
  }

  if (lineFilter && lineFilter !== "all") {
    filtered = filtered.filter((d) => d.line === lineFilter);
  }
  if (sectionFilter && sectionFilter !== "all") {
    filtered = filtered.filter((d) => d.section === sectionFilter);
  }

  return filtered;
}

export function getTopProblems(data: BDFIssue[], limit = 10) {
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.problem] = (counts[d.problem] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function getPPH(totalProblems: number, totalProduction = TOTAL_PRODUCTION) {
  return totalProduction > 0 ? ((totalProblems / totalProduction) * 100).toFixed(2) : "0.00";
}

export function getPPHByProblem(data: BDFIssue[], totalProduction = TOTAL_PRODUCTION) {
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.problem] = (counts[d.problem] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      pph: ((count / totalProduction) * 100).toFixed(2),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getLineDistribution(data: BDFIssue[]) {
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.line] = (counts[d.line] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function getSolvedUnsolved(data: BDFIssue[]) {
  const solved = data.filter((d) => d.mark === "Solved").length;
  const unsolved = data.filter((d) => d.mark === "Not Solved").length;
  return [
    { name: "Solved", value: solved },
    { name: "Not Solved", value: unsolved },
  ];
}

export function getWeeklyTrend(data: BDFIssue[]) {
  const weeks: Record<string, number> = {};
  data.forEach((d) => {
    const weekStart = format(startOfWeek(new Date(d.date), { weekStartsOn: 1 }), "MMM dd");
    weeks[weekStart] = (weeks[weekStart] || 0) + 1;
  });
  return Object.entries(weeks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count, pph: ((count / TOTAL_PRODUCTION) * 100).toFixed(2) }));
}
