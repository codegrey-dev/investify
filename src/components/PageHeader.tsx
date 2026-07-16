import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backTo = "/",
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
}) {
  return (
    <header className="flex items-center justify-between px-5 pt-6">
      <Link
        to={backTo}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="text-[17px] font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] font-medium text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <span className="h-11 w-11 shrink-0" aria-hidden />
    </header>
  );
}
