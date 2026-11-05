import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Button } from "#/components/base/buttons/button";
import { Input, type InputProps } from "#/components/base/input/input";
import { Spinner } from "#/components/base/spinner/spinner";
import { toast } from "#/components/base/toast/toast";
import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";

export const Route = createFileRoute("/_guest/signup")({
  component: SignupForm,
});

// Surface the browser's native validation message under the field.
const nativeErrorMessage: InputProps["errorMessage"] = ({ validationErrors }) =>
  validationErrors.join(" ");

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: signupMutate, isPending } = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      await authClient.signUp.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.error("Could not create your account.", {
              description: error.message || "Check your details and try again.",
            });
          },
          onSuccess: () => {
            queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
            navigate({ to: redirectUrl });
          },
        },
      );
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string" ||
      !name ||
      !email ||
      !password ||
      !confirmPassword
    )
      return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.", {
        description: "Re-enter the same password in both fields.",
      });
      return;
    }

    signupMutate({ name, email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-text-secondary">Start with a few basic details.</p>
      </div>
      <form onSubmit={handleSubmit} aria-busy={isPending}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <Input
              label="Name"
              name="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              isReadOnly={isPending}
              isRequired
              errorMessage={nativeErrorMessage}
            />
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
              placeholder="Create a password"
              autoComplete="new-password"
              isReadOnly={isPending}
              isRequired
              errorMessage={nativeErrorMessage}
            />
            <Input
              label="Confirm Password"
              name="confirm_password"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              isReadOnly={isPending}
              isRequired
              errorMessage={nativeErrorMessage}
            />
            <Button type="submit" className="mt-2 w-full" disabled={isPending}>
              <span className="flex items-center gap-1.5">
                {isPending && <Spinner size="sm" className="text-current" aria-hidden />}
                {isPending ? "Signing up..." : "Sign up"}
              </span>
            </Button>
          </div>
          <SocialSignInButtons callbackURL={redirectUrl} disabled={isPending} />
        </div>
      </form>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </div>
    </div>
  );
}
