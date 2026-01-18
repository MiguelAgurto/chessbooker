"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Do I need to pay to use ChessBooker during the pilot?",
    answer:
      "No. The pilot is completely free. We're looking for feedback from real coaches to improve the product before launch.",
  },
  {
    question: "What happens if Google Calendar fails during a booking?",
    answer:
      "Your booking still goes through. Calendar and Meet link creation are attempted, but failures never block the booking. Emails are still sent, and you can manually create a meeting link if needed.",
  },
  {
    question: "Can students see my full calendar?",
    answer:
      "No. Students only see the availability windows you explicitly set in your schedule. Your actual Google Calendar events remain private.",
  },
  {
    question: "How do students pay for lessons?",
    answer:
      "Payments are not yet implemented. Currently, you handle payment collection outside of ChessBooker. Stripe integration for pay-before-accept is on the roadmap.",
  },
  {
    question: "Can I use ChessBooker without connecting Google Calendar?",
    answer:
      "Yes. Google Calendar integration is optional. Without it, bookings work normally — you just won't get automatic calendar events and Meet links.",
  },
  {
    question: "What information do students provide when booking?",
    answer:
      "Students provide their name, email, timezone, preferred time slots, and session duration. This information is stored securely and shared with you when they submit a request.",
  },
  {
    question: "Can I reschedule or cancel a booking after accepting it?",
    answer:
      "Yes. You can reschedule to a new time or cancel entirely. Both actions update the Google Calendar event (if connected) and send notification emails to the student.",
  },
  {
    question: "Is my Google account data secure?",
    answer:
      "Yes. We only request calendar access (not email or other data). Refresh tokens are stored encrypted and used server-side only. You can disconnect anytime from Settings.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="card overflow-hidden">
          <button
            onClick={() => toggle(index)}
            className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-cb-bg transition-colors"
          >
            <span className="font-medium text-cb-text">{faq.question}</span>
            <svg
              className={`w-5 h-5 text-cb-text-muted flex-shrink-0 transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === index ? "max-h-96" : "max-h-0"
            }`}
          >
            <div className="px-5 pb-4 text-cb-text-secondary text-sm leading-relaxed">
              {faq.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
