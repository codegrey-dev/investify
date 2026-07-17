import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Ticket,
  Settings as SettingsIcon,
  LogOut,
  Mail,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getUser, setUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import telegramLogo from "@/assets/logos/telegram.webp";
import whatsappLogo from "@/assets/logos/WhatsApp.png";

export const Route = createFileRoute("/more")({
  component: MorePage,
  head: () => ({ meta: [{ title: "More — Lumen" }] }),
});

function MorePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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
    
    async function loadUser() {
      const userData = await getUser();
      setUser(userData);
    }
    loadUser();
  }, []);

  const items = [
    { to: "/tickets", label: "Deposit tickets", icon: Ticket },
    { to: "/referrals", label: "Referrals", icon: Mail },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
    ...(user?.role === 'admin' ? [{ to: "/admin", label: "Admin Dashboard", icon: Shield }] as const : []),
  ] as const;

  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    navigate({ to: "/sign-in" });
  }

  return (
    <div className="phone-frame flex flex-col bg-background">
      <PageHeader title="More" subtitle="Account" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-8 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Centered User Info Section */}
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="h-20 w-20 rounded-full border border-border bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">
                  {(user?.fullName || "G").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-3">
              {user?.fullName || "Guest"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.email || "Sign in to sync your account"}
            </p>
          </div>

          {/* List of Settings Items */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Account Settings
            </p>
            
            <div className="space-y-2">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.label}
                    to={it.to}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-transparent hover:bg-muted/30 transition-colors"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-sm bg-primary/10 text-primary shrink-0">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-bold text-foreground">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Dedicated Support Channels Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Support Channels
            </p>
            
            <div className="space-y-2">
              <a
                href="https://wa.me/233240001234"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-transparent hover:bg-muted/30 transition-colors"
              >
                <img src={whatsappLogo} alt="WhatsApp" className="h-8 w-8 object-contain rounded-full" />
                <span className="text-xs font-bold text-foreground">WhatsApp</span>
              </a>
              <a
                href="https://t.me/lumen_invest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-transparent hover:bg-muted/30 transition-colors"
              >
                <img src={telegramLogo} alt="Telegram" className="h-8 w-8 object-contain rounded-full" />
                <span className="text-xs font-bold text-foreground">Telegram</span>
              </a>
              <a
                href="mailto:support@lumen.invest"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-transparent hover:bg-muted/30 transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-foreground">Email</span>
              </a>
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div>
          <Button
            onClick={signOut}
            variant="outline"
            className="w-full rounded-sm h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-none gap-2 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            {user ? "Sign out" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
