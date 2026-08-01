import React from "react";
import { CloseIcon } from "./Icons";

export function Modal({ isOpen, onClose, title, children, maxWidth = 420 }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card animate-modal"
        style={{
          maxWidth,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="fx" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="h2" style={{ marginBottom: 0 }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              aria-label="Close dialog"
            >
              <CloseIcon size={18} color="#64748B" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
