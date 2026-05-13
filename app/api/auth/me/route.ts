import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAdminAuth } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  // Fetch fresh user data from Firebase to get displayName
  try {
    const adminAuth = getAdminAuth();
    const firebaseUser = await adminAuth.getUser(session.userId);
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: firebaseUser.displayName ?? session.name ?? session.email,
      },
    });
  } catch {
    return NextResponse.json({ user: { id: session.userId, email: session.email, name: session.name || session.email } });
  }
}
