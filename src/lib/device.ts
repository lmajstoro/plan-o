import { useEffect, useState } from "react";

export type DeviceMode = "desktop" | "tablet" | "tablet-portrait";

const TABLET_MIN_SHORT_SIDE = 600;

function detect(): DeviceMode {
  if (typeof window === "undefined") return "desktop";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (!coarse || shortSide < TABLET_MIN_SHORT_SIDE) return "desktop";
  return window.innerHeight > window.innerWidth ? "tablet-portrait" : "tablet";
}

/** Touch device with a tablet-sized screen; phones fall through to "desktop" and keep the existing small-screen message. */
export function useDeviceMode(): DeviceMode {
  const [mode, setMode] = useState<DeviceMode>(detect);

  useEffect(() => {
    const onChange = () => setMode(detect());
    const pointer = window.matchMedia("(pointer: coarse)");
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    pointer.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      pointer.removeEventListener("change", onChange);
    };
  }, []);

  return mode;
}
