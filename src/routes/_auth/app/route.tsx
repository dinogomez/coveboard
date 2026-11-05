import { createFileRoute, Outlet } from "@tanstack/react-router";

/** The chat screens under /app own the full viewport; auth is enforced by the _auth layout. */
export const Route = createFileRoute("/_auth/app")({
  component: Outlet,
});
