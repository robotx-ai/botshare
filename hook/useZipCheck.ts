"use client";

import { useEffect, useState } from "react";
import type { ZipData } from "@/lib/metro";

type Result = {
  zipData: ZipData | null;
  invalid: boolean;
  loading: boolean;
};

// Debounced zip validator. Calls GET /api/zip-check when zip is exactly 5
// digits; otherwise yields the "empty / neutral" state. Avoids shipping the
// full 120 KB zip dataset to the browser.
export default function useZipCheck(zip: string, debounceMs = 200): Result {
  const [zipData, setZipData] = useState<ZipData | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (zip.length !== 5) {
      setZipData(null);
      setInvalid(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/zip-check?zip=${zip}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((body: { serviceable: boolean; data: ZipData | null }) => {
          setZipData(body.data);
          setInvalid(!body.serviceable);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setZipData(null);
          setInvalid(false);
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [zip, debounceMs]);

  return { zipData, invalid, loading };
}
