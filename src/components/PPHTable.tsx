import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { BDFIssue } from "@/data/mockData";
import { getPPHByProblem, TOTAL_PRODUCTION } from "@/data/mockData";

interface PPHTableProps {
  data: BDFIssue[];
}

export function PPHTable({ data }: PPHTableProps) {
  const pphData = getPPHByProblem(data, TOTAL_PRODUCTION).slice(0, 10);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground">
          PPH by Problem (Top 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs min-w-[200px]">Problem</TableHead>
                <TableHead className="text-xs text-right whitespace-nowrap">Occurrences</TableHead>
                <TableHead className="text-xs text-right">PPH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pphData.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="text-xs sm:text-sm font-medium max-w-[250px]">
                    <span className="line-clamp-2">{row.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-right">{row.count}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{row.pph}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
