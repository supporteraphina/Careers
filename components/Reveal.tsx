'use client';

// Scroll-entrance wrapper. Content is fully visible without JS; when the
// element enters the viewport the .is-in class plays a one-shot entrance
// animation (see .reveal rules in globals.css). Honors reduced motion via
// the CSS media query, so no logic is needed here.

import { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger slot 0-3; maps to animation-delay in CSS. */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
}

export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${inView ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      data-delay={delay || undefined}
    >
      {children}
    </div>
  );
}
