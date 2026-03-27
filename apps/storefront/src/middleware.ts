import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The apex domain — subdomains of this are treated as store slugs.
// Set NEXT_PUBLIC_ROOT_DOMAIN=zansify.com in your Vercel env vars.
const ROOT_DOMAIN = process.env["NEXT_PUBLIC_ROOT_DOMAIN"] ?? "zansify.com";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") ?? "";
  // Strip port (useful in local dev)
  const host = hostname.split(":")[0]!;

  // Ignore static assets, Next internals, and favicon
  const { pathname } = url;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Only rewrite for real subdomains, not www or the apex itself
  const isSubdomain =
    host.endsWith(`.${ROOT_DOMAIN}`) &&
    host !== `www.${ROOT_DOMAIN}` &&
    host !== ROOT_DOMAIN;

  if (isSubdomain) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1)); // strip ".zansify.com"
    // Rewrite transparently — browser URL stays "slug.zansify.com/products"
    // but Next.js internally serves "/[slug]/products"
    url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
