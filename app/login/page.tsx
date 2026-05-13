"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getClientAuth } from "@/app/lib/firebase-client";
import { ArrowLeft, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

function Field({ label, name, type = "text", placeholder, value, onChange }: {
  label: string; name: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold" style={{ color: "#94a3b8" }}>{label}</label>
      <div className="relative">
        <input
          name={name}
          type={isPass && show ? "text" : type}
          placeholder={placeholder}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }}
          onFocus={e => (e.target.style.borderColor = "#3b82f6")}
          onBlur={e => (e.target.style.borderColor = "#1e2d42")}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const from = params.get("from") ?? "/";
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  // register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  async function exchangeToken(idToken: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Session error");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setPending(true);
    try {
      const clientAuth = getClientAuth();
      const cred = await signInWithEmailAndPassword(clientAuth, loginEmail, loginPass);
      await exchangeToken(await cred.user.getIdToken());
      router.push(from);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(
        code === "auth/invalid-credential" || code === "auth/user-not-found"
          ? "Email ou mot de passe incorrect."
          : "Erreur de connexion. Réessayez."
      );
    } finally {
      setPending(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setPending(true);
    if (!regName || regName.length < 2) { setError("Le nom doit faire au moins 2 caractères."); setPending(false); return; }
    if (regPass.length < 6) { setError("Mot de passe : 6 caractères minimum."); setPending(false); return; }
    try {
      const clientAuth = getClientAuth();
      const cred = await createUserWithEmailAndPassword(clientAuth, regEmail, regPass);
      await updateProfile(cred.user, { displayName: regName });
      await exchangeToken(await cred.user.getIdToken(true));
      router.push(from);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(
        code === "auth/email-already-in-use"
          ? "Cette adresse email est déjà utilisée."
          : "Erreur lors de la création du compte."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#080c14" }}>
      <div className="w-full max-w-sm mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs hover:opacity-70" style={{ color: "#6b7c96" }}>
          <ArrowLeft size={13} /> Retour
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-1"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(129,140,248,0.12))" }}>
        <div className="rounded-2xl p-6" style={{ background: "#0d1421" }}>

          <div className="text-center mb-6">
            <div className="text-2xl font-black mb-1" style={{ color: "#e8edf5" }}>
              Ligue 1 <span style={{ color: "#3b82f6" }}>Insider</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7c96" }}>Accès aux analyses avancées</p>
          </div>

          <div className="flex rounded-xl overflow-hidden mb-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? "rgba(59,130,246,0.12)" : "transparent",
                  color: tab === t ? "#3b82f6" : "#6b7c96",
                  borderBottom: tab === t ? "2px solid #3b82f6" : "2px solid transparent",
                }}>
                {t === "login" ? <><LogIn size={12} /> Connexion</> : <><UserPlus size={12} /> Inscription</>}
              </button>
            ))}
          </div>

          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" value={loginEmail} onChange={setLoginEmail} />
              <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" value={loginPass} onChange={setLoginPass} />
              {error && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending}
                className="w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#080c14" }}>
                {pending ? "Connexion…" : "Se connecter"}
              </button>
              <p className="text-center text-xs" style={{ color: "#6b7c96" }}>
                Pas encore de compte ?{" "}
                <button type="button" onClick={() => { setTab("register"); setError(""); }} style={{ color: "#3b82f6" }}>
                  S&apos;inscrire
                </button>
              </p>
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Prénom / Pseudo" name="name" placeholder="Ex: Marc" value={regName} onChange={setRegName} />
              <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" value={regEmail} onChange={setRegEmail} />
              <Field label="Mot de passe" name="password" type="password" placeholder="6 caractères min." value={regPass} onChange={setRegPass} />
              {error && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending}
                className="w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)", color: "#080c14" }}>
                {pending ? "Création…" : "Créer mon compte"}
              </button>
              <p className="text-center text-xs" style={{ color: "#6b7c96" }}>
                Déjà un compte ?{" "}
                <button type="button" onClick={() => { setTab("login"); setError(""); }} style={{ color: "#3b82f6" }}>
                  Se connecter
                </button>
              </p>
            </form>
          )}

        </div>
      </div>

      <div className="mt-6 w-full max-w-sm grid grid-cols-3 gap-2 text-center">
        {[{ icon: "🎯", label: "Prédictions" }, { icon: "👥", label: "Joueurs" }, { icon: "❤️", label: "Émotionnel" }].map(f => (
          <div key={f.label} className="rounded-xl py-2 px-1"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d42" }}>
            <div className="text-lg">{f.icon}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#6b7c96" }}>{f.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
