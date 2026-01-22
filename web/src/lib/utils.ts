type ClassValue = string | number | null | undefined | false

// Simple classNames helper (avoids external deps)
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}
