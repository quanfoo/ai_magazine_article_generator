const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "UTC";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE
  }).format(new Date(value));
}
