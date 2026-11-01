import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (for production use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = {
  "/api/auth/send-code": 3, // 3 requests per minute for sending codes
  "/api/payments/webhook": 20, // 20 webhooks per minute
  "/api/payments/paymob": 10, // 10 payment requests per minute
  default: 60, // 60 requests per minute for other API routes
};

function getRateLimit(pathname: string): number {
  return MAX_REQUESTS[pathname as keyof typeof MAX_REQUESTS] || MAX_REQUESTS.default;
}

function checkRateLimit(identifier: string, limit: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting only to API routes
  if (pathname.startsWith("/api/")) {
    // Use IP + pathname as identifier
    const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
    const identifier = `${ip}:${pathname}`;
    const limit = getRateLimit(pathname);

    if (!checkRateLimit(identifier, limit)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }
  }

  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all API routes
     */
    "/api/:path*",
  ],
};
