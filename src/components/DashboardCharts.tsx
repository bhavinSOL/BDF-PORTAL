import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import type { BDFIssue } from "@/data/mockData";
import {
  getTopProblems, getSolvedUnsolved, getLineDistribution, getWeeklyTrend,
} from "@/data/mockData";

const CHART_COLORS = [
  "hsl(198, 93%, 59%)",
  "hsl(213, 93%, 67%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 90%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(200, 98%, 39%)",
  "hsl(0, 72%, 50%)",
  "hsl(340, 80%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(60, 70%, 50%)",
];

const PIE_SOLVED_COLORS = ["hsl(200, 98%, 39%)", "hsl(0, 72%, 50%)"];

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "..." : str;
}

interface DashboardChartsProps {
  data: BDFIssue[];
  chartRef?: React.RefObject<HTMLDivElement>;
}

export function DashboardCharts({ data, chartRef }: DashboardChartsProps) {
  const topProblems = getTopProblems(data);
  const solvedUnsolved = getSolvedUnsolved(data);
  const lineDistribution = getLineDistribution(data);
  const weeklyTrend = getWeeklyTrend(data);

  const solvedTotal = solvedUnsolved.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top 10 Problems Bar Chart — scrollable on mobile */}
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Top 10 Most Frequent Problems
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[600px]">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={topProblems}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(212, 26%, 83%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={200}
                    tick={{ fontSize: 10, fill: "hsl(215, 20%, 65%)" }}
                    tickFormatter={(v: string) => truncate(v, 45)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 40%, 98%)",
                      border: "1px solid hsl(212, 26%, 83%)",
                      borderRadius: "8px",
                      fontSize: 12,
                      maxWidth: 350,
                      whiteSpace: "normal" as const,
                    }}
                    formatter={(value: number) => [value, "Count"]}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar dataKey="count" fill="hsl(200, 98%, 39%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solved vs Unsolved — donut with center label */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Solved vs Unsolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={solvedUnsolved}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
                label={({ name, value }) => {
                  const pct = solvedTotal > 0 ? ((value / solvedTotal) * 100).toFixed(1) : "0";
                  return `${name} ${pct}%`;
                }}
                labelLine={{ stroke: "hsl(215, 20%, 65%)", strokeWidth: 1 }}
              >
                {solvedUnsolved.map((_, i) => (
                  <Cell key={i} fill={PIE_SOLVED_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  background: "hsl(210, 40%, 98%)",
                  border: "1px solid hsl(212, 26%, 83%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Line/ECU Distribution — horizontal bar instead of pie for many categories */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Issues by ECU Line
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[350px]">
              <ResponsiveContainer width="100%" height={Math.max(250, lineDistribution.length * 28 + 40)}>
                <BarChart
                  data={lineDistribution.sort((a, b) => b.value - a.value)}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(212, 26%, 83%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }}
                    tickFormatter={(v: string) => truncate(v, 12)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 40%, 98%)",
                      border: "1px solid hsl(212, 26%, 83%)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value, "Issues"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {lineDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly PPH Trend Line Chart */}
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Weekly PPH Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[500px]">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weeklyTrend} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(212, 26%, 83%)" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 40%, 98%)",
                      border: "1px solid hsl(212, 26%, 83%)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pph"
                    name="PPH"
                    stroke="hsl(200, 98%, 39%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(200, 98%, 39%)", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Count"
                    stroke="hsl(213, 93%, 67%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(213, 93%, 67%)", r: 4 }}
                  />
                  <Legend
                    verticalAlign="top"
                    iconType="line"
                    iconSize={14}
                    formatter={(value: string) => (
                      <span style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>{value}</span>
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
