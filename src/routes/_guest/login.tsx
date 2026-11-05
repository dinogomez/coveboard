import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ENV } from "varlock/env";

import { Button } from "#/components/base/buttons/button";
import { Input, type InputProps } from "#/components/base/input/input";
import { Spinner } from "#/components/base/spinner/spinner";
import { toast } from "#/components/base/toast/toast";
import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";

export const Route = createFileRoute("/_guest/login")({
  component: LoginForm,
});

// Surface the browser's native validation message under the field.
const nativeErrorMessage: InputProps["errorMessage"] = ({ validationErrors }) =>
  validationErrors.join(" ");

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();

  const { mutate: emailLoginMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) =>
      await authClient.signIn.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.error("Could not log you in.", {
              description: error.message || "Check your details and try again.",
            });
          },
          // better-auth seems to trigger a hard navigation on login,
          // so we don't have to revalidate & navigate ourselves
          // onSuccess: () => {
          //   queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
          //   navigate({ to: redirectUrl });
          // },
        },
      ),
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) return;

    emailLoginMutate({ email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-text-secondary">Enter your details to access your account.</p>
      </div>
      <form onSubmit={handleSubmit} aria-busy={isPending}>
        <div className="flex flex-col gap-6">
          <DeleteMeDemoAccount />
          <div className="flex flex-col gap-5">
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="hello@example.com"
              autoComplete="email"
              isReadOnly={isPending}
              isRequired
              errorMessage={nativeErrorMessage}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              isReadOnly={isPending}
              isRequired
              errorMessage={nativeErrorMessage}
            />
            <Button type="submit" className="mt-2 w-full" disabled={isPending}>
              <span className="flex items-center gap-1.5">
                {isPending && <Spinner size="sm" className="text-current" aria-hidden />}
                {isPending ? "Logging in..." : "Log in"}
              </span>
            </Button>
          </div>
          <SocialSignInButtons callbackURL={redirectUrl} disabled={isPending} />
        </div>
      </form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
    </div>
  );
}

/**
 * TODO: Delete this.
 * Demo credentials for the live deployment of the Cove Stack template on which this project is based.
 */
function DeleteMeDemoAccount() {
  if (new URL(ENV.VITE_BASE_URL).origin !== "https://cove.mugnavo.com") return null;

  return (
    <div className="rounded-md border border-dashed border-border-button-default bg-background-secondary-default/50 p-3 text-sm">
      <p className="text-xs text-text-secondary">Demo account credentials</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-text-secondary">Email</dt>
        <dd>
          <code className="select-all">demo@mugnavo.com</code>
        </dd>
        <dt className="text-text-secondary">Password</dt>
        <dd>
          <code className="select-all">demo1234</code>
        </dd>
      </dl>
    </div>
  );
}
