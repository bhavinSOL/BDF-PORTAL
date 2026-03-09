import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FilterType = "today" | "weekly" | "monthly" | "custom" | "all";

interface DashboardFiltersProps {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  lineFilter: string;
  setLineFilter: (v: string) => void;
  sectionFilter: string;
  setSectionFilter: (v: string) => void;
  startDate?: Date;
  setStartDate: (d?: Date) => void;
  endDate?: Date;
  setEndDate: (d?: Date) => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportImage: () => void;
  lines?: string[];
  sections?: string[];
}

const filterButtons: { label: string; value: FilterType }[] = [
  { label: "Today", value: "today" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "All Data", value: "all" },
  { label: "Custom", value: "custom" },
];

export function DashboardFilters({
  filter, setFilter, lineFilter, setLineFilter,
  sectionFilter, setSectionFilter, startDate, setStartDate,
  endDate, setEndDate, onExportCSV, onExportExcel, onExportImage,
  lines = ["all"],
  sections = ["all"],
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Time Filters */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border/50 overflow-x-auto">
        {filterButtons.map((fb) => (
          <Button
            key={fb.value}
            size="sm"
            variant={filter === fb.value ? "default" : "ghost"}
            onClick={() => setFilter(fb.value)}
            className="text-xs whitespace-nowrap"
          >
            {fb.label}
          </Button>
        ))}
      </div>

      {/* Custom date range */}
      {filter === "custom" && (
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {startDate ? format(startDate, "MMM dd") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {endDate ? format(endDate, "MMM dd") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Line Filter */}
      <Select value={lineFilter} onValueChange={setLineFilter}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="All Lines" />
        </SelectTrigger>
        <SelectContent>
          {lines.map((l) => (
            <SelectItem key={l} value={l}>{l === "all" ? "All Lines" : l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Section Filter */}
      <Select value={sectionFilter} onValueChange={setSectionFilter}>
        <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((s) => (
            <SelectItem key={s} value={s}>{s === "all" ? "All Sections" : s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Export Buttons */}
      <div className="flex gap-1 sm:ml-auto">
        <Button variant="outline" size="sm" onClick={onExportCSV} className="text-xs gap-1">
          <Download className="h-3 w-3" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExportExcel} className="text-xs gap-1">
          <Download className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onExportImage} className="text-xs gap-1">
          <Download className="h-3 w-3" /> PNG
        </Button>
      </div>
    </div>
  );
}
