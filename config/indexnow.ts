// IndexNow ownership key. Public by design — the same value is served from
// /<key>.txt as proof of control over the host. Rotate by generating a new
// 32-char hex value, renaming public/<key>.txt, and updating this constant.
export const INDEXNOW_KEY = "e5297f032cbe96f746c19445df82fc5a";
