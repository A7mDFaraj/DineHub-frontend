"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HeaderState = "top" | "visible" | "hidden";

type SmartHeaderProps = {
  children: ReactNode;
};

export function SmartHeader({ children }: SmartHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let previousY = window.scrollY;
    let directionAnchor = previousY;
    let direction: "up" | "down" = "up";
    let state: HeaderState = previousY <= 32 ? "top" : "visible";
    let frame = 0;

    const setHeaderState = (nextState: HeaderState) => {
      if (state === nextState) return;
      state = nextState;
      header.dataset.scrollState = nextState;
    };

    const updateHeader = () => {
      frame = 0;
      const currentY = Math.max(window.scrollY, 0);
      const nextDirection = currentY >= previousY ? "down" : "up";

      if (currentY <= 32) {
        setHeaderState("top");
        directionAnchor = currentY;
      } else if (
        header.contains(document.activeElement) ||
        header.querySelector("details[open]")
      ) {
        setHeaderState("visible");
      } else {
        if (nextDirection !== direction) {
          direction = nextDirection;
          directionAnchor = currentY;
        }

        if (direction === "down" && currentY > 140 && currentY - directionAnchor >= 18) {
          setHeaderState("hidden");
        } else if (direction === "up" && directionAnchor - currentY >= 10) {
          setHeaderState("visible");
        }
      }

      previousY = currentY;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateHeader);
    };

    const revealHeader = () => setHeaderState(window.scrollY <= 32 ? "top" : "visible");

    header.dataset.scrollState = state;
    window.addEventListener("scroll", handleScroll, { passive: true });
    header.addEventListener("focusin", revealHeader);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      header.removeEventListener("focusin", revealHeader);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={headerRef} className="site-header" data-scroll-state="top">
      {children}
    </header>
  );
}
