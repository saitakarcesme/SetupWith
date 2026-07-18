"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

interface TextSegment {
  text: string;
  muted: boolean;
  breakBefore: boolean;
}

type TypingHeadlineProps = ComponentPropsWithoutRef<"h1">;
type AnimationPhase = "hold" | "delete" | "restart" | "type";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectSegments(node: ReactNode, muted = false, breakBefore = false): TextSegment[] {
  const segments: TextSegment[] = [];
  let nextBreak = breakBefore;

  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      const text = normalizeText(String(child));
      if (text) {
        segments.push({ text, muted, breakBefore: nextBreak });
        nextBreak = false;
      }
      return;
    }

    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (child.type === "br") {
      nextBreak = true;
      return;
    }

    const childSegments = collectSegments(
      child.props.children,
      muted || child.type === "span",
      nextBreak,
    );
    segments.push(...childSegments);
    if (childSegments.length > 0) nextBreak = false;
  });

  return segments;
}

function renderSegments(segments: readonly TextSegment[], visibleCharacters: number, keyPrefix: string) {
  let remaining = visibleCharacters;

  return segments.flatMap((segment, index) => {
    if (remaining <= 0) return [];
    const visibleText = segment.text.slice(0, remaining);
    remaining -= visibleText.length;
    if (!visibleText) return [];

    const content = segment.muted
      ? <span className="typing-headline-muted" key={`${keyPrefix}-text-${index}`}>{visibleText}</span>
      : visibleText;

    return segment.breakBefore
      ? [<br key={`${keyPrefix}-break-${index}`} />, content]
      : [content];
  });
}

/**
 * Keeps the complete heading in the server-rendered accessibility tree while
 * a layout-stable visual layer types, deletes, and repeats the same text.
 */
export function TypingHeadline({ className, children, ...props }: TypingHeadlineProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const segments = useMemo(() => collectSegments(children), [children]);
  const totalCharacters = useMemo(
    () => segments.reduce((total, segment) => total + segment.text.length, 0),
    [segments],
  );
  const accessibleText = useMemo(
    () => segments.map((segment) => `${segment.breakBefore ? " " : ""}${segment.text}`).join(""),
    [segments],
  );
  const [visibleCharacters, setVisibleCharacters] = useState(totalCharacters);
  const [phase, setPhase] = useState<AnimationPhase>("hold");
  const [isVisible, setIsVisible] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const classes = ["typing-headline", className].filter(Boolean).join(" ");

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncMotionPreference() {
      if (motionPreference.matches) {
        setShouldAnimate(false);
        setVisibleCharacters(totalCharacters);
        setPhase("hold");
        return;
      }

      setVisibleCharacters(0);
      setPhase("type");
      setShouldAnimate(true);
    }

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);
    return () => motionPreference.removeEventListener("change", syncMotionPreference);
  }, [totalCharacters]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldAnimate || !isVisible || totalCharacters === 0) {
      return;
    }

    const delay = phase === "hold"
      ? 1_650
      : phase === "restart"
        ? 420
        : phase === "delete"
          ? 38
          : 72;

    const timeout = window.setTimeout(() => {
      if (phase === "hold") {
        setPhase("delete");
        return;
      }
      if (phase === "delete") {
        if (visibleCharacters > 0) setVisibleCharacters((count) => Math.max(0, count - 1));
        else setPhase("restart");
        return;
      }
      if (phase === "restart") {
        setPhase("type");
        return;
      }
      if (visibleCharacters < totalCharacters) {
        setVisibleCharacters((count) => Math.min(totalCharacters, count + 1));
      } else {
        setPhase("hold");
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isVisible, phase, shouldAnimate, totalCharacters, visibleCharacters]);

  return (
    <h1 aria-label={accessibleText} className={classes} ref={headingRef} {...props}>
      <span className="typing-headline-stage" aria-hidden="true">
        <span className="typing-headline-reserve">
          {renderSegments(segments, totalCharacters, "reserve")}
          <span className="typing-headline-cursor-placeholder" />
        </span>
        <span className="typing-headline-live">
          {renderSegments(segments, visibleCharacters, "live")}
          <span className="typing-headline-cursor" />
        </span>
      </span>
    </h1>
  );
}
