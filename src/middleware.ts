import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = new Set(["/", "/create-group", "/login", "/register", "/forgot-password", "/join"]);
const authEntryRoutes = new Set(["/login", "/register", "/forgot-password"]);

function stripBasePath(pathname: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

function appUrl(request: NextRequest, pathname: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return new URL(`${basePath}${pathname}`, request.url);
}

export function middleware(request: NextRequest) {
  const pathname = stripBasePath(request.nextUrl.pathname);
  const hasSession = Boolean(request.cookies.get("istanbul_quest_session"));
  const isPublic = publicRoutes.has(pathname) || pathname.startsWith("/join");

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(appUrl(request, "/login"));
  }

  if (hasSession && authEntryRoutes.has(pathname)) {
    return NextResponse.redirect(appUrl(request, "/select-group"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
