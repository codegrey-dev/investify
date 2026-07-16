import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, Plus, Minus, Info, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NETWORKS, addWithdrawal, makeRef, getUser, getBalance, type Network } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/withdraw")({
  component: WithdrawPage,
  head: () => ({
    meta: [
      { title: "Withdraw — Lumen" },
      { name: "description", content: "Withdraw to MTN, Telecel, or AirtelTigo mobile money." },
    ],
  }),
});

type Step = "amount" | "done";

function WithdrawPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("amount");

  const [network, setNetwork] = useState<Network>("MTN");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [amountStr, setAmountStr] = useState("0");
  const [reference] = useState(makeRef());
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);

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
      const [userData, balanceData] = await Promise.all([
        getUser(),
        getBalance(),
      ]);
      setUser(userData);
      setBalance(balanceData);
    }
    loadData();
  }, [navigate]);

  const amount = parseFloat(amountStr) || 0;

  // Calculate dynamic fee and limits from environment settings
  const feePercent = parseFloat(import.meta.env.VITE_WITHDRAW_FEE_PERCENT || "1");
  const minWithdrawal = parseFloat(import.meta.env.VITE_MIN_WITHDRAWAL || "20");
  
  const fee = amount * (feePercent / 100);
  const total = amount + fee;

  const hasEnough = balance >= amount;
  const validForm = fullName.trim() && phone.replace(/\s/g, "").length >= 9 && amount >= minWithdrawal && hasEnough;

  function adjustAmount(delta: number) {
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, current + delta);
      return next.toString();
    });
  }

  async function confirmWithdrawal() {
    setSubmitting(true);
    try {
      // Sync locally - addWithdrawal handles Supabase syncing
      addWithdrawal({
        id: reference,
        amount,
        network,
        phone,
        fullName,
        status: "processing",
        createdAt: Date.now(),
      });

      setStep("done");
    } catch (err) {
      console.error("Failed to submit withdrawal:", err);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
        <PageHeader title="Withdraw" subtitle="Processing" />
        <div className="flex-1 px-5 pt-8 pb-8 flex flex-col justify-between">
          <div className="space-y-8 text-center mt-4">
            {/* Success Hero */}
            <div className="space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-extrabold tracking-tight text-foreground">
                  GH₵{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Withdrawal Processing
                </p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="space-y-3 pt-4 border-t border-border text-left">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Provider</span>
                <span className="text-xs font-bold text-foreground">{network} Mobile Money</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Account Name</span>
                <span className="text-xs font-bold text-foreground">{fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Recipient Phone</span>
                <span className="text-xs font-bold text-foreground">{phone}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Timeline</span>
                <span className="text-xs font-bold text-foreground">Within 24 hours</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              onClick={() => navigate({ to: "/" })}
              className="w-full rounded-full h-11 bg-accent text-accent-foreground hover:brightness-105 shadow-none transition-colors"
            >
              Back to portfolio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <div className="px-5 py-4 space-y-6">
        {/* Slider Mockup Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-[17px] font-bold text-foreground">Withdraw</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sized-up Centered Amount Input */}
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-6 w-full max-w-[300px]">
            <button
              onClick={() => adjustAmount(-10)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
              disabled={submitting}
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex items-baseline justify-center border-b-2 border-foreground pb-1 px-2 w-48">
              <span className="text-4xl font-semibold text-muted-foreground">GH₵</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setAmountStr(val || "0");
                }}
                placeholder="0"
                className="w-36 bg-transparent text-6xl font-extrabold leading-none tracking-tight text-center tabular-nums outline-none placeholder:text-muted-foreground"
                disabled={submitting}
              />
            </div>
            <button
              onClick={() => adjustAmount(10)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
              disabled={submitting}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>GH₵{total.toFixed(2)} total</span>
            <span>•</span>
            <span>GH₵{fee.toFixed(2)} fee ({feePercent}%)</span>
            <span>•</span>
            <span>Min: GH₵{minWithdrawal}</span>
            <Info className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
          </div>
        </div>

        {/* Mobile Money Details Inputs (No divider line) */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3 pl-1">
            <div className="space-y-1">
              <Label htmlFor="network" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Network</Label>
              <Select value={network} onValueChange={(val) => setNetwork(val as Network)} disabled={submitting}>
                <SelectTrigger id="network" className="h-11 rounded-sm bg-background border border-input shadow-none text-xs">
                  <SelectValue placeholder="Network" />
                </SelectTrigger>
                <SelectContent className="rounded-sm bg-background border border-border shadow-none">
                  {NETWORKS.map((n) => (
                    <SelectItem key={n.id} value={n.id} className="rounded-sm text-xs focus:bg-muted focus:text-foreground">
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567"
                className="h-11 rounded-sm bg-background border border-input shadow-none text-xs"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1 pl-1">
            <Label htmlFor="fullName" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Name on Account</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kwame Mensah"
              className="h-11 rounded-sm bg-background border border-input shadow-none text-xs"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Sized-up Action Button directly under the form */}
        <div className="pt-2">
          <Button
            disabled={!validForm || submitting}
            className={`w-full rounded-sm h-11 font-bold shadow-none transition-colors ${
              amount > 0 && !hasEnough
                ? "bg-red-100 border border-red-200 text-red-600 hover:bg-red-100 cursor-not-allowed"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
            onClick={confirmWithdrawal}
          >
            {submitting
              ? "Confirming withdrawal..."
              : amount > 0 && !hasEnough
              ? "Insufficient Balance"
              : amount > 0 && amount < minWithdrawal
              ? `Min Withdrawal: GH₵${minWithdrawal}`
              : "Review & Confirm"}
          </Button>
          <p className="text-center text-[11px] font-semibold text-muted-foreground mt-3">
            Processed within 24 hours · Wallet balance: GH₵{balance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
