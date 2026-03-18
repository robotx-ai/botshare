"use client";

import React from "react";

function ListingCTA() {
  return (
    <div className="bg-black rounded-xl px-8 py-10 text-center mt-12">
      <h2 className="text-white text-2xl font-bold tracking-tight mb-2">
        Ready to deploy a robot for your event?
      </h2>
      <p className="text-neutral-400 text-sm mb-6">
        Tell us about your venue, audience size, and performance needs &mdash; we&apos;ll
        put together a custom package.
      </p>
      <a
        href="#"
        className="inline-block bg-white text-black text-sm font-semibold px-6 py-3 rounded-lg hover:bg-neutral-100 transition"
      >
        Contact BotSharing US
      </a>
    </div>
  );
}

export default ListingCTA;
