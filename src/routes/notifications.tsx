import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNotifications, markAllNotificationsRead, clearAllNotifications } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — Lumen" },
      { name: "description", content: "Stay updated with your account activity." },
    ],
  }),
});

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  type: "deposit" | "withdrawal" | "investment" | "earnings" | "system";
  createdAt: number;
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    
    async function loadNotifications() {
      const notificationsData = await getNotifications();
      const mappedNotifications: NotificationItem[] = notificationsData.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: new Date(n.createdAt).toLocaleDateString() + " " + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: n.unread,
        type: n.type,
        createdAt: n.createdAt,
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter((n) => n.unread).length);
    }
    loadNotifications();
  }, [navigate]);

  async function markAllRead() {
    await markAllNotificationsRead();
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  }

  return (
    <div className="phone-frame flex flex-col bg-background min-h-screen select-none">
      <PageHeader title="Notifications" subtitle="Alerts" backTo="/" />

      <div className="flex-1 px-5 pt-4 pb-8 space-y-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Activity Updates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stay updated with your account transactions.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-accent-foreground bg-accent/20 px-2.5 py-1 rounded-sm hover:bg-accent/30 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground">No new notifications at this time.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border border-border transition-colors ${
                    n.unread ? "bg-accent/5 border-accent/20" : "bg-transparent"
                  }`}
                >
                  {/* Notification Icon Block */}
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  </div>
                  {n.unread && (
                    <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                clearAllNotifications();
                setNotifications([]);
              }}
              className="w-full rounded-full h-11 border-border text-muted-foreground hover:bg-muted/30 shadow-none transition-colors"
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
export default NotificationsPage;
