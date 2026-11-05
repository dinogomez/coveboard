import { useMutation } from "@tanstack/react-query";
import { ENV } from "varlock/env";

import { SOCIAL_PROVIDERS, SocialButton } from "#/components/base/social-button/social-button";
import { toast } from "#/components/base/toast/toast";
import { authClient } from "#/lib/auth/auth-client.ts";

interface SocialLoginButtonProps {
  provider: "github" | "google";
  disabled?: boolean;
  callbackURL: string;
}

function SignInSocialButton(props: SocialLoginButtonProps) {
  const providerLabel = SOCIAL_PROVIDERS[props.provider].label;

  const mutation = useMutation({
    mutationFn: async () =>
      await authClient.signIn.social(
        {
          provider: props.provider,
          callbackURL: props.callbackURL,
        },
        {
          onError: ({ error }) => {
            toast.error(`Could not continue with ${providerLabel}.`, {
              description: error.message || "Please try again.",
            });
          },
        },
      ),
  });

  return (
    <SocialButton
      brand={props.provider}
      appearance="white"
      fullWidth
      disabled={mutation.isSuccess || mutation.isPending || props.disabled}
      onClick={() => mutation.mutate()}
    />
  );
}

export function SocialSignInButtons({
  callbackURL,
  disabled,
}: Pick<SocialLoginButtonProps, "callbackURL" | "disabled">) {
  // TODO: Remove this. This is just for the demo deployment of Cove Stack, which this project is based on.
  const isPreviewDeployment = new URL(ENV.VITE_BASE_URL).origin === "https://cove.mugnavo.com";

  return (
    <>
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:border-t after:border-separator-border">
        <span className="relative z-10 bg-background-full px-2 text-text-secondary">Or</span>
      </div>
      <div className="grid gap-3">
        <SignInSocialButton provider="github" callbackURL={callbackURL} disabled={disabled} />
        <SignInSocialButton
          provider="google"
          callbackURL={callbackURL}
          disabled={disabled || isPreviewDeployment}
        />
      </div>
    </>
  );
}
