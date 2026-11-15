function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    try { cookies[key] = decodeURIComponent(raw); } catch { cookies[key] = raw; }
  }
  return cookies;
}

export function cookieParser(req, _res, next) {
  req.cookies = parseCookies(req.headers.cookie || "");
  next();
}

export function setCookie(res, name, value, { maxAge = 3600, httpOnly = true, secure = false, sameSite = "Lax", path = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${Math.max(0, Math.floor(maxAge))}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name, options = {}) {
  setCookie(res, name, "", { ...options, maxAge: 0 });
}
