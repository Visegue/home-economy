export const memberColors = [
  { name: "Plommon", value: "#d5b8ca" },
  { name: "Lavendel", value: "#d6c6e5" },
  { name: "Skifferblå", value: "#b9c7df" },
  { name: "Blå", value: "#c2d8ea" },
  { name: "Turkos", value: "#b8d9d5" },
  { name: "Salvia", value: "#c5dcc4" },
  { name: "Oliv", value: "#d5ddba" },
  { name: "Gul", value: "#eee0ad" },
  { name: "Sand", value: "#ead4b5" },
  { name: "Persika", value: "#edc8b3" },
  { name: "Rosé", value: "#e6bfc5" },
  { name: "Rosa", value: "#e3cad5" },
] as const;

export const defaultMemberColor = memberColors[0].value;

export function memberColorForIndex(index: number) {
  return memberColors[index % memberColors.length].value;
}

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
