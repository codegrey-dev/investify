import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Users, DollarSign, TrendingUp, Gift, Check } from "lucide-react";
import { getReferralCode, getReferrals, getReferralEarnings } from "@/lib/store";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured) {
        setLoading(false);
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
        const [codeData, referralsData, earningsData] = await Promise.all([
          getReferralCode(),
          getReferrals(),
          getReferralEarnings(),
        ]);
        
        if (codeData) setReferralCode(codeData.code);
        setReferrals(referralsData);
        setEarnings(earningsData);
      } catch (error) {
        console.error("Error loading referral data:", error);
        setReferralCode("Not available");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [navigate]);

  function copyReferralCode() {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const initialEarnings = earnings.filter(e => e.type === 'initial').reduce((sum, e) => sum + e.amount, 0);
  const dailyEarnings = earnings.filter(e => e.type === 'daily').reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
        <PageHeader title="Referrals" subtitle="Earn rewards" backTo="/more" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Referrals" subtitle="Earn rewards" backTo="/more" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
        {/* Referral Code Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Your Referral Code</CardTitle>
            <CardDescription className="text-xs">Share this code with friends to earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-muted rounded-sm px-4 py-3 font-mono font-bold text-lg tracking-wider">
                {referralCode || "Loading..."}
              </div>
              <Button
                onClick={copyReferralCode}
                variant="outline"
                size="icon"
                className="rounded-sm h-11 w-11"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{referrals.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">${totalEarnings.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Earnings Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-sm">Initial Bonuses (5%)</span>
              </div>
              <span className="text-sm font-bold">${initialEarnings.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm">Daily Interest (1%)</span>
              </div>
              <span className="text-sm font-bold">${dailyEarnings.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {referrals.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">User {referral.referredId.slice(0, 8)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Earnings */}
        {earnings.length > 0 && (
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Recent Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {earnings.slice(0, 5).map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm">{earning.type === 'initial' ? 'Initial Bonus' : 'Daily Interest'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">${earning.amount.toFixed(2)}</span>
                      <div className="text-xs text-muted-foreground">
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="border-border shadow-none bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>1. Share your referral code with friends</p>
            <p>2. When they sign up and invest, you get 5% of their investment amount</p>
            <p>3. Every day, you earn 1% of their active investment value</p>
            <p>4. Earnings are automatically added to your balance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReferralsPage;
