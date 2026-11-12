"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ReceiptPrinter = dynamic(
  () => import("@/components/ui/receipt-printer").then((module) => module.ReceiptPrinter),
  { ssr: false },
);

type Props = React.ComponentProps<typeof ReceiptPrinter>;

/** Keep the reserved stage, but load the interactive demo only near the viewport. */
export function DeferredReceiptPrinter(props: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="h-full w-full" data-receipt-state={ready ? "ready" : "waiting"}>
      {ready ? (
        <ReceiptPrinter {...props} />
      ) : (
        <span className="sr-only">Démonstration du ticket de caisse</span>
      )}
    </div>
  );
}
