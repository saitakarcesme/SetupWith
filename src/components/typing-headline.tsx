import type { ComponentPropsWithoutRef } from "react";

type TypingHeadlineProps = ComponentPropsWithoutRef<"h1">;

/**
 * Keeps the complete heading server-rendered while CSS adds a stepped reveal.
 * The h1 owns its final dimensions from the first paint, so the effect cannot
 * move the surrounding layout or hide the label from assistive technology.
 */
export function TypingHeadline({ className, children, ...props }: TypingHeadlineProps) {
  const classes = ["typing-headline", className].filter(Boolean).join(" ");

  return (
    <h1 className={classes} {...props}>
      {children}
    </h1>
  );
}
