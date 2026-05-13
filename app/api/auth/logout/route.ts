import { redirect } from "next/navigation";
import { deleteSession } from "@/app/lib/session";

export async function POST() {
  await deleteSession();
  redirect("/");
}
