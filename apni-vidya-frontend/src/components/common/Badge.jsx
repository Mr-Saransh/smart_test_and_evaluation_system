import React from "react";

export function Badge({ children, bg = "var(--primary-light)", fg = "var(--primary)", style = {} }) {
  return (
    <span className="badge" style={{ background: bg, color: fg, ...style }}>
      {children}
    </span>
  );
}
export default Badge;
