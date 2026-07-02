import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = new Set(["/", "/create-group", "/login", "/register", "/forgot-password", "/join"]);

function stripBasePath(pathname: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const pathname = stripBasePath(request.nextUrl.pathname);
  const hasSession = Boolean(request.cookies.get("istanbul_quest_session"));
  const isPublic = publicRoutes.has(pathname) || pathname.startsWith("/join");

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
