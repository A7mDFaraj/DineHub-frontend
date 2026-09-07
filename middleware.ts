import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  // If user previously chose English and request URL has no /en prefix, redirect to /en/...
  if (cookieLocale === "en" && !pathname.startsWith("/en")) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all request paths except:
  // - Internal Next.js paths (_next)
  // - API routes (/api)
  // - Static files with extensions (e.g. favicon.ico, images, fonts)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
