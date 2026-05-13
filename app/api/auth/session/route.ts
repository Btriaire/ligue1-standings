import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/app/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    await createSession(idToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Session creation failed", e);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
