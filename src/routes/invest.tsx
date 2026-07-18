import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Check, ArrowUpRight } from "lucide-react";
import { tickerLogo } from "@/lib/logos";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTickets,
  getWithdrawals,
  getInvestments,
  addInvestment,
  makeRef,
  getBalance,
  grantReferralInitialBonus,
} from "@/lib/store";
import { useUser } from "@/lib/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/invest")({
  component: InvestPage,
  head: () => ({
    meta: [
      { title: "Invest — Lumen" },
      { name: "description", content: "Choose a curated investment package that matches your goals." },
    ],
  }),
});

type Pkg = {
  id: string;
  name: string;
  tagline: string;
  risk: "Low" | "Medium" | "High";
  dailyProfit: string;
  duration: string;
  price: number;
  returns: number;
  description: string;
  holdings: { ticker: string; weight: number }[];
};

export const packages: Pkg[] = [
  {
    id: "steady",
    name: "Steady Shield",
    tagline: "Blue-chip stability & dividends",
    risk: "Low",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 50,
    returns: 80,
    description: "Designed for steady growth with low volatility. Holds top-tier blue-chip companies with strong balance sheets and consistent dividend payouts.",
    holdings: [
      { ticker: "AAPL", weight: 35 },
      { ticker: "MSFT", weight: 35 },
      { ticker: "NIKE", weight: 30 },
    ],
  },
  {
    id: "core",
    name: "Core Balance",
    tagline: "Reliable consumer & technology giants",
    risk: "Low",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 150,
    returns: 240,
    description: "A defensive yet productive blend of global consumer leaders and software giants, structured to weather market corrections while yielding stable returns.",
    holdings: [
      { ticker: "MSFT", weight: 40 },
      { ticker: "AAPL", weight: 30 },
      { ticker: "ABNB", weight: 30 },
    ],
  },
  {
    id: "growth",
    name: "Growth Index",
    tagline: "Balanced tech & consumer growth",
    risk: "Medium",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 500,
    returns: 800,
    description: "A high-performing collection of market-leading technology and consumer tech brands. Aims to capture mid-term sector momentum.",
    holdings: [
      { ticker: "NVDA", weight: 30 },
      { ticker: "TSLA", weight: 25 },
      { ticker: "SHOP", weight: 25 },
      { ticker: "ABNB", weight: 20 },
    ],
  },
  {
    id: "advisors",
    name: "Advisors Select",
    tagline: "Top picks from Lumen strategists",
    risk: "Medium",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 1000,
    returns: 1600,
    description: "Curated directly by our investment committee, this selection targets companies with strong quarterly reports and expanding market shares.",
    holdings: [
      { ticker: "AAPL", weight: 30 },
      { ticker: "TSLA", weight: 30 },
      { ticker: "MSFT", weight: 20 },
      { ticker: "SHOP", weight: 20 },
    ],
  },
  {
    id: "premium",
    name: "Premium Blend",
    tagline: "Curated tech & high growth assets",
    risk: "Medium",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 2000,
    returns: 3200,
    description: "A premium assortment of highly liquid tech leaders and enterprise platforms, optimized for balanced appreciation and robust risk-adjusted returns.",
    holdings: [
      { ticker: "AAPL", weight: 25 },
      { ticker: "MSFT", weight: 25 },
      { ticker: "STRP", weight: 25 },
      { ticker: "SHOP", weight: 25 },
    ],
  },
  {
    id: "apex",
    name: "Apex Alpha",
    tagline: "Aggressive tech & chip leaders",
    risk: "High",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 3500,
    returns: 5600,
    description: "Focused exclusively on top chipmakers and artificial intelligence infrastructure. Expect higher volatility but substantial growth momentum.",
    holdings: [
      { ticker: "NVDA", weight: 40 },
      { ticker: "TSLA", weight: 30 },
      { ticker: "ABNB", weight: 30 },
    ],
  },
  {
    id: "moon",
    name: "Moonshot",
    tagline: "High-conviction bets & crypto",
    risk: "High",
    dailyProfit: "2% daily",
    duration: "30 days",
    price: 5000,
    returns: 8000,
    description: "For investors seeking aggressive growth. Comprises digital assets and high-beta automotive/chip holdings positioned for major sector runs.",
    holdings: [
      { ticker: "BTC", weight: 40 },
      { ticker: "TSLA", weight: 30 },
      { ticker: "NVDA", weight: 30 },
    ],
  },
];

