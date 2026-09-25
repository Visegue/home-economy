export const memberColors = [
  { name: "Plommon", value: "#85466b" },
  { name: "Blå", value: "#356b9b" },
  { name: "Grön", value: "#36735b" },
  { name: "Gul", value: "#95621c" },
  { name: "Röd", value: "#ad4556" },
  { name: "Turkos", value: "#287a80" },
] as const;

export const defaultMemberColor = memberColors[0].value;

export interface HouseholdPerson {
  id: number;
  name: string;
  color: string;
}

export function memberInitials(name: string) {
  const words = name.normalize("NFC").match(/[\p{L}\p{N}]+/gu) ?? [];
  const firstWord = words[0];
  if (!firstWord) return "?";
  const first = Array.from(firstWord);
  const initials =
    words.length === 1
      ? first.slice(0, 2).join("")
      : first[0] + Array.from(words.at(-1) ?? firstWord)[0];
  return Array.from(initials.toLocaleUpperCase("sv-SE")).slice(0, 2).join("");
}

export function memberTextColor(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? "#000000" : "#ffffff";
}
