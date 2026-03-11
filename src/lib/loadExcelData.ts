import type { BDFIssue } from "@/data/mockData";

/**
 * Loads ECU_Problem_Analysis.csv and converts rows into BDFIssue[] entries.
 * Each CSV row has a "Total Occurrences" count — we expand that into
 * individual entries. These entries have no real date (date = "") and
 * are shown under the "Old Data" filter on the dashboard.
 */

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function getECUCategory(ecu: string): string {
  const first = ecu.split(/[\s/]+/)[0];
  return first || ecu;
}

export async function loadExcelData(): Promise<BDFIssue[]> {
  const res = await fetch("/data/ECU_Problem_Analysis.csv");
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  const text = await res.text();

  const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
  if (rawLines.length < 2) return [];

  const headers = parseCSVLine(rawLines[0]).map((h) => h.toLowerCase());
  const ecuIdx = headers.findIndex((h) => h.includes("ecu"));
  const dtcIdx = headers.findIndex((h) => h.includes("dtc code"));
  const descIdx = headers.findIndex((h) =>
    h.includes("dtc description") || h.includes("description")
  );
  const countIdx = headers.findIndex((h) =>
    h.includes("total occurrences") || h.includes("occurrences")
  );

  const issues: BDFIssue[] = [];
  let id = 1;

  for (let r = 1; r < rawLines.length; r++) {
    const cols = parseCSVLine(rawLines[r]);
    const ecu = cols[ecuIdx] || "";
    const dtcCode = cols[dtcIdx] || "";
    const desc = cols[descIdx] || "";
    const totalOccurrences = Math.ceil(Number(cols[countIdx]) || 0);

    if (!ecu || !desc || totalOccurrences <= 0) continue;

    const section = ecu;
    const line = getECUCategory(ecu);

    for (let k = 0; k < totalOccurrences; k++) {
      issues.push({
        id: id++,
        line,
        section,
        issue: dtcCode || `BDF-${String(id).padStart(4, "0")}`,
        problem: desc,
        mark: id % 3 === 0 ? "Solved" : "Not Solved",
        date: "",
      });
    }
  }

  return issues;
}
