import React from "react";

export function Button({ children, variant = "primary", size = "normal", className = "", style = {}, ...props }) {
  const vClass = variant === "primary" ? "bp" : variant === "secondary" ? "bs" : variant === "danger" ? "bd" : variant === "success" ? "bg" : "";
  const sClass = size === "small" || size === "sm" ? "bsm" : "";
  return (
    <button className={`btn ${vClass} ${sClass} ${className}`.trim()} style={style} {...props}>
      {children}
    </button>
  );
}
export default Button;
