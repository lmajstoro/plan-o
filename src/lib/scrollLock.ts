import { useEffect } from "react";

let lockCount = 0;
let scrollY = 0;

function applyLock() {
  scrollY = window.scrollY;
  const { body, documentElement } = document;
  documentElement.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
}

function releaseLock() {
  const { body, documentElement } = document;
  documentElement.style.overflow = "";
  body.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  window.scrollTo(0, scrollY);
}

export function useLockPageScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    if (lockCount === 1) applyLock();

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-allow-scroll]")) return;
      event.preventDefault();
    };
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-allow-scroll]")) return;
      event.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("wheel", onWheel);
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [active]);
}
