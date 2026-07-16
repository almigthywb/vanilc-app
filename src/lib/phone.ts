// Client-side phone normalization matching public.normalize_phone() in Postgres.
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  let digits = String(input).replace(/[^0-9]/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = "244" + digits;
  return digits;
}

export function formatCustomerNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return "#" + String(n).padStart(6, "0");
}

// Pretty display of a normalized/raw phone (defaults to Angolan grouping when 244…)
export function formatPhonePretty(input: string | null | undefined): string {
  const digits = normalizePhone(input);
  if (!digits) return "";
  if (digits.startsWith("244") && digits.length === 12) {
    const rest = digits.slice(3);
    return `+244 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  return "+" + digits;
}
