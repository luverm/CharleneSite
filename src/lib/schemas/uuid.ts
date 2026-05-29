import { z } from "zod";

// Permissive UUID format check. Accepts any hex string with the right
// dash layout — including UUIDs whose version nibble is 0, which our
// seed (00000000-0000-0000-0000-000000000001) relies on. Zod v4's
// built-in `.uuid()` rejects those because it strictly enforces the
// version field (1–8) per RFC 9562, breaking compatibility with our
// seeded staff id.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidString = () => z.string().regex(UUID_RE, "Invalid UUID");
