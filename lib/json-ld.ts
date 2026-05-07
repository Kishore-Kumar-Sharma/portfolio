// Built with String.fromCharCode + split/join so no raw separator chars exist in source.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/**
 * Serialize an object for safe inclusion inside an HTML `<script>` tag.
 * Escapes `<`, `>`, `&` and the U+2028/U+2029 line separators that JSON
 * permits but JavaScript treats as line terminators inside strings.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
}
