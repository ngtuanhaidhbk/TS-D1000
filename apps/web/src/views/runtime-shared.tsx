export function statusClassName(value: string) {
  const safe = value.toLowerCase();
  return `status-pill status-${safe}`;
}

