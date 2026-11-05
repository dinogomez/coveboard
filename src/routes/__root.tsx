import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";

import { THEME_STORAGE_KEY } from "#/components/application/theme/theme-toggle";
import { Toaster } from "#/components/base/toast/toast";

import appCss from "#/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        // scaffold:title
        title: "Cove Stack",
      },
      {
        name: "description",
        // scaffold:description
        content: "A minimal starter stack for 🏝️ TanStack Start.",
      },
    ],
    links: [
      // Replace with your icons here, or remove if you have a favicon.ico in public/
      {
        rel: "icon",
        href: "https://mugnavo.com/favicon.ico",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

// Restores BoardUI's persisted theme before first paint so a dark session
// never flashes light. BoardUI's ThemeToggle owns the key and the `.dark` class.
const themeScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    // suppress since the theme script toggles the "dark" class before hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>{themeScript}</ScriptOnce>
        {children}
        <Toaster />

        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            a11yDevtoolsPlugin(),
          ]}
        />

        <Scripts />
      </body>
    </html>
  );
}
