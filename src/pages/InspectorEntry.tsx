import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Plus, Download, Upload, CheckCircle, ClipboardList, Factory, Calendar, CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { type BDFIssue } from "@/data/mockData";
import { loadExcelData } from "@/lib/loadExcelData";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bdf-inspector-entries";

function getStoredEntries(): BDFIssue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: BDFIssue[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
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

function csvRowToEntry(cols: string[], headers: string[], baseId: number): BDFIssue | null {
  const get = (key: string) => {
    const idx = headers.findIndex((h) => h.includes(key));
    return idx >= 0 ? (cols[idx] || "").trim() : "";
  };
  const line = get("line");
  const section = get("section") || get("ecu");
  const problem = get("problem");
  const date = get("date");
  if (!line || !section || !problem) return null;
  return {
    id: baseId,
    line,
    section,
    issue: get("issue") || `BDF-${String(baseId).padStart(4, "0")}`,
    problem,
    mark: (get("status") || "Not Solved") as "Solved" | "Not Solved",
    date: date || format(new Date(), "yyyy-MM-dd"),
    rootCause: get("root cause") || undefined,
    solution: get("solution") || undefined,
  };
}

async function loadInspectorCSV(): Promise<BDFIssue[]> {
  try {
    // Try new filename first, fallback to old
    let res = await fetch("/data/inspector_entries.csv");
    if (!res.ok) res = await fetch("/data/inspector_data.csv");
    if (!res.ok) return [];
    const text = await res.text();
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
    if (rawLines.length < 2) return [];
    const headers = parseCSVLine(rawLines[0]).map((h) => h.toLowerCase());
    const entries: BDFIssue[] = [];
    for (let r = 1; r < rawLines.length; r++) {
      const cols = parseCSVLine(rawLines[r]);
      const entry = csvRowToEntry(cols, headers, 50000 + r);
      if (entry) entries.push(entry);
    }
    return entries;
  } catch {
    return [];
  }
}

const InspectorEntry = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<BDFIssue[]>([]);
  const [excelData, setExcelData] = useState<BDFIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Excel data for dropdown options + merge inspector_data.csv with localStorage
  useEffect(() => {
    Promise.all([loadExcelData(), loadInspectorCSV()])
      .then(([csvData, inspectorCsvData]) => {
        setExcelData(csvData);

        // Merge localStorage entries with inspector_data.csv (deduplicate by problem+date+section)
        const storedEntries = getStoredEntries();
        const seen = new Set<string>();
        const merged: BDFIssue[] = [];

        // localStorage entries take priority (user-created)
        for (const e of storedEntries) {
          const key = `${e.problem}||${e.section}||${e.date}`;
          seen.add(key);
          merged.push(e);
        }

        // Add inspector CSV entries that aren't duplicates
        for (const e of inspectorCsvData) {
          const key = `${e.problem}||${e.section}||${e.date}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(e);
          }
        }

        setEntries(merged);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Data load failed:", err);
        // Fallback to localStorage only
        setEntries(getStoredEntries());
        setIsLoading(false);
      });
  }, []);

  // Form state
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [customProblem, setCustomProblem] = useState("");
  const [mark, setMark] = useState<"Solved" | "Not Solved">("Not Solved");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rootCause, setRootCause] = useState("");
  const [solution, setSolution] = useState("");
  const [entryFilter, setEntryFilter] = useState<"all" | "today">("all");

  // Build a mapping: problem → [{line, section}] for auto-fill
  const problemMap = useMemo(() => {
    const map: Record<string, { line: string; section: string }[]> = {};
    const seen = new Set<string>();
    for (const d of excelData) {
      if (!d.problem || !d.section) continue;
      const key = `${d.problem}||${d.section}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!map[d.problem]) map[d.problem] = [];
      map[d.problem].push({ line: d.line, section: d.section });
    }
    return map;
  }, [excelData]);

  const problems = useMemo(
    () => Object.keys(problemMap).sort(),
    [problemMap]
  );

  // Sections filtered by selected problem (or all if custom/none)
  const filteredSections = useMemo(() => {
    if (selectedProblem && selectedProblem !== "__custom" && problemMap[selectedProblem]) {
      return [...new Set(problemMap[selectedProblem].map((m) => m.section))].sort();
    }
    return [...new Set(excelData.map((d) => d.section).filter(Boolean))].sort();
  }, [selectedProblem, problemMap, excelData]);

  const lines = useMemo(
    () => [...new Set(excelData.map((d) => d.line).filter(Boolean))].sort(),
    [excelData]
  );

  const allData = useMemo(() => [...excelData, ...entries], [excelData, entries]);

  // Sort entries by date (latest first)
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter((e) => e.date === todayStr);

  // Filtered + sorted entries for table display and export
  const displayEntries = useMemo(() => {
    const base = entryFilter === "today" ? todayEntries : entries;
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, todayEntries, entryFilter]);

  function handleProblemChange(value: string) {
    setSelectedProblem(value);
    if (value === "__custom") {
      setSelectedSection("");
      setSelectedLine("");
      return;
    }
    const matches = problemMap[value];
    if (matches && matches.length === 1) {
      // Only one ECU for this problem — auto-fill both
      setSelectedSection(matches[0].section);
      setSelectedLine(matches[0].line);
    } else {
      // Multiple ECUs possible — reset so user picks section
      setSelectedSection("");
      setSelectedLine("");
    }
  }

  function handleSectionChange(value: string) {
    setSelectedSection(value);
    // Auto-fill line from the problem→section mapping
    if (selectedProblem && selectedProblem !== "__custom" && problemMap[selectedProblem]) {
      const match = problemMap[selectedProblem].find((m) => m.section === value);
      if (match) {
        setSelectedLine(match.line);
        return;
      }
    }
    // Fallback: derive line from the excelData
    const fromData = excelData.find((d) => d.section === value);
    if (fromData) setSelectedLine(fromData.line);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const problemName = selectedProblem === "__custom" ? customProblem.trim() : selectedProblem;
    if (!selectedLine || !selectedSection || !problemName) {
      toast({ title: "Missing fields", description: "Please select Line, Section/ECU, and Problem.", variant: "destructive" });
      return;
    }

    const maxId = Math.max(0, ...allData.map((d) => d.id), ...entries.map((d) => d.id));
    const newEntry: BDFIssue = {
      id: maxId + 1,
      line: selectedLine,
      section: selectedSection,
      issue: `BDF-${String(maxId + 1).padStart(4, "0")}`,
      problem: problemName,
      mark,
      date: format(selectedDate, "yyyy-MM-dd"),
      rootCause: rootCause.trim() || undefined,
      solution: solution.trim() || undefined,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    saveEntries(updated);

    toast({ title: "Entry Added", description: `${problemName} logged on ${selectedLine} - ${selectedSection}` });

    // Reset form
    setSelectedProblem("");
    setCustomProblem("");
    setSelectedSection("");
    setSelectedLine("");
    setMark("Not Solved");
    setSelectedDate(new Date());
    setRootCause("");
    setSolution("");
  }

  function handleDownloadExcel() {
    if (displayEntries.length === 0) {
      toast({ title: "No Entries", description: "No entries to export for selected filter.", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      displayEntries.map((d) => ({
        "Issue No": d.issue,
        Line: d.line,
        "Section / ECU": d.section,
        Problem: d.problem,
        Status: d.mark,
        Date: d.date,
        "Root Cause": d.rootCause || "",
        Solution: d.solution || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inspector Entries");
    XLSX.writeFile(wb, `Inspector_Entries_${entryFilter === "today" ? todayStr : "All"}.xlsx`);
    toast({ title: "Excel Downloaded", description: `${entryFilter === "today" ? "Today's" : "All"} entries exported.` });
  }

  function handleDownloadCSV() {
    if (displayEntries.length === 0) {
      toast({ title: "No Entries", description: "No entries to export for selected filter.", variant: "destructive" });
      return;
    }
    const headers = ["Issue No", "Line", "Section / ECU", "Problem", "Status", "Date", "Root Cause", "Solution"];
    const rows = displayEntries.map((d) => [
      d.issue, d.line, d.section, d.problem, d.mark, d.date,
      d.rootCause || "", d.solution || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Inspector_Entries_${entryFilter === "today" ? todayStr : "All"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: `${entryFilter === "today" ? "Today's" : "All"} entries exported as CSV.` });
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
        if (rawLines.length < 2) {
          toast({ title: "Empty File", description: "No data rows found in CSV.", variant: "destructive" });
          return;
        }
        const headers = parseCSVLine(rawLines[0]).map((h) => h.toLowerCase());
        const imported: BDFIssue[] = [];
        const maxExistingId = Math.max(0, ...entries.map((d) => d.id));
        for (let r = 1; r < rawLines.length; r++) {
          const cols = parseCSVLine(rawLines[r]);
          const entry = csvRowToEntry(cols, headers, maxExistingId + r);
          if (entry) imported.push(entry);
        }
        if (imported.length === 0) {
          toast({ title: "No Valid Rows", description: "Could not parse any entries from the CSV.", variant: "destructive" });
          return;
        }
        // Merge with existing, deduplicate
        const seen = new Set<string>();
        const merged: BDFIssue[] = [];
        for (const ent of entries) {
          const key = `${ent.problem}||${ent.section}||${ent.date}`;
          seen.add(key);
          merged.push(ent);
        }
        let addedCount = 0;
        for (const ent of imported) {
          const key = `${ent.problem}||${ent.section}||${ent.date}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(ent);
            addedCount++;
          }
        }
        setEntries(merged);
        saveEntries(merged);
        toast({ title: "Import Complete", description: `${addedCount} new entries imported (${imported.length - addedCount} duplicates skipped).` });
      } catch (err) {
        console.error("CSV import failed:", err);
        toast({ title: "Import Failed", description: "Could not read the CSV file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">BDF Inspector Entry</h1>
              <p className="text-xs text-muted-foreground">Log problems during inspection</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {format(new Date(), "dd MMM yyyy")}
            </Badge>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImportCSV}
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1 text-xs">
              <Upload className="h-3 w-3" /> Import CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadCSV} className="gap-1 text-xs">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadExcel} className="gap-1 text-xs">
              <Download className="h-3 w-3" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entry Form */}
          <Card className="lg:col-span-1 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> New Problem Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Loading options...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Problem — select first, others auto-fill */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Problem *</Label>
                    <Select value={selectedProblem} onValueChange={handleProblemChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select Problem" />
                      </SelectTrigger>
                      <SelectContent>
                        {problems.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="__custom">+ Add New Problem</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedProblem === "__custom" && (
                      <Input
                        placeholder="Enter new problem name"
                        value={customProblem}
                        onChange={(e) => setCustomProblem(e.target.value)}
                        className="h-9 text-sm mt-1.5"
                      />
                    )}
                  </div>

                  {/* Section / ECU — auto-filled or filtered by problem */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Section / ECU *
                      {selectedSection && selectedProblem && selectedProblem !== "__custom" && (
                        <span className="text-primary ml-1">(auto)</span>
                      )}
                    </Label>
                    <Select value={selectedSection} onValueChange={handleSectionChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select Section / ECU" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSections.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Line — auto-filled from problem+section mapping */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Production Line *
                      {selectedLine && selectedProblem && selectedProblem !== "__custom" && (
                        <span className="text-primary ml-1">(auto)</span>
                      )}
                    </Label>
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select Line" />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status</Label>
                    <Select value={mark} onValueChange={(v) => setMark(v as "Solved" | "Not Solved")}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Solved">Not Solved</SelectItem>
                        <SelectItem value="Solved">Solved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full h-9 text-sm justify-start gap-2 font-normal", !selectedDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(selectedDate, "dd MMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => d && setSelectedDate(d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Root Cause */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Root Cause</Label>
                    <Textarea
                      placeholder="Describe root cause (optional)"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* Solution */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Solution</Label>
                    <Textarea
                      placeholder="Describe solution (optional)"
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <CheckCircle className="h-4 w-4" /> Log Problem
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Today's Entries + Stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{todayEntries.length}</p>
                  <p className="text-xs text-muted-foreground">Today's Entries</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{entries.length}</p>
                  <p className="text-xs text-muted-foreground">Total New Entries</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{allData.length}</p>
                  <p className="text-xs text-muted-foreground">All Issues</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Entries Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Factory className="h-4 w-4 text-primary" /> Entries
                    <Badge variant="secondary" className="text-xs ml-1">{displayEntries.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={entryFilter === "all" ? "default" : "outline"}
                      onClick={() => setEntryFilter("all")}
                      className="h-7 text-xs px-3"
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={entryFilter === "today" ? "default" : "outline"}
                      onClick={() => setEntryFilter("today")}
                      className="h-7 text-xs px-3"
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Issue</TableHead>
                        <TableHead className="text-xs">Line</TableHead>
                        <TableHead className="text-xs">Section/ECU</TableHead>
                        <TableHead className="text-xs">Problem</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                            {entryFilter === "today" ? "No entries for today." : "No entries yet. Use the form to log problems."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs font-mono">{entry.issue}</TableCell>
                            <TableCell className="text-xs">{entry.line}</TableCell>
                            <TableCell className="text-xs">{entry.section}</TableCell>
                            <TableCell className="text-sm font-medium">{entry.problem}</TableCell>
                            <TableCell>
                              <Badge
                                variant={entry.mark === "Solved" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {entry.mark}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{entry.date}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectorEntry;
