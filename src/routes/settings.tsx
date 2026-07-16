import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUser, setUser, type User } from "@/lib/store";
import { Camera, Check, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Lumen" }] }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setLocal] = useState<User>({ fullName: "", email: "", phone: "", avatarUrl: "" });
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      const u = await getUser();
      if (u) setLocal({ phone: "", avatarUrl: "", ...u });
    }
    loadUser();
  }, [navigate]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    let finalUrl = "";

    try {
      const currentUser = await getUser();
      if (isSupabaseConfigured && currentUser?.id) {
        // Upload to Supabase Storage avatars bucket
        const fileExt = file.name.split(".").pop();
        const filePath = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading avatar:", uploadError);
          alert("Upload failed: " + uploadError.message);
          setUploading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        finalUrl = publicUrl;
      } else {
        // Offline fallback: Convert to Base64
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setLocal((prev) => ({ ...prev, avatarUrl: finalUrl }));
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      alert("Profile picture upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setUser(user);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Settings" subtitle="Account" backTo="/more" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6 overflow-y-auto">
        {/* Profile Section */}
        <section className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Profile Settings
          </p>

          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            {/* Round Avatar Container with Upload triggers */}
            <div className="relative group cursor-pointer h-24 w-24">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="avatar-upload"
                className="h-full w-full rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer relative"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {(user.fullName || "G").slice(0, 1).toUpperCase()}
                  </span>
                )}
                {/* Upload Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              </label>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {uploading ? "Uploading picture..." : "Tap avatar to change"}
            </span>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={user.fullName}
                onChange={(e) => setLocal({ ...user, fullName: e.target.value })}
                placeholder="Kwame Mensah"
                className="rounded-sm h-11 shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setLocal({ ...user, email: e.target.value })}
                placeholder="you@example.com"
                className="rounded-sm h-11 shadow-none bg-muted cursor-not-allowed opacity-75"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={user.phone ?? ""}
                onChange={(e) => setLocal({ ...user, phone: e.target.value })}
                placeholder="024 123 4567"
                className="rounded-sm h-11 shadow-none"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-full h-11 mt-4 bg-accent text-accent-foreground hover:brightness-105 shadow-none transition-colors"
              disabled={uploading}
            >
              {saved ? "Saved ✓" : "Save changes"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
export default SettingsPage;
