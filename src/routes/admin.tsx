import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAllDeposits, getAllWithdrawals, getAllInvestments, getAllUsers, updateTicket, updateWithdrawal, getAppSettings, updateAppSettings } from "@/lib/store";
import { useUser } from "@/lib/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { networkLogo } from "@/lib/logos";
import { Shield, Users, Wallet, ArrowUpRight, ArrowDownRight, Check, X, RefreshCw, TrendingUp, DollarSign, Activity, Eye, Clock, Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Lumen" },
      { name: "description", content: "Manage deposits, withdrawals, users, and investments." },
    ],
  }),
});

type TabType = "pending" | "deposits" | "withdrawals" | "users" | "investments" | "settings";

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [processingDeposit, setProcessingDeposit] = useState<string | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const { user: contextUser } = useUser();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Load admin data - RLS policies will handle access control
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: '/sign-in' });
        return;
      }
      
      // Check if user is admin
      if (contextUser?.role !== 'admin') {
        navigate({ to: '/' });
        return;
      }
    }
    
    checkAuth();

    async function loadAdminData() {
      setLoading(true);
      try {
        const [depositsData, withdrawalsData, usersData, investmentsData, settingsData] = await Promise.all([
          getAllDeposits(),
          getAllWithdrawals(),
          getAllUsers(),
          getAllInvestments(),
          getAppSettings(),
        ]);
        setDeposits(depositsData);
        setWithdrawals(withdrawalsData);
        setUsers(usersData);
        setInvestments(investmentsData);
        setSettings(settingsData);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [navigate]);

  async function handleDepositAction(id: string, status: "confirmed" | "rejected") {
    setProcessingDeposit(id);
    try {
      await updateTicket(id, { status });
      
      // Refresh data
      const depositsData = await getAllDeposits();
      setDeposits(depositsData);
      setSelectedDeposit(null); // Close the sheet after successful action
    } catch (error) {
      console.error("Error updating deposit:", error);
      alert("Failed to update deposit status");
    } finally {
      setProcessingDeposit(null);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const success = await updateAppSettings(settings);
      if (success) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  function handleSettingChange(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleWithdrawalAction(id: string, status: "confirmed" | "rejected") {
    setProcessingWithdrawal(id);
    try {
      await updateWithdrawal(id, { status });
      
      // Refresh data
      const withdrawalsData = await getAllWithdrawals();
      setWithdrawals(withdrawalsData);
      setSelectedWithdrawal(null); // Close the sheet after successful action
    } catch (error) {
      console.error("Error updating withdrawal:", error);
      alert("Failed to update withdrawal status");
    } finally {
      setProcessingWithdrawal(null);
    }
  }

  async function handleUserRoleUpdate(userId: string, newRole: "user" | "admin") {
    try {
      await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      
      // Refresh data
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  }

  if (loading) {
    return (
      <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
        <PageHeader title="Admin Dashboard" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const activeInvestments = investments.filter(i => i.status === 'active').length;
  const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Admin Dashboard" subtitle="Management" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
        {/* Total Balance Card */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total User Balance</p>
              <p className="text-3xl font-bold">GH₵{totalBalance.toLocaleString()}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Pending Deposits</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{pendingDeposits}</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Pending Withdrawals</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingWithdrawals}</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{users.length}</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Active Investments</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{activeInvestments}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["pending", "deposits", "withdrawals", "users", "investments", "settings"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab === "pending" ? "Pending" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Pending Transactions</h3>
            </div>
            
            {deposits.filter(d => d.status === 'pending' || d.status === 'processing').length === 0 && 
             withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No pending transactions</p>
            ) : (
              <ul className="space-y-3">
                {[...deposits.filter(d => d.status === 'pending' || d.status === 'processing').map(d => ({...d, type: 'deposit'})), 
                  ...withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').map(w => ({...w, type: 'withdrawal'}))]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((item) => {
                    const isDeposit = item.type === 'deposit';
                    const formattedTime = new Date(item.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                          {networkLogo(item.network) ? (
                            <img
                              src={networkLogo(item.network)}
                              alt={item.network}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">
                              {item.network?.slice(0, 2).toUpperCase() || "TX"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {isDeposit ? `Deposit via ${item.network}` : `Withdrawal to ${item.network}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.full_name} • {formattedTime}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${isDeposit ? "text-[oklch(0.55_0.15_150)]" : "text-red-600"}`}>
                            {isDeposit ? "+" : "-"}GH₵{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className="flex gap-1 mt-1 justify-end">
                            <Button
                              onClick={() => isDeposit ? setSelectedDeposit(item) : setSelectedWithdrawal(item)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs rounded-md shadow-none"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "deposits" && (
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No deposits found</p>
            ) : (
              <ul className="space-y-3">
                {deposits.map((deposit) => {
                  const formattedTime = new Date(deposit.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <li key={deposit.id} className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                        {networkLogo(deposit.network) ? (
                          <img
                            src={networkLogo(deposit.network)}
                            alt={deposit.network}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {deposit.network.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          Deposit via {deposit.network}
                        </p>
                        <p className="text-xs text-muted-foreground">{deposit.full_name} • {formattedTime}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-[oklch(0.55_0.15_150)]">
                          +GH₵{deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          deposit.status === "confirmed"
                            ? "text-[oklch(0.55_0.15_150)]" 
                            : deposit.status === "rejected" 
                            ? "text-red-600" 
                            : "text-amber-600"
                        }`}>
                          {deposit.status}
                        </span>
                        {deposit.status === 'pending' && (
                          <div className="flex gap-1 mt-1 justify-end">
                            <Button
                              onClick={() => handleDepositAction(deposit.id, 'confirmed')}
                              size="sm"
                              className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDepositAction(deposit.id, 'rejected')}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No withdrawals found</p>
            ) : (
              <ul className="space-y-3">
                {withdrawals.map((withdrawal) => {
                  const formattedTime = new Date(withdrawal.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <li key={withdrawal.id} className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                        {networkLogo(withdrawal.network) ? (
                          <img
                            src={networkLogo(withdrawal.network)}
                            alt={withdrawal.network}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {withdrawal.network.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          Withdrawal to {withdrawal.network}
                        </p>
                        <p className="text-xs text-muted-foreground">{withdrawal.full_name} • {formattedTime}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-red-600">
                          -GH₵{withdrawal.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          withdrawal.status === "confirmed"
                            ? "text-[oklch(0.55_0.15_150)]" 
                            : withdrawal.status === "rejected" 
                            ? "text-red-600" 
                            : "text-amber-600"
                        }`}>
                          {withdrawal.status}
                        </span>
                        {withdrawal.status === 'pending' && (
                          <div className="flex gap-1 mt-1 justify-end">
                            <Button
                              onClick={() => handleWithdrawalAction(withdrawal.id, 'confirmed')}
                              size="sm"
                              className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleWithdrawalAction(withdrawal.id, 'rejected')}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
            ) : (
              <ul className="space-y-3">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        GH₵{(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.role}
                      </Badge>
                      <div className="mt-1">
                        <Button
                          onClick={() => handleUserRoleUpdate(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                        >
                          {user.role === 'admin' ? 'User' : 'Admin'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "investments" && (
          <div className="space-y-3">
            {investments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No investments found</p>
            ) : (
              <ul className="space-y-3">
                {investments.map((investment) => {
                  const formattedTime = new Date(investment.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <li key={investment.id} className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full overflow-hidden border border-border bg-background shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">
                          {investment.packageId.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {investment.packageId.toUpperCase()} Package
                        </p>
                        <p className="text-xs text-muted-foreground">{formattedTime}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-red-600">
                          GH₵{investment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          investment.status === "active"
                            ? "text-[oklch(0.55_0.15_150)]" 
                            : "text-gray-600"
                        }`}>
                          {investment.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">App Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit_fee_percent">Deposit Fee Percent (%)</Label>
                <Input
                  id="deposit_fee_percent"
                  type="number"
                  step="0.1"
                  value={settings.deposit_fee_percent || ""}
                  onChange={(e) => handleSettingChange("deposit_fee_percent", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_deposit">Minimum Deposit (GH₵)</Label>
                <Input
                  id="min_deposit"
                  type="number"
                  step="0.01"
                  value={settings.min_deposit || ""}
                  onChange={(e) => handleSettingChange("min_deposit", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdraw_fee_percent">Withdrawal Fee Percent (%)</Label>
                <Input
                  id="withdraw_fee_percent"
                  type="number"
                  step="0.1"
                  value={settings.withdraw_fee_percent || ""}
                  onChange={(e) => handleSettingChange("withdraw_fee_percent", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_withdrawal">Minimum Withdrawal (GH₵)</Label>
                <Input
                  id="min_withdrawal"
                  type="number"
                  step="0.01"
                  value={settings.min_withdrawal || ""}
                  onChange={(e) => handleSettingChange("min_withdrawal", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_initial_percent">Referral Initial Percent (%)</Label>
                <Input
                  id="referral_initial_percent"
                  type="number"
                  step="0.1"
                  value={settings.referral_initial_percent || ""}
                  onChange={(e) => handleSettingChange("referral_initial_percent", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_daily_percent">Referral Daily Percent (%)</Label>
                <Input
                  id="referral_daily_percent"
                  type="number"
                  step="0.1"
                  value={settings.referral_daily_percent || ""}
                  onChange={(e) => handleSettingChange("referral_daily_percent", e.target.value)}
                  className="rounded-sm h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_url">WhatsApp URL</Label>
                <Input
                  id="whatsapp_url"
                  type="url"
                  value={settings.whatsapp_url || ""}
                  onChange={(e) => handleSettingChange("whatsapp_url", e.target.value)}
                  className="rounded-sm h-11"
                  placeholder="https://wa.me/233240001234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram_url">Telegram URL</Label>
                <Input
                  id="telegram_url"
                  type="url"
                  value={settings.telegram_url || ""}
                  onChange={(e) => handleSettingChange("telegram_url", e.target.value)}
                  className="rounded-sm h-11"
                  placeholder="https://t.me/lumen_invest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email || ""}
                  onChange={(e) => handleSettingChange("support_email", e.target.value)}
                  className="rounded-sm h-11"
                  placeholder="support@lumen.invest"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full rounded-sm h-11"
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Details Sheet */}
      <Sheet open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-3xl p-4">
          <div className="mb-2">
            <h3 className="text-base font-semibold">Deposit Details</h3>
          </div>
          {selectedDeposit && (
            <div className="flex-1 space-y-6 overflow-y-auto pb-24">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">GH₵{selectedDeposit.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Network</p>
                  <p className="font-semibold">{selectedDeposit.network}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-semibold">{selectedDeposit.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-semibold">{selectedDeposit.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-semibold">{selectedDeposit.reference}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">{selectedDeposit.status}</p>
                </div>
              </div>
              {selectedDeposit.screenshot && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Screenshot</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <img 
                      src={selectedDeposit.screenshot} 
                      alt="Deposit screenshot" 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedDeposit && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDepositAction(selectedDeposit.id, 'confirmed')}
                  disabled={processingDeposit === selectedDeposit.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingDeposit === selectedDeposit.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleDepositAction(selectedDeposit.id, 'rejected')}
                  disabled={processingDeposit === selectedDeposit.id}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingDeposit === selectedDeposit.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" /> Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Withdrawal Details Sheet */}
      <Sheet open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-3xl p-4">
          <div className="mb-2">
            <h3 className="text-base font-semibold">Withdrawal Details</h3>
          </div>
          {selectedWithdrawal && (
            <div className="flex-1 space-y-6 overflow-y-auto pb-24">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">GH₵{selectedWithdrawal.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Network</p>
                  <p className="font-semibold">{selectedWithdrawal.network}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-semibold">{selectedWithdrawal.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-semibold">{selectedWithdrawal.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">{selectedWithdrawal.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{new Date(selectedWithdrawal.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          {selectedWithdrawal && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleWithdrawalAction(selectedWithdrawal.id, 'confirmed')}
                  disabled={processingWithdrawal === selectedWithdrawal.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingWithdrawal === selectedWithdrawal.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleWithdrawalAction(selectedWithdrawal.id, 'rejected')}
                  disabled={processingWithdrawal === selectedWithdrawal.id}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingWithdrawal === selectedWithdrawal.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" /> Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AdminPage;
