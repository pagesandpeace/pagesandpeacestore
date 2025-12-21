"use client";

import { useEffect, useRef } from "react";

export default function ChartWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Force a resize event when the wrapper becomes visible.
    const ro = new ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
