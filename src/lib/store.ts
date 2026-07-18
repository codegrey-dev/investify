import { supabase, isSupabaseConfigured } from "./supabase";

export type Network = "MTN" | "Telecel" | "AirtelTigo";

export type DepositTicket = {
  id: string;
  amount: number;
  network: Network;
  phone: string;
  fullName: string;
  reference: string;
  screenshot?: string;
  status: "pending" | "processing" | "confirmed" | "rejected";
  createdAt: number;
};

export type Withdrawal = {
  id: string;
  amount: number;
  network: Network;
  phone: string;
  fullName: string;
  status: "pending" | "processing" | "confirmed" | "rejected";
  createdAt: number;
};

export type Investment = {
  id: string;
  packageId: string;
  packageName: string;
  amount: number;
  dailyProfit: string;
  duration: string;
  returns: number;
  status: "active" | "completed";
  createdAt: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: "deposit" | "withdrawal" | "investment" | "earnings" | "system";
  unread: boolean;
  createdAt: number;
};

export type User = {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  balance?: number;
  role?: 'user' | 'admin';
  referralCode?: string;
};

export type Earning = {
  id: string;
  userId: string;
  investmentId: string;
  packageId: string;
  packageName: string;
  amount: number;
  calculatedDate: string;
  createdAt: number;
};

export type ReferralCode = {
  id: string;
  userId: string;
  code: string;
  createdAt: number;
};

export type Referral = {
  id: string;
  referrerId: string;
  referredId: string;
  referralCodeId: string;
  createdAt: number;
};

export type ReferralEarning = {
  id: string;
  userId: string;
  referralId: string;
  amount: number;
  type: 'initial' | 'daily';
  investmentId?: string;
  createdAt: number;
};

// Direct database functions - no localStorage

