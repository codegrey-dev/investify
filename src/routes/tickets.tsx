import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { getTickets, type DepositTicket } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { networkLogo } from "@/lib/logos";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/tickets")({
  component: TicketsPage,
  head: () => ({ meta: [{ title: "Deposit tickets — Lumen" }] }),
});

function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<DepositTicket[]>([]);

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: '/sign-in' });
        return;
      }
    }
    
    checkAuth();
    
    async function loadTickets() {
      const ticketsData = await getTickets();
      setTickets(ticketsData);
    }
    loadTickets();
  }, []);

  return (
    <div className="phone-frame flex flex-col bg-background">
      <PageHeader title="Tickets" subtitle="Deposit history" backTo="/more" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6">
        {/* Total Summary (Flat, no card background) */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Deposit History</h2>
          <p className="text-xs text-muted-foreground mt-1">
            You have created <span className="font-semibold text-foreground">{tickets.length}</span> deposit tickets.
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-sm font-semibold text-foreground">No deposit tickets yet.</p>
            <p className="text-xs text-muted-foreground">Fund your portfolio to get started.</p>
            <div className="pt-2">
              <Button asChild className="rounded-sm h-11 bg-black text-white hover:bg-gray-900 shadow-none transition-colors">
                <Link to="/deposit">Create a deposit</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Recent tickets
            </p>
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 py-3 px-2 rounded-sm hover:bg-muted/30 transition-colors"
                >
                  {/* Operator logo image block */}
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm overflow-hidden border border-border bg-background">
                    {networkLogo(t.network) ? (
                      <img
                        src={networkLogo(t.network)}
                        alt={t.network}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {t.network.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums truncate">
                      {t.reference}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString()} · {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      GH₵{t.amount.toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                        t.status === "confirmed"
                          ? "text-[oklch(0.55_0.15_150)]"
                          : t.status === "rejected"
                          ? "text-[oklch(0.55_0.2_25)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
