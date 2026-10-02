/**
 * Convert arbitrary values (appData, dumps, stats) into something that can be
 * sent over the wire: no cycles, no functions, bounded depth and size.
 * appData in particular often holds sockets or peer objects.
 */
export const toPlain = (value: unknown, maxDepth = 6): unknown => {
  const seen = new WeakSet<object>();

  const walk = (v: unknown, depth: number): unknown => {
    if (v === null || v === undefined) return v;

    switch (typeof v) {
      case "string":
        return v.length > 2000 ? `${v.slice(0, 2000)}…` : v;
      case "number":
      case "boolean":
        return v;
      case "bigint":
        return v.toString();
      case "function":
        return `[Function${v.name ? ` ${v.name}` : ""}]`;
      case "symbol":
        return v.toString();
    }

    const obj = v as object;
    if (seen.has(obj)) return "[Circular]";
    if (obj instanceof Date) return obj.toISOString();
    if (Buffer.isBuffer(obj)) return `[Buffer ${obj.length} bytes]`;
    if (depth >= maxDepth) return Array.isArray(obj) ? "[Array]" : "[Object]";

    seen.add(obj);
    try {
      if (Array.isArray(obj)) {
        const items = obj.slice(0, 200).map((item) => walk(item, depth + 1));
        if (obj.length > 200) items.push(`… ${obj.length - 200} more`);
        return items;
      }
      if (obj instanceof Map) {
        return walk(Object.fromEntries(obj), depth);
      }
      if (obj instanceof Set) {
        return walk([...obj], depth);
      }

      const proto = Object.getPrototypeOf(obj);
      if (proto !== Object.prototype && proto !== null && depth > 0) {
        // Class instances (sockets, peers, mediasoup objects…) are summarised
        // instead of walked: they are usually huge and full of internals.
        const name = proto?.constructor?.name ?? "Object";
        const id = (obj as { id?: unknown }).id;
        return typeof id === "string" || typeof id === "number"
          ? `[${name} ${id}]`
          : `[${name}]`;
      }

      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(obj)) {
        out[key] = walk(item, depth + 1);
      }
      return out;
    } finally {
      seen.delete(obj);
    }
  };

  try {
    return walk(value, 0);
  } catch {
    return "[Unserializable]";
  }
};

/** Flatten primitive leaves of a plain object into dotted paths. */
export const flatten = (
  value: unknown,
  prefix = "",
  out: Array<[string, string]> = []
): Array<[string, string]> => {
  if (value === null || value === undefined) return out;

  if (typeof value !== "object") {
    out.push([prefix, String(value)]);
    return out;
  }

  for (const [key, item] of Object.entries(value as object)) {
    flatten(item, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
};
