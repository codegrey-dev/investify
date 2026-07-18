import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Check, Upload, X, Plus, Minus, Info } from "lucide-react";
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
import { NETWORKS,
  DEPOSIT_NUMBERS,
  addTicket,
  makeRef,
  getAppSettings,
  type Network,
} from "@/lib/store";
import { useUser } from "@/lib/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/deposit")({
  component: DepositPage,
  head: () => ({
    meta: [
      { title: "Deposit — Lumen" },
      { name: "description", content: "Create a deposit ticket via mobile money." },
    ],
  }),
});

type Step = "amount" | "instructions" | "done";

function DepositPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("amount");

  const [network, setNetwork] = useState<Network>("MTN");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [amountStr, setAmountStr] = useState("0");
  const [reference] = useState(makeRef());
  
  // File and preview states
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const { user: contextUser } = useUser();
  
  const [copied, setCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const amount = parseFloat(amountStr) || 0;
  const dest = DEPOSIT_NUMBERS[network];
  
  // Calculate dynamic fee and limits from database settings
  const feePercent = parseFloat(settings.deposit_fee_percent || "1");
  const minDeposit = parseFloat(settings.min_deposit || "10");
  
  const fee = amount * (feePercent / 100);
  const total = amount + fee;

  const validForm = fullName.trim() && phone.replace(/\s/g, "").length >= 9 && amount >= minDeposit;

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
    
    async function loadSettings() {
      const appSettings = await getAppSettings();
      setSettings(appSettings);
      setSettingsLoading(false);
    }
    
    loadSettings();
  }, [navigate]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileObj(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function copyPhone() {
    navigator.clipboard?.writeText(dest.phone.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function adjustAmount(delta: number) {
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, current + delta);
      return next.toString();
    });
  }

  function copyReference() {
    navigator.clipboard?.writeText(reference);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 1200);
  }

  async function confirmDeposit() {
    setSubmitting(true);
    let finalScreenshotUrl = "";

    try {
      const user = contextUser;
      
      if (fileObj) {
        if (isSupabaseConfigured && user?.id) {
          // 1. Upload to Supabase Storage screenshots bucket
          const fileExt = fileObj.name.split(".").pop();
          const filePath = `${user.id}/${reference}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("screenshots")
            .upload(filePath, fileObj);

          if (uploadError) {
            console.error("Error uploading to Supabase Storage:", uploadError);
            alert("Upload failed: " + uploadError.message);
            setSubmitting(false);
            return;
          }

          // 2. Get Public URL
          const { data: { publicUrl } } = supabase.storage
            .from("screenshots")
            .getPublicUrl(filePath);

          finalScreenshotUrl = publicUrl;
        } else {
          // Offline fallback: Convert to base64 Data URL
          finalScreenshotUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(fileObj);
          });
        }
      }

      // 3. Save ticket
      addTicket({
        id: reference,
        amount,
        network,
        phone,
        fullName,
        reference,
        screenshot: finalScreenshotUrl || undefined,
        status: "processing",
        createdAt: Date.now(),
      });

      setStep("done");
    } catch (err) {
      console.error("Failed to submit deposit ticket:", err);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
        <PageHeader title="Deposit" subtitle="Processing" />
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
                  Transfer Processing
                </p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="space-y-3 pt-4 border-t border-border text-left">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Reference</span>
                <span className="text-xs font-bold font-mono text-foreground">{reference}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Provider</span>
                <span className="text-xs font-bold text-foreground">{network} Mobile Money</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Sender Name</span>
                <span className="text-xs font-bold text-foreground">{fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Recipient Phone</span>
                <span className="text-xs font-bold text-foreground">{phone}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground font-medium">Timeline</span>
                <span className="text-xs font-bold text-foreground">Pending verification</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-6">
            <Button
              onClick={() => navigate({ to: "/tickets" })}
              className="w-full rounded-full h-11 bg-black text-white hover:bg-gray-900 shadow-none transition-colors"
            >
              View History
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/" })}
              className="w-full rounded-full h-11 shadow-none border-border hover:bg-muted/30"
            >
              Back to portfolio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "instructions") {
    return (
      <div className="phone-frame flex flex-col bg-background">
        <PageHeader title="Send payment" subtitle={`Ticket ${reference}`} />
        <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
          <div className="text-center py-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Transfer Details</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Please transfer exactly <span className="font-bold text-foreground">GH₵{amount.toLocaleString()}</span> via {network}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Recipient Number</span>
                <p className="font-bold text-sm text-foreground mt-0.5 tabular-nums">{dest.phone}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-sm shadow-none shrink-0"
                onClick={copyPhone}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Reference / Narration</span>
                <p className="font-bold text-sm text-foreground mt-0.5 font-mono">{reference}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-sm shadow-none shrink-0"
                onClick={copyReference}
              >
                {refCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="border-t border-border pt-3">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Account Name</span>
              <p className="font-bold text-sm text-foreground mt-0.5">{dest.name}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground list-decimal pl-1">
            <p className="flex gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Send the exact amount to the mobile money recipient above.</span>
            </p>
            <p className="flex gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Make sure to input <span className="font-bold text-foreground font-mono bg-muted px-1.5 py-0.5 rounded-sm">{reference}</span> as the narration.</span>
            </p>
            <p className="flex gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Upload proof screenshot and click Confirm below.</span>
            </p>
          </div>

          {/* Sized-up Proof of Payment Field */}
          <div className="space-y-2">
            <Label htmlFor="screenshot">Proof of Payment</Label>
            <div className="relative">
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
                disabled={submitting}
              />
              <label
                htmlFor="screenshot"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors shadow-none"
              >
                {previewUrl ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-positive" />
                    <span className="text-foreground font-semibold">Screenshot attached</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground font-normal">Choose Image</span>
                  </>
                )}
              </label>
            </div>
            {previewUrl && (
              <div className="mt-2 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Proof Preview"
                  className="h-24 w-24 rounded-xl object-cover border border-border"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              disabled={!previewUrl || submitting}
              onClick={confirmDeposit}
              className="w-full rounded-sm h-11 bg-black text-white hover:bg-gray-900 shadow-none transition-colors"
            >
              {submitting ? "Uploading receipt..." : "Confirm Payment"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("amount")}
              className="w-full rounded-sm h-11 shadow-none"
              disabled={submitting}
            >
              Back to edit
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
          <h1 className="text-[17px] font-bold text-foreground">Deposit</h1>
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
                  setAmountStr(val);
                }}
                placeholder="0"
                className="w-36 bg-transparent text-6xl font-extrabold leading-none tracking-tight text-center tabular-nums outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => adjustAmount(10)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {settingsLoading ? (
              <>
                <Skeleton className="h-3 w-12" />
                <span>•</span>
                <Skeleton className="h-3 w-16" />
                <span>•</span>
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <span>GH₵{total.toFixed(2)} total</span>
                <span>•</span>
                <span>GH₵{fee.toFixed(2)} fee ({feePercent}%)</span>
                <span>•</span>
                <span>Min: GH₵{minDeposit}</span>
              </>
            )}
            <Info className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
          </div>
        </div>

        {/* Mobile Money Details Inputs (No divider line) */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="network" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Network</Label>
            <Select value={network} onValueChange={(val) => setNetwork(val as Network)}>
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
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fullName" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Name on Mobile Money</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kwame Mensah"
              className="h-11 rounded-sm bg-background border border-input shadow-none text-xs"
            />
          </div>
        </div>

        {/* Sized-up Action Button directly under the form */}
        <div className="pt-2">
          <Button
            disabled={!validForm}
            onClick={() => setStep("instructions")}
            className="w-full rounded-sm h-11 bg-foreground text-background hover:bg-foreground/90 font-bold shadow-none transition-colors"
          >
            Review & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
