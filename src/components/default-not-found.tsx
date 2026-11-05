import { Button } from "#/components/base/buttons/button";
import { ButtonLink } from "#/components/button-link.tsx";

export function DefaultNotFound() {
  return (
    <div className="space-y-2 p-2">
      <p>The page you are looking for does not exist.</p>
      <p className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => window.history.back()}>
          Go back
        </Button>
        <ButtonLink to="/" variant="secondary">
          Home
        </ButtonLink>
      </p>
    </div>
  );
}
