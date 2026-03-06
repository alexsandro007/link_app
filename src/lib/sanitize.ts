import sanitizeHtml from 'sanitize-html';

// Strip ALL HTML tags and attributes — fields are plain text only.
// Converts e.g. '<script>alert(1)</script>hello' → 'hello'
const OPTS: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

/** Strip HTML from a required string field. */
export function sanitizeText(value: string): string {
  return sanitizeHtml(value, OPTS).trim();
}

/** Strip HTML from an optional string field (null/undefined pass through). */
export function sanitizeOptional(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  return sanitizeHtml(value, OPTS).trim() || null;
}

/** Strip HTML from every item of a string array (e.g. tags). */
export function sanitizeTags(tags: string[]): string[] {
  return tags.map((t) => sanitizeHtml(t, OPTS).trim()).filter(Boolean);
}

/**
 * Sanitize all plain-text string fields in a Record built for a DB update.
 * Mutates `updates` in-place — call this right before the Supabase query.
 */
export function sanitizeUpdatePayload(
  updates: Record<string, unknown>,
  textFields: string[],
  tagField = 'tags',
): void {
  for (const field of textFields) {
    if (typeof updates[field] === 'string') {
      updates[field] = sanitizeHtml(updates[field] as string, OPTS).trim() || null;
    }
  }
  if (Array.isArray(updates[tagField])) {
    updates[tagField] = (updates[tagField] as string[])
      .map((t) => sanitizeHtml(t, OPTS).trim())
      .filter(Boolean);
  }
}
