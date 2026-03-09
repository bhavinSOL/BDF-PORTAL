import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import type { BDFIssue } from "@/data/mockData";
import { getPPHByProblem, TOTAL_PRODUCTION } from "@/data/mockData";

export function exportCSV(data: BDFIssue[], filename = "bdf-issues.csv") {
  const headers = ["ID", "Line", "Section", "Issue", "Problem", "Status", "Date"];
  const rows = data.map((d) => [d.id, d.line, d.section, d.issue, d.problem, d.mark, d.date]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  downloadBlob(csv, filename, "text/csv");
}

export function exportExcel(data: BDFIssue[], filename = "bdf-analysis.xlsx") {
  const pphData = getPPHByProblem(data, TOTAL_PRODUCTION);
  const ws = XLSX.utils.json_to_sheet(
    pphData.map((p) => ({
      "Problem Name": p.name,
      "Total Occurrence": p.count,
      PPH: p.pph,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Analysis");

  const issuesWs = XLSX.utils.json_to_sheet(
    data.map((d) => ({
      ID: d.id,
      Line: d.line,
      Section: d.section,
      Issue: d.issue,
      Problem: d.problem,
      Status: d.mark,
      Date: d.date,
    }))
  );
  XLSX.utils.book_append_sheet(wb, issuesWs, "Raw Data");

  XLSX.writeFile(wb, filename);
}

export async function exportChartImage(element: HTMLElement | null, filename = "chart.png") {
  if (!element) return;
  try {
    const dataUrl = await toPng(element, { backgroundColor: "#f5f7fa" });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Failed to export chart image", err);
  }
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
