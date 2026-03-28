import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  speed?: number; // px per second
  gap?: number; // px between copies
};

export function Marquee({ children, className, speed = 40, gap = 16 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(5);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const contentWidth = track.scrollWidth / 2;
    const containerWidth = track.parentElement?.clientWidth ?? 0;

    if (contentWidth > containerWidth) {
      setShouldScroll(true);
      setDuration(contentWidth / speed);
    } else {
      setShouldScroll(false);
    }
  }, [children, speed]);

  return (
    <div className={cn("overflow-hidden w-full", className)}>
      <div
        ref={trackRef}
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
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
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
