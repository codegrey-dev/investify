import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  SlidersHorizontal,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  MoreHorizontal,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";
import growthAsset from "@/assets/growth.png";
import rewardsAsset from "@/assets/rewards.png";
import { useState, useEffect } from "react";
import { getTickets, getWithdrawals, getInvestments, getBalance, getEarnings, getReferralEarnings } from "@/lib/store";
import { useUser } from "@/lib/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { networkLogo, tickerLogo } from "@/lib/logos";
import { packages } from "./invest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Portfolio — Lumen" },
      { name: "description", content: "Track your investment portfolio, opportunities, and recent activity." },
    ],
  }),
});

function HomePage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [referralEarnings, setReferralEarnings] = useState<any[]>([]);
  const { user: contextUser } = useUser();

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
    
    setMounted(true);
    
    async function loadData() {
      try {
        const [ticketsData, withdrawalsData, investmentsData, balanceData, earningsData, referralEarningsData] = await Promise.all([
          getTickets(),
          getWithdrawals(),
          getInvestments(),
          getBalance(),
          getEarnings(),
          getReferralEarnings(),
        ]);
        setUser(contextUser);
        setTickets(ticketsData);
        setWithdrawals(withdrawalsData);
        setInvestments(investmentsData);
        setBalance(balanceData);
        setEarnings(earningsData);
        setReferralEarnings(referralEarningsData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    loadData();
  }, [contextUser]);

  // Generate unique account number based on email / id
  const accountNumber = user?.email
    ? `LMN-${user.email.split("@")[0].slice(0, 4).toUpperCase()}-${(user.id || "3425").slice(0, 4).toUpperCase()}`
    : "LMN-GUEST-3425";

  // Compute actual balance based on confirmed deposits, withdrawals, investments, and accrued interest
  const depositSum = tickets
    .filter((t) => t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0);

  const withdrawSum = withdrawals
    .filter((w) => w.status === "confirmed")
    .reduce((sum, w) => sum + w.amount, 0);

  const investSum = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalReferralEarnings = referralEarnings.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate balance breakdown
  const actualBalance = depositSum - withdrawSum - investSum + totalEarnings;
  const profitFromInvestment = totalEarnings;
  const referralEarningsTotal = totalReferralEarnings;

  // Combine and sort activities by date descending
  const activities = [
    ...tickets.map((t) => ({ ...t, activityType: "deposit" as const })),
    ...withdrawals.map((w) => ({ ...w, activityType: "withdrawal" as const })),
    ...investments.map((inv) => ({ ...inv, activityType: "investment" as const, network: "LMN" })),
    ...earnings.map((e) => ({ ...e, activityType: "earning" as const })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const monthlyGain = totalEarnings;

  function copyAccount() {
    navigator.clipboard?.writeText(accountNumber);
    setAccountCopied(true);
    setTimeout(() => setAccountCopied(false), 1200);
  }

  return (
    <div className="phone-frame flex flex-col bg-background">
      {/* Top ash section - rounded top and bottom */}
      <section className="bg-surface rounded-[48px] pb-6">
        <header className="flex items-center justify-between px-5 pt-6">
          <Link
            to="/settings"
            className="grid h-11 w-11 place-items-center rounded-full bg-background border border-border"
            aria-label="Settings"
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <h1 className="text-[17px] font-semibold tracking-tight">Portfolio</h1>
          <Link
            to="/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-background border border-border"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            {tickets.some((t) => t.status === "processing") && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                !
              </span>
            )}
          </Link>
        </header>

        <div className="mt-5 flex flex-col items-center gap-2">
          {/* Dynamic Underlined Account ID & Copy */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="font-mono border-b border-dashed border-foreground/50 pb-0.5 leading-none">
              {accountNumber}
            </span>
            <button
              onClick={copyAccount}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Copy Account Number"
            >
              {accountCopied ? <Check className="h-3.5 w-3.5 text-positive" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-1">Your Balance</p>
          <div className="flex items-center gap-1">
            {user ? (
              <p className="text-[38px] font-extrabold tracking-tight tabular-nums leading-none">
                GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            ) : (
              <Skeleton className="h-10 w-32" />
            )}
            <Select>
              <SelectTrigger className="w-6 h-6 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 outline-none focus-visible:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-none focus:ring-0 focus:ring-offset-0 outline-none focus-visible:ring-0">
                <div className="p-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Actual Balance</span>
                    <span className="font-semibold">GH₵{actualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Investment Profit</span>
                    <span className="font-semibold text-green-600">GH₵{profitFromInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Referral Earnings</span>
                    <span className="font-semibold text-green-600">GH₵{referralEarningsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </SelectContent>
            </Select>
          </div>

          {monthlyGain > 0 && (
            <div className="mt-1 flex items-center rounded-full bg-[oklch(0.95_0.03_280)] px-3 py-1 text-xs font-semibold text-[oklch(0.4_0.12_280)]">
              Gained GH₵{monthlyGain.toFixed(2)} this month
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 grid w-full grid-cols-4 gap-2 px-5">
            <ActionButton to="/invest" icon={<ArrowUpRight className="h-5 w-5" />} label="Invest" active />
            <ActionButton to="/withdraw" icon={<ArrowDownLeft className="h-5 w-5" />} label="Withdraw" />
            <ActionButton to="/deposit" icon={<Plus className="h-5 w-5" />} label="Deposit" />
            <ActionButton to="/more" icon={<MoreHorizontal className="h-5 w-5" />} label="More" />
          </div>
        </div>
      </section>

      {/* White remaining area */}
      <div className="flex-1 bg-background pt-5">
        {/* Opportunities */}
        <section className="">
          <div className="flex items-end justify-between px-5">
            <h2 className="text-[15px] font-semibold">Top opportunities</h2>
            <Link to="/invest" className="text-xs font-medium text-muted-foreground">View all ›</Link>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <OpportunityCard
              eyebrow="Featured Package"
              title="Steady Shield"
              subtitle="GH₵50 entry · 2% daily return"
              img={growthAsset}
              to="/invest"
            />
            <OpportunityCard
              eyebrow="High Return"
              title="Growth Index"
              subtitle="GH₵500 entry · 2% daily return"
              img={rewardsAsset}
              to="/invest"
            />
          </div>
        </section>

        {/* Activity */}
        <section className="mt-6 px-5 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-[15px] font-semibold">Recent activity</h2>
            <Link to="/transactions" className="text-xs font-medium text-muted-foreground">
              View all ›
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-2xl mt-3 space-y-1">
              <p className="text-xs font-bold text-foreground">No recent activity</p>
              <p className="text-[11px] text-muted-foreground">Fund your wallet to get started.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {activities.slice(0, 6).map((item) => {
                const formattedTime = new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                const isDeposit = item.activityType === "deposit";
                const isInvestment = item.activityType === "investment";
                const isEarning = item.activityType === "earning";
                const isAdd = isDeposit || isEarning;
                const isInvOrEarn = isInvestment || isEarning;
                
                // Find stocks involved for the investment
                const packageInfo = isInvOrEarn 
                  ? packages.find((p) => p.id === item.packageId)
                  : null;
                const holdings = packageInfo?.holdings || [];
                
                return (
                  <li key={item.id} className="flex items-center gap-3">
                    {isInvOrEarn ? (
                      <div className="flex -space-x-2.5 items-center justify-start h-11 w-16 shrink-0 pl-1">
                        {holdings.slice(0, 3).map((h: any, idx: number) => {
                          const logo = tickerLogo(h.ticker);
                          return (
                            <div
                              key={h.ticker}
                              className="h-7 w-7 rounded-full overflow-hidden border-2 border-background bg-surface shadow-sm shrink-0 relative"
                              style={{ zIndex: 5 - idx }}
                            >
                              {logo ? (
                                <img src={logo} alt={h.ticker} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-[7px] font-bold bg-muted text-muted-foreground">
                                  {h.ticker.slice(0, 2)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                        {networkLogo(item.network) ? (
                          <img
                            src={networkLogo(item.network)}
                            alt={item.network}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {item.network.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {isDeposit 
                          ? `Deposit via ${item.network}` 
                          : isInvestment 
                          ? `Invested in ${item.packageName || "Package"}` 
                          : isEarning
                          ? `Earnings from ${item.packageName || "Package"}`
                          : `Withdrawal to ${item.network}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formattedTime}</p>
                    </div>
                    <div className="text-right">
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
        </section>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  to?: string;
}) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`grid h-12 w-full place-items-center rounded-2xl ${
          active ? "bg-accent text-accent-foreground" : "bg-background text-foreground"
        }`}
      >
        {icon}
      </div>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="w-full">
        {inner}
      </Link>
    );
  }
  return <button className="w-full">{inner}</button>;
}

function OpportunityCard({
  eyebrow,
  title,
  subtitle,
  img,
  to,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  img: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="relative flex min-w-[85%] shrink-0 flex-col justify-center overflow-hidden rounded-2xl bg-surface p-4 pr-32 h-[112px] border border-transparent hover:border-border transition-colors text-left"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-[15px] font-bold leading-tight">{title}</h3>
      <p className="mt-0.5 text-xs text-foreground/70">{subtitle}</p>
      <img
        src={img}
        alt=""
        className="pointer-events-none absolute -right-2 top-1/2 h-24 w-28 -translate-y-1/2 object-contain"
      />
    </Link>
  );
}
