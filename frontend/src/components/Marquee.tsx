import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  speed?: number; // px per second
  gap?: number; // px between copies
};

export function Marquee({ children, className, speed = 40, gap = 16 }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(5);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content || !container) return;

    const measure = () => {
      const contentWidth = content.offsetWidth;
      const containerWidth = container.offsetWidth;

      if (contentWidth > containerWidth) {
        setShouldScroll(true);
        setDuration(contentWidth / speed);
      } else {
        setShouldScroll(false);
      }
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, speed]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden w-full", className)}>
      <div
        className="flex w-max"
        style={
          shouldScroll
            ? {
                animation: `marquee-scroll ${duration}s linear infinite`,
                gap: `${gap}px`,
              }
            : { gap: `${gap}px` }
        }
      >
        <div
          ref={contentRef}
          className="flex shrink-0"
          style={{ gap: `${gap}px` }}
        >
          {children}
        </div>
        {shouldScroll && (
          <div
            className="flex shrink-0"
            aria-hidden
            style={{ gap: `${gap}px` }}
          >
            {children}
          </div>
        )}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-50% - ${gap / 2}px)); }
        }
      `}</style>
    </div>
  );
}

export default Marquee;
