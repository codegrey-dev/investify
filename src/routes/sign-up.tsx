import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
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
  const search = useSearch({ from: '/sign-up' });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (search && 'ref' in search && search.ref) {
      setReferralCode(search.ref as string);
    }
    const savedEmail = localStorage.getItem('signup_email');
    const savedName = localStorage.getItem('signup_name');
    if (savedEmail) setEmail(savedEmail);
    if (savedName) setFullName(savedName);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('signup_email', email);
  }, [email]);

  useEffect(() => {
    localStorage.setItem('signup_name', fullName);
  }, [fullName]);

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

  async function signUpWithGoogle() {
    if (!isSupabaseConfigured) {
      setError("Authentication is not configured");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error("Google auth error:", error);
        setError(error.message || "Google authentication failed");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Google sign up error:", err);
      const errorMessage = err?.message || err?.toString() || "An unexpected error occurred during Google sign up";
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
            className="w-full rounded-lg h-11 mt-4 bg-black text-white hover:bg-gray-900 shadow-none transition-colors"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </Button>

          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={signUpWithGoogle}
            className="w-full rounded-lg h-11 mt-4 bg-white text-black border border-border hover:bg-gray-50 shadow-none transition-colors"
            disabled={loading}
          >
            <svg viewBox="0 0 32 32" data-name="Layer 1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="h-8 w-8 mr-2"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M23.75,16A7.7446,7.7446,0,0,1,8.7177,18.6259L4.2849,22.1721A13.244,13.244,0,0,0,29.25,16" fill="#00ac47"></path><path d="M23.75,16a7.7387,7.7387,0,0,1-3.2516,6.2987l4.3824,3.5059A13.2042,13.2042,0,0,0,29.25,16" fill="#4285f4"></path><path d="M8.25,16a7.698,7.698,0,0,1,.4677-2.6259L4.2849,9.8279a13.177,13.177,0,0,0,0,12.3442l4.4328-3.5462A7.698,7.698,0,0,1,8.25,16Z" fill="#ffba00"></path><polygon fill="#2ab2db" points="8.718 13.374 8.718 13.374 8.718 13.374 8.718 13.374"></polygon><path d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z" fill="#ea4435"></path><polygon fill="#2ab2db" points="8.718 18.626 8.718 18.626 8.718 18.626 8.718 18.626"></polygon><path d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z" fill="#4285f4"></path></g></svg>
            {loading ? "Connecting..." : "Google"}
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
