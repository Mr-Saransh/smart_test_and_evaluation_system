import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icons";

/**
 * Modal — Viewport-safe, portalized dialog with scrollable body and sticky footer.
 * Renders into document.body to escape any container stacking contexts or animations.
 *
 * Props:
 *  - isOpen:    boolean
 *  - onClose:   () => void
 *  - title:     string (optional)
 *  - children:  modal body content (scrollable)
 *  - footer:    ReactNode (optional, renders in a sticky footer below body)
 *  - maxWidth:  number|string (optional)
 *  - className: extra className on .modal-content (e.g. "modal-lg", "modal-xl")
 *  - style:     extra style object for .modal-content
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth,
  className = "",
  style = {}
}) {
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose?.();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentStyle = {
    ...(maxWidth ? { maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth } : {}),
    ...style
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${className}`}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button
              className="btn-icon modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
