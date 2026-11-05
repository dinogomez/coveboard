import { createLink } from "@tanstack/react-router";

import { ButtonLink as AnchorButtonLink } from "#/components/base/buttons/button";

/** BoardUI's anchor-styled button, navigated by TanStack Router (`to`, `params`, preloading). */
export const ButtonLink = createLink(AnchorButtonLink);
