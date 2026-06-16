const stripDiacritics = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const buildSignupFullName = (firstName: string, lastName: string) =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

export const buildSignupLoginId = (firstName: string, lastName: string, fallback = "user") => {
  const normalized = [firstName, lastName]
    .map((value) =>
      stripDiacritics(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    )
    .filter(Boolean)
    .join("_");

  return (normalized || fallback).slice(0, 50);
};
