import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { setUser, processReferral } from "@/lib/store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
  head: () => ({ meta: [{ title: "Sign up — Lumen" }] }),
});

function SignUpPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    if (!isSupabaseConfigured) {
      setError("Authentication is not configured");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        setError(authError.message || "Authentication failed");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Process referral code if provided
        if (referralCode.trim()) {
          try {
            await processReferral(referralCode.trim());
          } catch (referralError) {
            console.error("Referral processing error:", referralError);
            // Continue even if referral fails
          }
        }

        await setUser({
          id: data.user.id,
          fullName,
          email,
          balance: 0,
          role: 'user',
        });

        navigate({ to: "/" });
      } else {
        setError("No user data returned from sign up");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      const errorMessage = err?.message || err?.toString() || "An unexpected error occurred during sign up";
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
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Get started</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">Create account</h1>
          </div>

        {/* Form Fields */}
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kwame Mensah"
              className="rounded-sm h-11 shadow-none"
              disabled={loading}
            />
          </div>
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
              placeholder="At least 8 characters"
              className="rounded-sm h-11 shadow-none"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referralCode">Referral Code (Optional)</Label>
            <Input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code"
              className="rounded-sm h-11 shadow-none"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-lg h-11 mt-4 bg-accent text-accent-foreground hover:brightness-105 shadow-none transition-colors"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-3">
            Have an account?{" "}
            <Link to="/sign-in" className="font-bold text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
