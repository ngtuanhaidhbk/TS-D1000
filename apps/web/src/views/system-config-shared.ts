export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function statusClassName(
  value: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'PASSED' | 'WARNING' | 'MANUAL' | 'AUTOMATIC',
) {
  return `status-pill status-${value.toLowerCase()}`;
}

