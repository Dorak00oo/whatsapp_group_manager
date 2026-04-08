import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;
  const signedIn = !!req.auth;

  if (path.startsWith("/dashboard") && !signedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  if (path === "/login" && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
