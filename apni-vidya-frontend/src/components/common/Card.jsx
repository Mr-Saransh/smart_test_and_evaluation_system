import React from "react";

export function Card({ children, className = "", style = {}, ...props }) {
  return (
    <div className={`card ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
}
export default Card;
