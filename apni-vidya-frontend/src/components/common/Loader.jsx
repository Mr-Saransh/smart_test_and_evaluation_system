import React from "react";

export function Loader({ message = "Loading..." }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
      <p className="empty">{message}</p>
    </div>
  );
}
export default Loader;
