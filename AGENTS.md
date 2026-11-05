# Agent Guidelines

## Essentials

- Stack: TypeScript + React (TanStack Start), with Drizzle ORM, BoardUI, and Better Auth.
- Use the BoardUI CLI (`vpr ui add <component>`, `vpr ui list`) for adding new UI components & primitives. Components are copied into `src/components/base/` and `src/components/application/` (configured in `boardui.json`); merge classes with `cx` from `#/utils/cx`.
- Use `lucide-react` for UI icons (use `Icon` suffix, e.g. `import { Loader2Icon } from "lucide-react"`); BoardUI's own components ship with `@remixicon/react`, and either library works for `leadingIcon`/`trailingIcon` props. For brand icons use `@icons-pack/react-simple-icons` (e.g. `SiGithub`).
- Keep UI copy user-centered: describe outcomes and next actions concisely without exposing providers, internal states, or implementation details.
- Don't run a standalone build after every little change. Use `vpr lint` as the baseline and run the narrowest relevant tests described in the testing guidelines; `vpr test:e2e` performs its own production build.
- For running scripts, use `vpr`, which is a shorthand for `vp run`.
- Treat `.env.schema` as the environment-variable source of truth. In application code, import `ENV` from `varlock/env` instead of reading `process.env` directly. Never read local env files; validate safely with `vp exec varlock load --agent`.

## Code style

- Prefer straightforward solutions for current requirements. Introduce abstractions, generic utilities, extensibility, or architectural layers only when there is a concrete need.
- Keep the main control flow easy to follow. Avoid wrapper layers that merely rename or forward calls and fragmentation that creates unnecessary jumps between files or functions.
- Extract helpers only when they meaningfully improve readability, reuse, or testability.
- Keep types simple and close to where they are used. Prefer inference and avoid type gymnastics unless necessary.
- Be robust at system boundaries such as user input, auth, external APIs, and persistence. Within trusted boundaries, rely on established invariants instead of guarding against hypothetical states.
- Handle edge cases in proportion to their likelihood and impact. Avoid adding complexity for contrived, extremely unlikely, low-impact scenarios outside normal supported use, while preserving applicable security and data-integrity requirements.
- Add concise comments only for non-obvious intent, unusual edge cases, and important constraints. Briefly explain why, not what.

## Topic-specific Guidelines

- [Data flow](.agents/data-flow.md) - TanStack Start/Router + Query data loading, cache behavior, mutations, and server boundaries
- [Auth patterns](.agents/auth.md) - Route guards, middleware, auth utilities
- [Database conventions](.agents/database.md) - Drizzle column types and generated Better Auth schema ownership
- [Observability](.agents/observability.md) - evlog request context, structured errors, and safe event logging for server-side features
- [Testing](.agents/testing.md) - What to test, Vitest/Playwright boundaries, commands
- [TypeScript conventions](.agents/typescript.md) - Casting rules, prefer type inference
- [Workflow](.agents/workflow.md) - Workflow commands, validation approach

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `vpx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `vpx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

<!-- boardui:rules:start -->

# BoardUI design rules

This project uses BoardUI (React + Tailwind CSS v4, source-owned components under `components/`). These rules always apply when writing UI code. MCP tools are on demand; these rules are not optional context.

## Components first

- Before hand-building any UI element, check for an installed BoardUI component under `components/base/` and `components/application/`, and prefer it.
- Missing a component? Install it (BoardUI MCP `install_components`, or `npx boardui@latest add <name>`) instead of writing a lookalike.
- Import through the aliases configured in `boardui.json`, e.g. `import { Button } from "#/components/base/buttons/button"`.

## Color: semantic tokens only

