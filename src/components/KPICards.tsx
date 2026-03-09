import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Factory } from "lucide-react";
import type { BDFIssue } from "@/data/mockData";
import { getPPH, TOTAL_PRODUCTION } from "@/data/mockData";

interface KPICardsProps {
  data: BDFIssue[];
}

export function KPICards({ data }: KPICardsProps) {
  const total = data.length;
  const solved = data.filter((d) => d.mark === "Solved").length;
  const unsolved = total - solved;
  const pph = getPPH(total, TOTAL_PRODUCTION);

  const lineCounts: Record<string, number> = {};
  data.forEach((d) => {
    lineCounts[d.line] = (lineCounts[d.line] || 0) + 1;
  });
  const topLine = Object.entries(lineCounts).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    {
      title: "Total Problems",
      value: total,
      icon: AlertTriangle,
      accent: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Solved",
      value: solved,
      icon: CheckCircle,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Unsolved",
      value: unsolved,
      icon: XCircle,
      accent: "text-muted-foreground",
      bg: "bg-muted/30",
    },
    {
      title: "Current PPH",
      value: pph,
      icon: TrendingUp,
      accent: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: "Top Issue Line",
      value: topLine ? topLine[0] : "N/A",
      subtitle: topLine ? `${topLine[1]} issues` : "",
      icon: Factory,
      accent: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate mr-1">
                {card.title}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${card.bg}`}>
                <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.accent}`} />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-card-foreground truncate">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
