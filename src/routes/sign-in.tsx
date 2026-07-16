import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { setUser } from "@/lib/store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
  head: () => ({ meta: [{ title: "Sign in — Lumen" }] }),
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    if (!isSupabaseConfigured) {
      setError("Authentication is not configured");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Auth error:", authError);
        setError(authError.message || "Authentication failed");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch profile details
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          setError("Failed to load user profile. Please try again.");
          setLoading(false);
          return;
        }

        if (!profile) {
          console.error("Profile not found for user:", data.user.id);
          setError("User profile not found. Please contact support.");
          setLoading(false);
          return;
        }

        await setUser({
          id: data.user.id,
          fullName: profile.full_name || data.user.email?.split("@")[0] || "",
          email: data.user.email || "",
          phone: profile.phone || undefined,
          avatarUrl: profile.avatar_url || undefined,
          balance: profile.balance || 0,
          role: profile.role || 'user',
          referralCode: profile.referral_code || undefined,
        });

        navigate({ to: "/" });
      } else {
        setError("No user data returned from authentication");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorMessage = err?.message || err?.toString() || "An unexpected error occurred during sign in";
      setError(errorMessage);
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Flat Header section */}
          <div className="text-center flex flex-col items-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Welcome back</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">Sign in</h1>
          </div>

        {/* Form Fields */}
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-sm h-11 shadow-none"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-sm h-11 shadow-none"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-lg h-11 mt-4 bg-accent text-accent-foreground hover:brightness-105 shadow-none transition-colors"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-3">
            No account?{" "}
            <Link to="/sign-up" className="font-bold text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
