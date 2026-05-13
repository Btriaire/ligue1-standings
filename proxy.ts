import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/app/lib/firebase-admin";

const PROTECTED = ["/players"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path.startsWith(p))) return NextResponse.next();

  const cookie = req.cookies.get("session")?.value;
  if (cookie) {
    try {
      await adminAuth.verifySessionCookie(cookie, true);
      return NextResponse.next();
    } catch { /* expired / invalid */ }
  }

  const loginUrl = new URL("/login", req.nextUrl);
  loginUrl.searchParams.set("from", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|ico|svg)$).*)"],
};
