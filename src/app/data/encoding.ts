const BROKEN_UTF8_PATTERN = /\u00C3|\u00C2|\u00E2|\u00F0|\uFFFD/;

function repairMojibakeText(value: string) {
  if (!BROKEN_UTF8_PATTERN.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value).map((character) => character.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
}

export function repairEncodingValue<T>(value: T): T {
  if (typeof value === 'string') {
    return repairMojibakeText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => repairEncodingValue(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, repairEncodingValue(entry)]),
    ) as T;
  }

  return value;
}
