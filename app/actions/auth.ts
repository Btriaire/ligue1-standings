"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createUser, getUserByEmail } from "@/app/lib/db";
import { createSession, deleteSession } from "@/app/lib/session";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name  = String(formData.get("name")  ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pass  = String(formData.get("password") ?? "");

  if (!name || name.length < 2)
    return { error: "Le nom doit faire au moins 2 caractères." };
  if (!email.includes("@"))
    return { error: "Adresse email invalide." };
  if (pass.length < 6)
    return { error: "Mot de passe : 6 caractères minimum." };

  const hash = await bcrypt.hash(pass, 12);
  const user = createUser(email, name, hash);
  if (!user) return { error: "Cette adresse email est déjà utilisée." };

  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pass  = String(formData.get("password") ?? "");

  const user = getUserByEmail(email);
  if (!user) return { error: "Email ou mot de passe incorrect." };

  const ok = await bcrypt.compare(pass, user.password_hash);
  if (!ok) return { error: "Email ou mot de passe incorrect." };

  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}
