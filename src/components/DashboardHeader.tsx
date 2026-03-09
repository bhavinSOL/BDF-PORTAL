import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

export function DashboardHeader() {
  return (
    <header className="relative overflow-hidden rounded-xl mb-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBanner})` }}
      />
      <div className="absolute inset-0 bg-secondary/80 backdrop-blur-sm" />
      <div className="relative px-6 py-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-secondary-foreground tracking-tight">
                TATA Motors
              </h1>
              <p className="text-xs text-secondary-foreground/70">
                BDF Issue Dashboard
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/inspector">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs bg-background/20 border-border/40 text-secondary-foreground hover:bg-background/30">
              <ClipboardList className="h-3.5 w-3.5" /> Inspector Entry
            </Button>
          </Link>
          <div className="text-right">
            <p className="text-xs text-secondary-foreground/70">Manufacturing Quality Portal</p>
            <p className="text-sm font-mono text-secondary-foreground">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
