let helmetMiddleware = null;

// Use Helmet in a normal install. The local fallback keeps the API smoke tests
// executable in restricted environments where dependencies cannot be fetched.
try {
  const { default: helmet } = await import("helmet");
  helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "ws://localhost:5173", "ws://localhost:5174", "ws://localhost:5175"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
    noSniff: true,
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  });
} catch {
  // See safe fallback below. A full dependency installation includes Helmet.
}

export function securityHeaders(req, res, next) {
  if (helmetMiddleware) return helmetMiddleware(req, res, next);

  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws://localhost:5173 ws://localhost:5174 ws://localhost:5175; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}
