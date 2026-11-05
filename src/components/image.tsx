import type { ImgHTMLAttributes } from "react";

import { cx } from "#/utils/cx";

/**
 * Stand-in for `next/image`, which the BoardUI templates import. Vite serves
 * `public/` as-is, so this is a plain <img> that honours the few Next props
 * the templates use (`fill`, `priority`, `unoptimized`).
 */
export default function Image({
  alt = "",
  fill,
  priority,
  unoptimized: _unoptimized,
  loading,
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
}) {
  return (
    <img
      alt={alt}
      loading={loading ?? (priority ? "eager" : "lazy")}
      fetchPriority={priority ? "high" : undefined}
      className={cx(fill && "absolute inset-0 size-full", className)}
      {...props}
    />
  );
}