export async function getUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      balance: profile.balance,
      role: profile.role,
      referralCode: profile.referral_code,
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function setUser(u: User) {
  if (!isSupabaseConfigured || !u.id) return;
  
  try {
    await supabase
      .from("profiles")
      .upsert({
        id: u.id,
        full_name: u.fullName,
        email: u.email,
        phone: u.phone || null,
        avatar_url: u.avatarUrl || null,
        updated_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Error setting user:", error);
  }
}

export async function getBalance(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    return profile?.balance || 0;
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
}

export async function updateBalance(amount: number, operation: 'add' | 'subtract' = 'add') {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentBalance = await getBalance();
    const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;

    await supabase
      .from("profiles")
      .update({ balance: Math.max(0, newBalance) })
      .eq("id", user.id);
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

// --- Deposit Tickets ---
export async function getTickets(): Promise<DepositTicket[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("deposit_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((d: any) => ({
      id: d.id,
      amount: Number(d.amount),
      network: d.network as Network,
      phone: d.phone,
      fullName: d.full_name,
      reference: d.reference,
      screenshot: d.screenshot || undefined,
      status: d.status as any,
      createdAt: new Date(d.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }
}

export async function addTicket(t: DepositTicket) {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("deposit_tickets")
      .insert({
        id: t.id,
        user_id: user.id,
        amount: t.amount,
        network: t.network,
        phone: t.phone,
        full_name: t.fullName,
        reference: t.reference,
        screenshot: t.screenshot || null,
        status: t.status,
        created_at: new Date(t.createdAt).toISOString(),
      });
  } catch (error) {
    console.error("Error adding ticket:", error);
  }
}

export async function updateTicket(id: string, patch: Partial<DepositTicket>) {
  if (!isSupabaseConfigured) return;
  
  try {
    const dbPatch: Record<string, any> = {};
    if (patch.status) dbPatch.status = patch.status;
    if (patch.screenshot) dbPatch.screenshot = patch.screenshot;

    await supabase
      .from("deposit_tickets")
      .update(dbPatch)
      .eq("id", id);
  } catch (error) {
    console.error("Error updating ticket:", error);
  }
}

// --- Withdrawals ---
export async function getWithdrawals(): Promise<Withdrawal[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((w: any) => ({
      id: w.id,
      amount: Number(w.amount),
      network: w.network as Network,
      phone: w.phone,
      fullName: w.full_name,
      status: w.status as any,
      createdAt: new Date(w.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return [];
  }
}

export async function addWithdrawal(w: Withdrawal) {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: w.amount,
        network: w.network,
        phone: w.phone,
        full_name: w.fullName,
        status: w.status,
        created_at: new Date(w.createdAt).toISOString(),
      });
  } catch (error) {
    console.error("Error adding withdrawal:", error);
  }
}

export async function updateWithdrawal(id: string, patch: Partial<Withdrawal>) {
  if (!isSupabaseConfigured) return;
  
  try {
    const dbPatch: Record<string, any> = {};
    if (patch.status) dbPatch.status = patch.status;

    await supabase
      .from("withdrawals")
      .update(dbPatch)
      .eq("id", id);
  } catch (error) {
    console.error("Error updating withdrawal:", error);
  }
}

// --- Investments ---
export async function getInvestments(): Promise<Investment[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((inv: any) => ({
      id: inv.id,
      packageId: inv.package_id,
      packageName: inv.package_id.charAt(0).toUpperCase() + inv.package_id.slice(1) + " Package",
      amount: Number(inv.amount),
      dailyProfit: inv.daily_profit,
      duration: inv.duration,
      returns: Number(inv.returns),
      status: inv.status as any,
      createdAt: new Date(inv.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching investments:", error);
    return [];
  }
}

export async function addInvestment(inv: Investment) {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("investments")
      .insert({
        id: inv.id,
        user_id: user.id,
        package_id: inv.packageId,
        amount: inv.amount,
        daily_profit: inv.dailyProfit,
        duration: inv.duration,
        returns: inv.returns,
        status: inv.status,
        created_at: new Date(inv.createdAt).toISOString(),
      });
  } catch (error) {
    console.error("Error adding investment:", error);
  }
}

// --- Notifications ---
export async function getNotifications(): Promise<Notification[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type as any,
      unread: n.unread,
      createdAt: new Date(n.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function addNotification(n: Omit<Notification, "id" | "unread" | "createdAt">) {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        title: n.title,
        body: n.body,
        type: n.type,
        unread: true,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Error adding notification:", error);
  }
}

export async function markAllNotificationsRead() {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("user_id", user.id);
  } catch (error) {
    console.error("Error marking notifications read:", error);
  }
}

export async function clearAllNotifications() {
  if (!isSupabaseConfigured) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
}

// --- Earnings ---
export async function getEarnings(): Promise<Earning[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("earnings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((e: any) => ({
      id: e.id,
      userId: e.user_id,
      investmentId: e.investment_id,
      packageId: e.package_id,
      packageName: e.package_name,
      amount: Number(e.amount),
      calculatedDate: e.calculated_date,
      createdAt: new Date(e.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return [];
  }
}

export async function addEarning(earning: Earning) {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase
      .from("earnings")
      .insert({
        id: earning.id,
        user_id: earning.userId,
        investment_id: earning.investmentId,
        package_id: earning.packageId,
        package_name: earning.packageName,
        amount: earning.amount,
        calculated_date: earning.calculatedDate,
        created_at: new Date(earning.createdAt).toISOString(),
      });
  } catch (error) {
    console.error("Error adding earning:", error);
  }
}

// Admin functions
export async function getAllDeposits(): Promise<DepositTicket[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data } = await supabase
      .from("deposit_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    return data?.map((d: any) => ({
      id: d.id,
      amount: Number(d.amount),
      network: d.network as Network,
      phone: d.phone,
      fullName: d.full_name,
      reference: d.reference,
      screenshot: d.screenshot || undefined,
      status: d.status as any,
      createdAt: new Date(d.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching all deposits:", error);
    return [];
  }
}

export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    return data?.map((w: any) => ({
      id: w.id,
      amount: Number(w.amount),
      network: w.network as Network,
      phone: w.phone,
      fullName: w.full_name,
      status: w.status as any,
      createdAt: new Date(w.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching all withdrawals:", error);
    return [];
  }
}

export async function getAllInvestments(): Promise<Investment[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data } = await supabase
      .from("investments")
      .select("*")
      .order("created_at", { ascending: false });

    return data?.map((inv: any) => ({
      id: inv.id,
      packageId: inv.package_id,
      packageName: inv.package_id.charAt(0).toUpperCase() + inv.package_id.slice(1) + " Package",
      amount: Number(inv.amount),
      dailyProfit: inv.daily_profit,
      duration: inv.duration,
      returns: Number(inv.returns),
      status: inv.status as any,
      createdAt: new Date(inv.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching all investments:", error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    return data?.map((p: any) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      avatarUrl: p.avatar_url,
      balance: p.balance,
      role: p.role,
      referralCode: p.referral_code,
    })) || [];
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

// Referral system functions

export async function getReferralCode(): Promise<ReferralCode | null> {
  if (!isSupabaseConfigured) return null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      // Try to create a referral code if one doesn't exist
      return await createReferralCode(user.id);
    }

    return {
      id: data.id,
      userId: data.user_id,
      code: data.code,
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch (error) {
    console.error("Error fetching referral code:", error);
    return null;
  }
}

export async function createReferralCode(userId: string): Promise<ReferralCode | null> {
  if (!isSupabaseConfigured) return null;
  
  try {
    // Generate a random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const { data, error } = await supabase
      .from("referral_codes")
      .insert({
        user_id: userId,
        code: code,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating referral code:", error);
      return null;
    }

    // Update profile with referral code
    await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", userId);

    return {
      id: data.id,
      userId: data.user_id,
      code: data.code,
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch (error) {
    console.error("Error creating referral code:", error);
    return null;
  }
}

export async function getReferrals(): Promise<Referral[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((r: any) => ({
      id: r.id,
      referrerId: r.referrer_id,
      referredId: r.referred_id,
      referralCodeId: r.referral_code_id,
      createdAt: new Date(r.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return [];
  }
}

export async function getReferralEarnings(): Promise<ReferralEarning[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("referral_earnings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return data?.map((e: any) => ({
      id: e.id,
      userId: e.user_id,
      referralId: e.referral_id,
      amount: Number(e.amount),
      type: e.type,
      investmentId: e.investment_id,
      createdAt: new Date(e.created_at).getTime(),
    })) || [];
  } catch (error) {
    console.error("Error fetching referral earnings:", error);
    return [];
  }
}

export async function processReferral(referralCode: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Call the database function to process referral
    const { data, error } = await supabase.rpc('process_referral_on_signup', {
      referral_code_input: referralCode
    });

    if (error) {
      console.error("Error processing referral:", error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error("Error processing referral:", error);
    return false;
  }
}

export async function grantReferralInitialBonus(referralId: string, investmentId: string, investmentAmount: number): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase.rpc('grant_referral_initial_bonus', {
      referral_id: referralId,
      investment_id: investmentId,
      investment_amount: investmentAmount
    });
  } catch (error) {
    console.error("Error granting referral initial bonus:", error);
  }
}

export async function calculateDailyReferralInterest(): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase.rpc('calculate_daily_referral_interest');
  } catch (error) {
    console.error("Error calculating daily referral interest:", error);
  }
}

export function makeRef() {
  return "LMN-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Settings functions
export async function getAppSettings(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};
  
  try {
    const { data, error } = await supabase.functions.invoke('get-settings');
    
    if (error) {
      console.error("Error fetching app settings:", error);
      return {};
    }
    
    return data?.settings || {};
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return {};
  }
}

export async function updateAppSettings(settings: Record<string, string>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        Object.entries(settings).map(([key, value]) => ({
          key,
          value,
        })),
        { onConflict: 'key' }
      );
    
    if (error) {
      console.error("Error updating app settings:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating app settings:", error);
    return false;
  }
}

export const NETWORKS: { id: Network; label: string }[] = [
  { id: "MTN", label: "MTN" },
  { id: "Telecel", label: "Telecel" },
  { id: "AirtelTigo", label: "AirtelTigo" },
];

export const DEPOSIT_NUMBERS: Record<Network, { phone: string; name: string }> = {
  MTN: { phone: "024 000 1234", name: "Lumen Invest Ltd" },
  Telecel: { phone: "020 000 1234", name: "Lumen Invest Ltd" },
  AirtelTigo: { phone: "026 000 1234", name: "Lumen Invest Ltd" },
};
