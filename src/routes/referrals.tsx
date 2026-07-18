import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Users, DollarSign, TrendingUp, Gift, Check } from "lucide-react";
import { getReferralCode, getReferrals, getReferralEarnings, getAppSettings } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
  head: () => ({
    meta: [
      { title: "Referrals — Lumen" },
      { name: "description", content: "Earn rewards by referring friends to Lumen." },
    ],
  }),
});

function ReferralsPage() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured) {
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: '/sign-in' });
        return;
      }
    }
    
    checkAuth();
    
    async function loadData() {
      try {
        const [codeData, referralsData, earningsData, appSettings] = await Promise.all([
          getReferralCode(),
          getReferrals(),
          getReferralEarnings(),
          getAppSettings(),
        ]);
        
        if (codeData) setReferralCode(codeData.code);
        setReferrals(referralsData);
        setEarnings(earningsData);
        setSettings(appSettings);
        setSettingsLoading(false);
      } catch (error) {
        console.error("Error loading referral data:", error);
        setReferralCode("Not available");
      }
    }
    
    loadData();
  }, []);

  function copyReferralCode() {
    console.log('copyReferralCode called', referralCode);
    if (!referralCode) return;
    
    // Fallback method for browsers that don't support clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = referralCode;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('Code copied successfully');
    } catch (err) {
      console.error('Failed to copy code:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function copyReferralLink() {
    console.log('copyReferralLink called', referralCode);
    if (!referralCode) return;
    const link = `${window.location.origin}/sign-up?ref=${referralCode}`;
    
    // Fallback method for browsers that don't support clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      console.log('Link copied successfully');
    } catch (err) {
      console.error('Failed to copy link:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const initialEarnings = earnings.filter(e => e.type === 'initial').reduce((sum, e) => sum + e.amount, 0);
  const dailyEarnings = earnings.filter(e => e.type === 'daily').reduce((sum, e) => sum + e.amount, 0);
  
  // Get referral percentages from database settings
  const referralInitialPercent = parseFloat(settings.referral_initial_percent || "5");
  const referralDailyPercent = parseFloat(settings.referral_daily_percent || "1");

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Referrals" subtitle="Earn rewards" backTo="/more" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-4 overflow-y-auto">
        {/* Stats Row */}
        <div className="flex gap-4">
          <div className="flex-1 text-center py-3 bg-muted/50 rounded-sm">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Referrals</p>
            <p className="text-xl font-bold">{referrals.length}</p>
          </div>
          <div className="flex-1 text-center py-3 bg-muted/50 rounded-sm">
            <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Earnings</p>
            <p className="text-xl font-bold">GH₵{totalEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Referral Code - Simplified */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Your referral code</p>
          <div className="flex items-center justify-center gap-2">
            {referralCode ? (
              <span className="font-mono font-bold text-3xl tracking-wider">
                {referralCode}
              </span>
            ) : (
              <Skeleton className="h-9 w-32" />
            )}
            <Button
              onClick={copyReferralCode}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!referralCode}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 border border-border rounded-[10px] py-3 px-3 text-xs font-mono truncate">
            {referralCode ? `${window.location.origin}/sign-up?ref=${referralCode}` : <Skeleton className="h-4 w-full" />}
          </div>
          <Button
            onClick={copyReferralLink}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 border border-border rounded-[10px]"
            disabled={!referralCode}
          >
            {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Earnings Breakdown - Side by Side */}
        <div className="flex gap-4">
          <div className="flex-1 bg-muted/50 rounded-sm p-3 text-center">
            <Gift className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">
              {settingsLoading ? (
                <Skeleton className="h-3 w-12" />
              ) : (
                `Initial (${referralInitialPercent}%)`
              )}
            </p>
            <p className="text-lg font-bold">GH₵{initialEarnings.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-muted/50 rounded-sm p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">
              {settingsLoading ? (
                <Skeleton className="h-3 w-12" />
              ) : (
                `Daily (${referralDailyPercent}%)`
              )}
            </p>
            <p className="text-lg font-bold">GH₵{dailyEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Referrals</p>
            <div className="space-y-1">
              {referrals.slice(0, 5).map((referral) => (
                <div key={referral.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">User {referral.referredId.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Earnings */}
        {earnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Earnings</p>
            <div className="space-y-1">
              {earnings.slice(0, 5).map((earning) => (
                <div key={earning.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{earning.type === 'initial' ? 'Initial Bonus' : 'Daily Interest'}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold">GH₵{earning.amount.toFixed(2)}</span>
                    <div className="text-xs text-muted-foreground">
                      {new Date(earning.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-muted/50 rounded-sm p-4 space-y-1">
          <p className="text-xs font-bold text-foreground">How it works</p>
          <p className="text-xs text-muted-foreground">1. Share your code with friends</p>
          <p className="text-xs text-muted-foreground">
            {settingsLoading ? (
              <Skeleton className="h-3 w-24 inline-block" />
            ) : (
              `2. Get ${referralInitialPercent}% when they invest`
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {settingsLoading ? (
              <Skeleton className="h-3 w-32 inline-block" />
            ) : (
              `3. Earn ${referralDailyPercent}% daily on their investments`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReferralsPage;
