import type { Plugin, ViteDevServer } from "vite";
import fs from "fs";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

const DATA_DIR = path.resolve("data");
const CSV_PATH = path.join(DATA_DIR, "inspector_entries.csv");
const PUBLIC_CSV = path.resolve("public", "data", "inspector_entries.csv");
const CSV_HEADERS = [
  "Issue No",
  "Line",
  "Section / ECU",
  "Problem",
  "Status",
  "Date",
  "VIN No",
  "Root Cause",
  "Solution",
];

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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

interface EntryRecord {
  issue: string;
  line: string;
  section: string;
  problem: string;
  mark: string;
  date: string;
  vin: string;
  rootCause: string;
  solution: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CSV_PATH) && fs.existsSync(PUBLIC_CSV)) {
    fs.copyFileSync(PUBLIC_CSV, CSV_PATH);
  }
}

function readEntries(): EntryRecord[] {
  ensureDataDir();
  if (!fs.existsSync(CSV_PATH)) return [];
  const text = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
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

function writeEntries(entries: EntryRecord[]) {
  ensureDataDir();
  const header = CSV_HEADERS.map(csvEscape).join(",");
  const rows = entries.map((e) =>
    [e.issue, e.line, e.section, e.problem, e.mark, e.date, e.vin, e.rootCause, e.solution]
      .map(csvEscape)
      .join(",")
  );
  fs.writeFileSync(CSV_PATH, [header, ...rows].join("\n"), "utf-8");
}

/** Read JSON body from an incoming request */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export default function apiPlugin(): Plugin {
  return {
    name: "vite-plugin-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/entries")) {
          next();
          return;
        }

        try {
          // GET /api/entries
          if (req.method === "GET") {
            const entries = readEntries();
            sendJSON(res, 200, entries);
            return;
          }

          // POST /api/entries — append one entry
          if (req.method === "POST") {
            const entry = (await readBody(req)) as Partial<EntryRecord>;
            if (!entry || !entry.problem) {
              sendJSON(res, 400, { error: "Missing entry data" });
              return;
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
            sendJSON(res, 200, { success: true, total: entries.length });
            return;
          }

          // PUT /api/entries — replace all entries
          if (req.method === "PUT") {
            const entries = (await readBody(req)) as EntryRecord[];
            if (!Array.isArray(entries)) {
              sendJSON(res, 400, { error: "Expected array of entries" });
              return;
            }
            writeEntries(entries);
            sendJSON(res, 200, { success: true, total: entries.length });
            return;
          }

          sendJSON(res, 405, { error: "Method not allowed" });
        } catch (err) {
          console.error("API error:", err);
          sendJSON(res, 500, { error: "Internal server error" });
        }
      });
    },
  };
}
