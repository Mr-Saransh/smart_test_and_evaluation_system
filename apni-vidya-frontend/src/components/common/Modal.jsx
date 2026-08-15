import React from "react";
import { CloseIcon } from "./Icons";

/**
 * Modal — viewport-safe dialog with scrollable body and sticky footer.
 *
 * Props:
 *  - isOpen:   boolean
 *  - onClose:  () => void
 *  - title:    string (optional)
 *  - children: modal body content (scrollable)
 *  - footer:   ReactNode (optional, renders in a sticky footer below body)
 *  - maxWidth: number|string (default 520)
 *  - className: extra className on .modal-content (e.g. "modal-lg")
 */
export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 520, className = "" }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${className}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button
              className="modal-close"
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
    </div>
  );
}

export default Modal;
