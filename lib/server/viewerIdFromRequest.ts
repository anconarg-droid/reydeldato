import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { RDD_VIEWER_COOKIE, RDD_VIEWER_COOKIE_MAX_AGE_SEC } from "@/lib/viewerCookie";

export function resolveViewerIdForRequest(
  req: NextRequest,
  bodyViewerId?: string | null
): { viewerId: string; shouldSetCookie: boolean } {
  const bodyVal = bodyViewerId?.trim();
  const cookieVal = req.cookies.get(RDD_VIEWER_COOKIE)?.value?.trim();
  if (bodyVal) {
    const syncCookie = !cookieVal || cookieVal !== bodyVal;
    return { viewerId: bodyVal, shouldSetCookie: syncCookie };
  }
  if (cookieVal) return { viewerId: cookieVal, shouldSetCookie: false };
  return { viewerId: randomUUID(), shouldSetCookie: true };
}

export function setViewerCookieOnResponse(res: NextResponse, viewerId: string): void {
  res.cookies.set(RDD_VIEWER_COOKIE, viewerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: RDD_VIEWER_COOKIE_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Query viewer_id (sync con localStorage en cliente) o cookie httpOnly.
 */
export function getViewerIdFromRequest(req: NextRequest): string {
  const q = req.nextUrl.searchParams.get("viewer_id")?.trim();
  const c = req.cookies.get(RDD_VIEWER_COOKIE)?.value?.trim();
  return (q || c || "").trim();
}
