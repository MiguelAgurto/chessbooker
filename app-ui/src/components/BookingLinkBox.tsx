"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function BookingLinkBox({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.chessbooker.com"}/c/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      inputRef.current?.select();
    }
  };

  const handleInputClick = () => {
    inputRef.current?.select();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 bg-cb-bg px-4 py-3 rounded-lg border border-cb-border-light cursor-text"
          onClick={handleInputClick}
        >
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={bookingUrl}
            onClick={handleInputClick}
            className="w-full bg-transparent text-sm text-cb-text outline-none cursor-text"
          />
        </div>
        <button
          onClick={handleCopy}
          className="p-3 rounded-lg border border-cb-border hover:border-coral hover:text-coral transition-colors"
          title="Copy link"
        >
          {copied ? (
            <svg className="w-5 h-5 fill-green-500" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          )}
        </button>
        <Link
          href={`/c/${slug}`}
          target="_blank"
          className="btn-primary"
        >
          Open
        </Link>
      </div>
      <p className="mt-3 text-sm text-cb-text-secondary">
        Share this link with students to book lessons
      </p>
    </>
  );
}
