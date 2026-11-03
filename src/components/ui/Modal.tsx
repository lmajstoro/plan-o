import { useEffect, type FormEvent, type ReactNode } from "react";
import { useLockPageScroll } from "../../lib/scrollLock";
import { CloseIcon } from "../icons";

type ModalSize = "message" | "form" | "picker";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
};

const FRAME: Record<ModalSize, string> = {
  message: "max-w-md",
  form: "h-[min(40rem,92vh)] max-w-3xl",
  picker: "h-[min(92vh,52rem)] max-w-6xl",
};

export function Modal({ title, children, onClose, size = "message" }: ModalProps) {
  useLockPageScroll();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fixed = size !== "message";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Zatvori" onClick={onClose} />
      <div className={`relative flex w-full flex-col rounded-xl bg-white shadow-xl ${FRAME[size]}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div
          className={
            fixed
              ? "flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5"
              : "max-h-[min(80vh,36rem)] overflow-y-auto px-6 py-5"
          }
          data-allow-scroll
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel = "Spremi",
  disabled = false,
}: {
  onCancel: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" className="btn-secondary" onClick={onCancel}>
        Odustani
      </button>
      <button type="submit" className="btn-primary" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}

export function ModalForm({
  onSubmit,
  onCancel,
  children,
  submitLabel = "Spremi",
  disabled = false,
}: {
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">{children}</div>
      <ModalActions onCancel={onCancel} submitLabel={submitLabel} disabled={disabled} />
    </form>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Obriši",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Odustani
        </button>
        <button type="button" className={tone === "danger" ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
