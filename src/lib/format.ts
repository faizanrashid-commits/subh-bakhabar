/**
 * SUBH BAKHABAR — Editorial Formatting Utilities
 */

export function toRomanNumeral(num: number): string {
  if (num <= 0) return "I";
  const lookup: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let roman = "";
  let remaining = num;
  for (const [val, sym] of lookup) {
    while (remaining >= val) {
      roman += sym;
      remaining -= val;
    }
  }
  return roman || "I";
}

export function formatEditionDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