type Step = "list" | "done";

function InvestPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("list");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const { user: contextUser } = useUser();

  // Compute live balance
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
      const [balanceData, investmentsData] = await Promise.all([
        getBalance(),
        getInvestments(),
      ]);
      setUser(contextUser);
      setBalance(balanceData);
      setInvestments(investmentsData);
    }
    loadData();
  }, [contextUser]);

  async function purchasePackage(pkg: Pkg) {
    if (balance < pkg.price) return;
    
    setSubmitting(true);
    try {
      const user = contextUser;
      const reference = makeRef();

      if (isSupabaseConfigured && user?.id) {
        // Proactively upsert profiles to satisfy foreign keys
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: user.fullName,
          email: user.email,
          phone: user.phone || null,
          updated_at: new Date().toISOString(),
        });

        // Insert directly into investments
        const { data: investmentData, error } = await supabase.from("investments").insert({
          user_id: user.id,
          package_id: pkg.id,
          amount: pkg.price,
          daily_profit: pkg.dailyProfit,
          duration: pkg.duration,
          returns: pkg.returns,
          status: "active",
          created_at: new Date().toISOString(),
        }).select().single();

        if (error) {
          console.error("Supabase investment error:", error);
          alert("Investment failed: " + error.message);
          setSubmitting(false);
          return;
        }

        // Check if user was referred and grant initial bonus
        const { data: referral } = await supabase
          .from("referrals")
          .select("*")
          .eq("referred_id", user.id)
          .single();

        if (referral) {
          await grantReferralInitialBonus(referral.id, investmentData.id, pkg.price);
        }
      }

      // Sync locally
      addInvestment({
        id: reference,
        packageId: pkg.id,
        packageName: pkg.name,
        amount: pkg.price,
        dailyProfit: pkg.dailyProfit,
        duration: pkg.duration,
        returns: pkg.returns,
        status: "active",
        createdAt: Date.now(),
      });

      setStep("done");
    } catch (err) {
      console.error("Failed to submit investment:", err);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    const chosen = packages.find((p) => p.id === selectedId)!;
    return (
      <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
        <PageHeader title="Invest" subtitle="Active" />
        <div className="flex-1 px-5 pt-8 pb-8 flex flex-col justify-between">
          <div className="space-y-8 text-center mt-4">
            {/* Success Hero */}
            <div className="space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-extrabold tracking-tight text-foreground">
                  GH₵{chosen.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Investment Active
                </p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="space-y-3 pt-4 border-t border-border text-left">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Package Name</span>
                <span className="text-xs font-bold text-foreground">{chosen.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Daily Return</span>
                <span className="text-xs font-bold text-[oklch(0.55_0.15_150)]">{chosen.dailyProfit}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Lockup Duration</span>
                <span className="text-xs font-bold text-foreground">{chosen.duration}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Est. Payout (30d)</span>
                <span className="text-xs font-bold text-[oklch(0.55_0.15_150)]">GH₵{chosen.returns.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              onClick={() => navigate({ to: "/" })}
              className="w-full rounded-full h-11 bg-black text-white hover:bg-gray-900 shadow-none transition-colors"
            >
              Back to portfolio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedId) {
    const chosen = packages.find((p) => p.id === selectedId)!;
    const hasEnough = balance >= chosen.price;
    const activeInvestment = investments.find(inv => inv.packageId === chosen.id && inv.status === 'active');

    return (
      <div className="phone-frame flex flex-col bg-background">
        <div className="px-6 pt-3">
          {/* Details Page Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border hover:bg-muted/10 transition-colors"
              aria-label="Back to packages"
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <div>
              <p className="text-lg font-bold tracking-tight text-foreground leading-none">{chosen.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{chosen.tagline}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
          {/* Large Cost Display */}
          <div className="text-center py-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Cost to invest</p>
            <p className="text-4xl font-extrabold tracking-tight text-foreground">GH₵{chosen.price.toLocaleString()}</p>
          </div>

          {/* Active Investment Progress */}
          {activeInvestment && (
            <div className="border border-indigo-500 bg-indigo-50/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Active Investment</span>
                <span className="text-xs font-semibold text-indigo-600">
                  {Math.floor((Date.now() - activeInvestment.createdAt) / (1000 * 60 * 60 * 24))} / {parseInt(chosen.duration)} days
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Invested</span>
                <span className="font-semibold">GH₵{activeInvestment.amount.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.floor((Date.now() - activeInvestment.createdAt) / (1000 * 60 * 60 * 24)) / parseInt(chosen.duration) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Three-Card Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-border p-3 text-center">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-semibold">Daily rate</span>
              <span className="text-sm font-bold text-foreground mt-1 block">{chosen.dailyProfit}</span>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-semibold">Lockup</span>
              <span className="text-sm font-bold text-foreground mt-1 block">{chosen.duration}</span>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-semibold">Total Gain</span>
              <span className="text-sm font-bold text-[oklch(0.55_0.15_150)] mt-1 block">+60%</span>
            </div>
          </div>

          {/* Return summary */}
          <div className="flex justify-between items-center py-3.5 px-4 rounded-xl border border-border bg-transparent text-xs">
            <span className="text-muted-foreground font-semibold">Estimated Payout (30d)</span>
            <span className="font-bold text-foreground text-sm">GH₵{chosen.returns.toLocaleString()}</span>
          </div>

          {/* Allocation Section */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
                Asset Allocation
              </p>
              <span className="text-[10px] text-muted-foreground font-bold">{chosen.holdings.length} holdings</span>
            </div>

            {/* Thick Blue Allocation Bar */}
            <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
              {chosen.holdings.map((h, i) => (
                <div
                  key={h.ticker}
                  className="h-full bg-blue-600"
                  style={{
                    width: `${h.weight}%`,
                    opacity: 1 - i * 0.15,
                  }}
                />
              ))}
            </div>

            {/* Assets Table - Divider-Free and Flat */}
            <ul className="space-y-1">
              {chosen.holdings.map((h) => {
                const logo = tickerLogo(h.ticker);
                const dollars = Math.round((chosen.price * h.weight) / 100);
                return (
                  <li key={h.ticker} className="flex items-center gap-3 py-3 px-2 rounded-sm hover:bg-muted/30 transition-colors">
                    {logo ? (
                      <img src={logo} alt={h.ticker} className="h-9 w-9 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-border text-[9px] font-medium">
                        {h.ticker.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold tracking-tight">{h.ticker}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">{h.weight}% allocation</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">GH₵{dollars.toLocaleString()}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              onClick={() => purchasePackage(chosen)}
              disabled={!hasEnough || submitting}
              className={`w-full rounded-full h-11 text-white hover:bg-gray-900 shadow-none transition-colors ${
                hasEnough ? "bg-black" : "bg-red-100 border border-red-200 text-red-600 hover:bg-red-100 cursor-not-allowed"
              }`}
            >
              {submitting
                ? "Purchasing..."
                : hasEnough
                ? `Invest GH₵${chosen.price.toLocaleString()}`
                : "Insufficient Balance"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-frame flex flex-col bg-background">
      <div className="px-6 pt-3">
        {/* Header row: back button + title */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
          </Link>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground leading-none">Invest</p>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a package</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1 px-5 pt-4 pb-8 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Packages</h2>
          <span className="text-[11px] text-muted-foreground font-semibold">{packages.length}</span>
        </div>

        <ul className="space-y-2.5">
          {packages.map((p) => {
            const activeInvestment = investments.find(inv => inv.packageId === p.id && inv.status === 'active');
            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full rounded-2xl border p-4 text-left hover:border-foreground transition flex items-center justify-between group ${
                    activeInvestment ? 'border-indigo-500 bg-indigo-50/50' : 'border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-full">
                        GH₵{p.price}
                      </span>
                      {activeInvestment && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500 text-white rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{p.tagline}</p>
                    
                    <div className="mt-3 flex items-center gap-2 text-[10px]">
                      <span className="rounded-full border border-border px-2 py-0.5 font-semibold text-muted-foreground">
                        {p.risk} Risk
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 font-semibold text-[oklch(0.55_0.15_150)]">
                        {p.dailyProfit}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex -space-x-1.5 mb-2">
                      {p.holdings.slice(0, 3).map((h) => {
                        const logo = tickerLogo(h.ticker);
                        return logo ? (
                          <img
                            key={h.ticker}
                            src={logo}
                            alt={h.ticker}
                            className="h-6 w-6 rounded-full border border-background object-cover"
                          />
                        ) : (
                          <div
                            key={h.ticker}
                            className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-[8px] font-medium"
                          >
                            {h.ticker.slice(0, 2)}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      Details <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
