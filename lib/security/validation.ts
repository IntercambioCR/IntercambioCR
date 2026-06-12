import { categories, conditions } from "@/lib/constants";

const controlCharacters = /[\u0000-\u001F\u007F]/g;

export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(controlCharacters, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function formText(formData: FormData, key: string, maxLength = 500) {
  return cleanText(formData.get(key), maxLength);
}

export function positiveInteger(formData: FormData, key: string) {
  const raw = formText(formData, key, 20);
  if (!/^[1-9]\d*$/.test(raw)) {
    return 0;
  }

  return Number(raw);
}

export function signedInteger(formData: FormData, key: string) {
  const raw = formText(formData, key, 20);
  if (!/^-?[1-9]\d*$/.test(raw)) {
    return 0;
  }

  return Number(raw);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateUuid(value: string, label = "Identificador") {
  if (!isUuid(value)) {
    throw new Error(`${label} inválido.`);
  }
}

export function validateCategory(value: string) {
  if (!categories.includes(value as (typeof categories)[number])) {
    throw new Error("Elige una categoría válida.");
  }
}

export function validateCondition(value: string) {
  if (!conditions.includes(value as (typeof conditions)[number])) {
    throw new Error("Elige una condición válida.");
  }
}

export function validateImageFile(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = 8 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP.");
  }

  if (file.size > maxBytes) {
    throw new Error("Cada imagen debe pesar 8 MB o menos.");
  }
}

export function getImageFiles(formData: FormData, key: string, maxFiles = 6) {
  const files = formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > maxFiles) {
    throw new Error(`Puedes subir máximo ${maxFiles} imágenes.`);
  }

  files.forEach(validateImageFile);
  return files;
}
