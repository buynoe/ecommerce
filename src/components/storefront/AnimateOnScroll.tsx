"use client";
import { useEffect, useRef, CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right" | "fade";
}

const initial: Record<NonNullable<Props["from"]>, string> = {
  bottom: "translateY(40px)",
  left:   "translateX(-40px)",
  right:  "translateX(40px)",
  fade:   "translateY(0px)",
};

export default function AnimateOnScroll({ children, className = "", delay = 0, from = "bottom" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "none";
          ob.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const style: CSSProperties = {
    opacity: 0,
    transform: initial[from],
    transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
  };

  return <div ref={ref} className={className} style={style}>{children}</div>;
}
