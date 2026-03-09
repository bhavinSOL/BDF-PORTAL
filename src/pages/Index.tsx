import { useState, useRef, useMemo, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { KPICards } from "@/components/KPICards";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { ProblemDetails } from "@/components/ProblemDetails";
import { PPHTable } from "@/components/PPHTable";
import { getFilteredData, type BDFIssue } from "@/data/mockData";
import { loadExcelData } from "@/lib/loadExcelData";
import { exportCSV, exportExcel, exportChartImage } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";

type FilterType = "today" | "weekly" | "monthly" | "custom" | "all";

const Index = () => {
  const [filter, setFilter] = useState<FilterType>("monthly");
  const [lineFilter, setLineFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const chartRef = useRef<HTMLDivElement>(null);

  const [dashboardData, setDashboardData] = useState<BDFIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExcelData()
      .then((csvData) => {
        // Merge CSV data with inspector entries from localStorage
        let inspectorEntries: BDFIssue[] = [];
        try {
          const raw = localStorage.getItem("bdf-inspector-entries");
          if (raw) inspectorEntries = JSON.parse(raw);
        } catch { /* ignore */ }
        setDashboardData([...csvData, ...inspectorEntries]);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Excel load failed:", err);
        toast({
          title: "Data Load Failed",
          description: "Could not load Excel data. Please check the file.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  }, []);

  // Re-read inspector entries when tab gets focus (e.g., after adding entries on inspector page)
  useEffect(() => {
    function handleFocus() {
      loadExcelData().then((csvData) => {
        let inspectorEntries: BDFIssue[] = [];
        try {
          const raw = localStorage.getItem("bdf-inspector-entries");
          if (raw) inspectorEntries = JSON.parse(raw);
        } catch { /* ignore */ }
        setDashboardData([...csvData, ...inspectorEntries]);
      }).catch(() => {});
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const lines = useMemo(() => {
    const unique = [...new Set(dashboardData.map((d) => d.line).filter(Boolean))].sort();
    return ["all", ...unique];
  }, [dashboardData]);

  const sections = useMemo(() => {
    const unique = [...new Set(dashboardData.map((d) => d.section).filter(Boolean))].sort();
    return ["all", ...unique];
  }, [dashboardData]);

  const filteredData = getFilteredData(
    dashboardData, filter, lineFilter, sectionFilter, startDate, endDate
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <DashboardHeader />

        <div className="space-y-6">
          <DashboardFilters
            filter={filter}
            setFilter={setFilter}
            lineFilter={lineFilter}
            setLineFilter={setLineFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={setSectionFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onExportCSV={() => exportCSV(filteredData)}
            onExportExcel={() => exportExcel(filteredData)}
            onExportImage={() => exportChartImage(chartRef.current)}
            lines={lines}
            sections={sections}
          />

          <KPICards data={filteredData} />

          <DashboardCharts data={filteredData} chartRef={chartRef} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PPHTable data={filteredData} />
            <ProblemDetails data={filteredData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
