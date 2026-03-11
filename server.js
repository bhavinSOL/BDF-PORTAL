import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Store entries OUTSIDE public/ to avoid Vite file-watcher locking the file
const DATA_DIR = path.join(__dirname, "data");
const CSV_PATH = path.join(DATA_DIR, "inspector_entries.csv");
const PUBLIC_CSV = path.join(__dirname, "public", "data", "inspector_entries.csv");
const CSV_HEADERS = ["Issue No","Line","Section / ECU","Problem","Status","Date","VIN No","Root Cause","Solution"];

// Ensure data directory exists; seed from public/ copy if our file doesn't exist yet
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CSV_PATH) && fs.existsSync(PUBLIC_CSV)) {
  fs.copyFileSync(PUBLIC_CSV, CSV_PATH);
}

/** Escape a value for CSV (quote if it contains comma, quote, or newline) */
function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Read all entries from the CSV file */
function readEntries() {
  if (!fs.existsSync(CSV_PATH)) return [];
  const text = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Skip header row
  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    return {
      issue: cols[0] || "",
      line: cols[1] || "",
      section: cols[2] || "",
      problem: cols[3] || "",
      mark: cols[4] || "Not Solved",
      date: cols[5] || "",
      vin: cols[6] || "",
      rootCause: cols[7] || "",
      solution: cols[8] || "",
    };
  });
}

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

/** Write all entries to the CSV file (with retry for EBUSY on Windows) */
function writeEntries(entries, retries = 3) {
  const header = CSV_HEADERS.map(csvEscape).join(",");
  const rows = entries.map((e) =>
    [e.issue, e.line, e.section, e.problem, e.mark, e.date, e.vin, e.rootCause, e.solution]
      .map(csvEscape)
      .join(",")
  );
  const content = [header, ...rows].join("\n");
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(CSV_PATH, content, "utf-8");
      return;
    } catch (err) {
      if (err.code === "EBUSY" && i < retries - 1) {
        // Wait briefly and retry
        const waitMs = 100 * (i + 1);
        const start = Date.now();
        while (Date.now() - start < waitMs) { /* busy wait */ }
      } else {
        throw err;
      }
    }
  }
}

// GET all entries
app.get("/api/entries", (_req, res) => {
  try {
    const entries = readEntries();
    res.json(entries);
  } catch (err) {
    console.error("Failed to read entries:", err);
    res.status(500).json({ error: "Failed to read entries" });
  }
});

// POST a new entry (appends to file)
app.post("/api/entries", (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.problem) {
      return res.status(400).json({ error: "Missing entry data" });
    }
    const entries = readEntries();
    entries.push({
      issue: entry.issue || "",
      line: entry.line || "",
      section: entry.section || "",
      problem: entry.problem || "",
      mark: entry.mark || "Not Solved",
      date: entry.date || "",
      vin: entry.vin || "",
      rootCause: entry.rootCause || "",
      solution: entry.solution || "",
    });
    writeEntries(entries);
    res.json({ success: true, total: entries.length });
  } catch (err) {
    console.error("Failed to save entry:", err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});

// PUT — replace all entries (for bulk import / sync)
app.put("/api/entries", (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "Expected array of entries" });
    }
    writeEntries(entries);
    res.json({ success: true, total: entries.length });
  } catch (err) {
    console.error("Failed to save entries:", err);
    res.status(500).json({ error: "Failed to save entries" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
