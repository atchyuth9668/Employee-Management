export type ClassValue = string | number | null | undefined | false | Record<string, boolean | undefined | null> | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (val: ClassValue): void => {
    if (!val && val !== 0) return;
    if (typeof val === 'string' || typeof val === 'number') {
      out.push(String(val));
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    } else if (typeof val === 'object') {
      for (const key of Object.keys(val)) {
        if (val[key]) out.push(key);
      }
    }
  };
  inputs.forEach(walk);
  return out.join(' ');
}