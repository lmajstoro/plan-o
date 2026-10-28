import { useEffect, useRef, useState } from "react";

const SCREEN_WIDTH = 1180;
const SCREEN_HEIGHT = 820;
const BEZEL = 18;
const FRAME_WIDTH = SCREEN_WIDTH + BEZEL * 2;
const FRAME_HEIGHT = SCREEN_HEIGHT + BEZEL * 2;

export function TabletPreviewPage() {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = areaRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(1, width / FRAME_WIDTH, height / FRAME_HEIGHT));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tablet prikaz</h1>
        <p className="text-slate-500">
          Plan rada na tabletu u položenom načinu (1180 × 820). Na pravom tabletu otvara se automatski. Mišem radi isto kao prstom:
          klik označi blok, zatim ga povuci ili povuci ručke; dugi pritisak na prazno mjesto i povlačenje bira raspon.
        </p>
      </div>
      <div ref={areaRef} className="flex min-h-0 flex-1 items-start justify-center">
        <div style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}>
          <div
            className="origin-top-left rounded-[36px] bg-slate-900 shadow-2xl"
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, padding: BEZEL, transform: `scale(${scale})` }}
          >
            <iframe
              title="Tablet prikaz"
              src="/administrator/tablet"
              className="block rounded-[18px] border-0 bg-white"
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
