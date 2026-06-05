"use client";

import React from "react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
    >
      Download PDF
    </button>
  );
}