- Never use raw palette classes (`text-gray-500`, `bg-white`, `border-neutral-200`) or hex/oklch literals. Every color rides a BoardUI semantic token, which also makes dark mode automatic.
- Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-placeholder`, errors `text-text-error-primary`.
- Surfaces: `bg-background-primary-default`, `bg-background-secondary-default` / `-hover`, `bg-background-tertiary-default`, page ground `bg-background-full`.
- Borders: `border-border-button-default` / `-hover`, hairlines `border-separator-border`, tables `border-border-table`, errors `border-border-error-default`.
- Icons: `text-foreground-icon-primary` through `text-foreground-icon-quaternary`.
- Charts: the `chart-1` … `chart-5` tokens (plus `-active` variants). CTAs and selection states: the `accent-50` … `accent-950` ramp.
- Dark mode flips tokens via the `.dark` class on `<html>`. Do not write `dark:` overrides with raw colors; if a token pair looks wrong in dark mode, pick a different token, not a literal.

## Typography: composite utilities only

- Use BoardUI's composite type utilities: `text-title-1-medium`, `text-title-2-medium`, `text-title-3-semibold`, `text-headline-medium`, `text-body-medium`, `text-body-regular`, `text-body-2-*`, `text-caption-1-semibold`, and friends. Each sets size, weight, line-height, and letter-spacing together.
- Never rebuild type by stacking `text-sm font-medium leading-5`; if a style seems missing, look in `styles/typography.css` before inventing one.

## Spacing and shape

- Stay on Tailwind's spacing scale (`gap-2`, `p-4`, `mt-6`); prefer flex/grid `gap` over per-child margins. Arbitrary values (`p-[13px]`) only when matching an existing BoardUI component exactly.
- Cards and panels: `rounded-3xl` with `border-border-button-default`. Inputs and menu rows: `rounded-md` to `rounded-xl`. Pills: `rounded-full`.

## Mechanics

- Direction: wrap the app (or a mixed-language region) in `DirectionProvider` from `#/components/foundations/direction/direction`, with an explicit BCP 47 `locale` (`ar`, `he`, `en-US`, `zh-CN`). Set matching `lang` and `dir` on `<html>` for full-app RTL. CSS `dir` alone does not configure React Aria keyboard navigation or portal placement. Use `useDirection()` for custom interactions and put its value on custom portal roots.
- Use logical styles: `ms`/`me`, `ps`/`pe`, `start`/`end`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`, and inline logical CSS properties. Mirror navigation/disclosure glyphs and horizontal drawer motion in RTL. Preserve physical coordinates for measured geometry, charts, canvas, and decorative art. Keep code, OTP digits, email addresses and URLs in explicit LTR regions; isolate mixed text with `<bdi>` or `dir="auto"`. Translating labels and formatting application data is separate from layout direction. See https://www.boardui.com/rtl.

- Internal vertical scroll regions must soften the top edge with a progressive blur and surface fade once scrolled, rather than sharply clipping content. Keep headers outside the scroll region. Use a stationary, `pointer-events-none`, `aria-hidden` overlay in a relative wrapper: a 24px masked 1px backdrop blur, a 16px masked 4px backdrop blur, and a gradient from the enclosing semantic surface token to transparent. Ramp each layer's opacity from 0 to 1 over the first 24px of scrolling; keep it invisible at scrollTop 0. Apply opacity to the individual layers, never the overlay parent (a translucent parent creates a backdrop root and can break blur at normal browser zoom). Verify top/reset, overflow, light/dark mode, and 100% zoom; preserve keyboard scrolling and do not blur the whole content area. The `scroll-fade` registry item ships this recipe as `ScrollFade` + `useScrollFade` (`#/components/foundations/scroll-fade/scroll-fade`); reuse it rather than rebuilding the layers.

- Merge classes with `cx()` from `#/utils/cx` (tailwind-merge aware of BoardUI's composite text styles). No string concatenation, no plain `clsx`.
- Icons come from `@remixicon/react`, passed as component references (`leadingIcon={RiAddLine}`), not rendered elements.
- Form components build on `react-aria-components`; extend the installed BoardUI form components rather than raw `<input>`/`<select>`.
- Focus states: `outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`.

When unsure about a token, a component's API, or working example code, ask the BoardUI MCP server: `get_theme`, `get_component`, `get_usage_examples`.
<!-- boardui:rules:end -->
