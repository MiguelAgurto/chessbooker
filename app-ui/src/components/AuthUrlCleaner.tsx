"use client";

import { useEffect } from "react";

export default function AuthUrlCleaner() {
  useEffect(() => {
    const hasAuthParams =
      window.location.search.includes("error=") ||
      window.location.hash.includes("error=");

    if (hasAuthParams) {
      window.history.replaceState(null, "", "/app");
    }
  }, []);

  return null;
}
