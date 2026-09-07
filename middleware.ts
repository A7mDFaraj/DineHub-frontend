import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all request paths except:
  // - Internal Next.js paths (_next)
  // - API routes (/api)
  // - Static files with extensions (e.g. favicon.ico, images, fonts)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
