import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Smartphone, Camera } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { UserProvider } from "../lib/UserContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" },
      { title: "Portfolio — Lumen" },
      { name: "description", content: "Track your investment portfolio, opportunities, and recent activity." },
      { property: "og:title", content: "Portfolio — Lumen" },
      { property: "og:description", content: "Track your investment portfolio, opportunities, and recent activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Portfolio — Lumen" },
      { name: "twitter:description", content: "Track your investment portfolio, opportunities, and recent activity." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b3ca947e-0a1f-4930-8682-e1ab1db5e1e0/id-preview-a0ddb47e--86543ace-8a00-42d1-95f4-108aaeeefb82.lovable.app-1784210866747.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b3ca947e-0a1f-4930-8682-e1ab1db5e1e0/id-preview-a0ddb47e--86543ace-8a00-42d1-95f4-108aaeeefb82.lovable.app-1784210866747.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [currentUrl, setCurrentUrl] = useState("https://lumen.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        {/* Desktop limitation screen */}
        <div className="hidden md:flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8 text-center">
          <div className="max-w-md space-y-6 flex flex-col items-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Mobile Only Experience</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Lumen is optimized exclusively for mobile devices. Please scan the QR code to open your account on your phone.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border w-fit shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`}
                alt="QR Code Scan"
                className="h-44 w-44"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-4 py-2 rounded-sm border border-border/50">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>Open your camera to scan</span>
            </div>
          </div>
        </div>

        {/* Render mobile view */}
        <div className="block md:hidden">
          <Outlet />
        </div>
      </UserProvider>
    </QueryClientProvider>
  );
}
