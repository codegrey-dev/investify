import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { getTickets, getWithdrawals, getInvestments, getEarnings } from "@/lib/store";
import { networkLogo, tickerLogo } from "@/lib/logos";
import { packages } from "./invest";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
  head: () => ({
    meta: [
      { title: "Transactions — Lumen" },
      { name: "description", content: "View all your account deposit, withdrawal, and earnings history." },
    ],
  }),
});

type FilterType = "all" | "deposits" | "withdrawals" | "earnings";

function TransactionsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [activities, setActivities] = useState<any[]>([]);

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
    
    async function loadData() {
      const [tickets, withdrawals, investments, earnings] = await Promise.all([
        getTickets(),
        getWithdrawals(),
        getInvestments(),
        getEarnings(),
      ]);

      // 1. Deposits
      const mappedDeposits = tickets.map((t) => ({
        id: `dep-${t.id}`,
        name: `Deposit via ${t.network}`,
        amount: t.amount,
        network: t.network,
        status: t.status,
        type: "deposit" as const,
        createdAt: t.createdAt,
      }));

      // 2. Withdrawals
      const mappedWithdrawals = withdrawals.map((w) => ({
        id: `wdr-${w.id}`,
        name: `Withdrawal to ${w.network}`,
        amount: w.amount,
        network: w.network,
        status: w.status,
        type: "withdrawal" as const,
        createdAt: w.createdAt,
      }));

    // 3. Investments (Deduction transaction)
    const mappedInvestments = investments.map((inv) => ({
      id: `inv-${inv.id}`,
      name: `Invested in ${inv.packageName}`,
      amount: inv.amount,
      packageId: inv.packageId,
      status: inv.status,
      type: "investment" as const,
      createdAt: inv.createdAt,
    }));

    // 4. Earnings from database
    const mappedEarnings = earnings.map((e) => ({
      id: e.id,
      name: `Earnings from ${e.packageName}`,
      amount: e.amount,
      packageId: e.packageId,
      status: "confirmed",
      type: "earning" as const,
      createdAt: e.createdAt,
    }));

    // Combine all activities
    const combined = [
      ...mappedDeposits,
      ...mappedWithdrawals,
      ...mappedInvestments,
      ...mappedEarnings,
    ].sort((a, b) => b.createdAt - a.createdAt);

    setActivities(combined);
    }
    loadData();
  }, [navigate]);

  const filtered = activities.filter((act) => {
    if (filter === "all") return true;
    if (filter === "deposits") return act.type === "deposit";
    if (filter === "withdrawals") return act.type === "withdrawal";
    if (filter === "earnings") return act.type === "earning";
    return true;
  });

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Transactions" subtitle="History" backTo="/" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
        {/* Navigation/Filter Tabs */}
        <div className="flex bg-surface p-1 rounded-full border border-border">
          {["all", "deposits", "withdrawals", "earnings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as FilterType)}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors ${
                filter === tab 
                  ? "bg-background text-foreground shadow-none" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List of Filtered Transactions */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-2xl mt-4">
            <p className="text-sm font-semibold text-foreground">No records found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your history will update as transactions occur.
            </p>
          </div>
        ) : (
          <ul className="space-y-4 mt-2">
            {filtered.map((item) => {
              const formattedTime = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              
              const isAdd = item.type === "deposit" || item.type === "earning";
              const isInvestment = item.type === "investment" || item.type === "earning";
              
              // Get stocks involved for investment
              const packageInfo = isInvestment 
                ? packages.find((p) => p.id === item.packageId)
                : null;
              const holdings = packageInfo?.holdings || [];

              return (
                <li key={item.id} className="flex items-center gap-3">
                  {/* Icon Block */}
                  <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0 relative">
                    {isInvestment ? (
                      holdings.length > 0 ? (
                        <div className="relative w-full h-full">
                          {holdings.slice(0, 3).map((h: any, idx: number) => {
                            const logo = tickerLogo(h.ticker);
                            return (
                              <div
                                key={h.ticker}
                                className="absolute h-5 w-5 rounded-full overflow-hidden border border-background bg-surface shadow-sm"
                                style={{
                                  left: idx === 0 ? "2px" : idx === 1 ? "10px" : "18px",
                                  top: idx === 2 ? "14px" : "6px",
                                  zIndex: 3 - idx,
                                }}
                              >
                                {logo ? (
                                  <img src={logo} alt={h.ticker} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[6px] font-bold bg-muted text-muted-foreground">
                                    {h.ticker.slice(0, 2)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-primary/10 text-primary text-xs font-extrabold">
                          IN
                        </div>
                      )
                    ) : item.network && networkLogo(item.network) ? (
                      <img
                        src={networkLogo(item.network)}
                        alt={item.network}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(item.network || "LMN").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formattedTime}</p>
                  </div>

                  {/* Amount / Status */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${isAdd ? "text-[oklch(0.55_0.15_150)]" : "text-red-600"}`}>
                      {isAdd ? "+" : "-"}GH₵{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "confirmed" || item.status === "active"
                        ? "text-[oklch(0.55_0.15_150)]" 
                        : item.status === "rejected" 
                        ? "text-red-600" 
                        : "text-amber-600"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
export default TransactionsPage;
