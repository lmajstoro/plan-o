import { useEffect, type ReactNode } from "react";
import { useLockPageScroll } from "../../lib/scrollLock";
import { CloseIcon } from "../icons";

type ModalSize = "md" | "lg" | "xl" | "full";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  size?: ModalSize;
};

const WIDTH: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  full: "max-w-7xl",
};

export function Modal({ title, children, onClose, wide, size }: ModalProps) {
  useLockPageScroll();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resolved: ModalSize = size ?? (wide ? "lg" : "md");
  const tall = resolved !== "md";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Zatvori" onClick={onClose} />
      <div className={`relative w-full rounded-xl bg-white shadow-xl ${WIDTH[resolved]}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className={`${tall ? "max-h-[min(92vh,58rem)]" : "max-h-[min(80vh,36rem)]"} overflow-y-auto px-6 py-5`} data-allow-scroll>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Obriši",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Odustani
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
