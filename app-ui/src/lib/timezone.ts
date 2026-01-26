/**
 * Format a datetime in a specific timezone for display
 */
export function formatInTimezone(
  datetime: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString("en-US", options || defaultOptions);
}

/**
 * Format just the time in a specific timezone
 */
export function formatTimeInTimezone(
  datetime: string | Date,
  timezone: string
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date and time for display in coach's timezone
 */
export function formatDateTimeForCoach(
  datetime: string | Date,
  timezone: string
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format full date for email/display
 */
export function formatFullDateTime(
  datetime: string | Date,
  timezone: string
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get relative date label (Today, Tomorrow, or formatted date)
 */
export function getRelativeDateLabel(
  datetime: string | Date,
  timezone: string
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;

  // Get today's date in the specified timezone
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { timeZone: timezone });

  // Get tomorrow's date in the specified timezone
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-US", { timeZone: timezone });

  // Get the target date in the specified timezone
  const targetStr = date.toLocaleDateString("en-US", { timeZone: timezone });

  if (targetStr === todayStr) {
    return "Today";
  }
  if (targetStr === tomorrowStr) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get relative time ago (e.g., "2 days ago", "3 weeks ago")
 * For dates within 30 days, shows relative time; otherwise shows formatted date
 */
export function getRelativeTimeAgo(
  datetime: string | Date,
  timezone: string
): string {
  const date = typeof datetime === "string" ? new Date(datetime) : datetime;
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 14) {
    return "1 week ago";
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks ago`;
  }

  // For older dates, show formatted date
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });
}
