import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertCircle, CheckCircle } from "lucide-react";
import type { BDFIssue } from "@/data/mockData";

interface ProblemDetailsProps {
  data: BDFIssue[];
}

export function ProblemDetails({ data }: ProblemDetailsProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BDFIssue | null>(null);

  const uniqueProblems = Array.from(
    new Map(data.map((d) => [d.problem, d])).values()
  );

  const filtered = uniqueProblems.filter((d) =>
    d.problem.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground">
          Problem Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Problem List */}
          <ScrollArea className="h-[300px] border border-border/50 rounded-lg">
            <div className="p-2 space-y-1">
              {filtered.map((problem) => {
                const count = data.filter((d) => d.problem === problem.problem).length;
                const solvedCount = data.filter(
                  (d) => d.problem === problem.problem && d.mark === "Solved"
                ).length;
                return (
                  <button
                    key={problem.problem}
                    onClick={() => setSelected(problem)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selected?.problem === problem.problem
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-card-foreground line-clamp-2 text-xs sm:text-sm">
                        {problem.problem}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                        {count}×
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-primary">{solvedCount} solved</span>
                      <span className="text-xs text-destructive">{count - solvedCount} open</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Detail Panel */}
          <div className="border border-border/50 rounded-lg p-4">
            {selected ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-card-foreground">{selected.problem}</h3>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Root Cause</p>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-card-foreground">{selected.rootCause || "Not documented"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Solution</p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-card-foreground">{selected.solution || "Not documented"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={selected.mark === "Solved" ? "default" : "destructive"}>
                    {selected.mark}
                  </Badge>
                  <Badge variant="outline">{selected.line}</Badge>
                  <Badge variant="outline">{selected.section}</Badge>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a problem to view details
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
