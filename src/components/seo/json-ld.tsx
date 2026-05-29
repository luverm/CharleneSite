/**
 * Renders a JSON-LD <script>. `data` must be plain, serialisable values
 * (no user HTML) — it's stringified, not rendered as markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
