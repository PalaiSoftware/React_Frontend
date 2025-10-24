import React from "react";

export default function Toast({ message, type }) {
  if (!message) return null;

  return (
    <div
      className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-md z-50 ${
        type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {message}
    </div>
  );
}
