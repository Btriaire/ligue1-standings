"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerAction, loginAction } from "@/app/actions/auth";
import type { AuthState } from "@/app/actions/auth";
import { ArrowLeft, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

const INIT: AuthState = {};

function Field({ label, name, type = "text", placeholder }: {
  label: string; name: string; type?: string; placeholder?: string;
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
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #1e2d42",
            color: "#e8edf5",
          }}
          onFocus={e => (e.target.style.borderColor = "#00d4ff")}
          onBlur={e => (e.target.style.borderColor = "#1e2d42")}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#6b7c96" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const params = useSearchParams();
  const from = params.get("from") ?? "/";
  const [tab, setTab] = useState<"login" | "register">("login");

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, INIT);
  const [regState, regFormAction, regPending] = useActionState(registerAction, INIT);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#080c14" }}>

      {/* Back */}
      <div className="w-full max-w-sm mb-6">
        <Link href={from === "/" ? "/" : "/"}
          className="inline-flex items-center gap-1.5 text-xs hover:opacity-70"
          style={{ color: "#6b7c96" }}>
          <ArrowLeft size={13} /> Retour
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-1"
        style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(167,139,250,0.12))" }}>
        <div className="rounded-2xl p-6" style={{ background: "#0d1421" }}>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-2xl font-black mb-1" style={{ color: "#e8edf5" }}>
              Ligue 1 <span style={{ color: "#00d4ff" }}>Insider</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7c96" }}>
              Accès aux analyses avancées
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? "rgba(0,212,255,0.12)" : "transparent",
                  color: tab === t ? "#00d4ff" : "#6b7c96",
                  borderBottom: tab === t ? "2px solid #00d4ff" : "2px solid transparent",
                }}>
                {t === "login" ? <><LogIn size={12} /> Connexion</> : <><UserPlus size={12} /> Inscription</>}
              </button>
            ))}
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form action={loginFormAction} className="space-y-4">
              <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" />
              <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" />
              {loginState?.error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {loginState.error}
                </p>
              )}
              <button type="submit" disabled={loginPending}
                className="w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00d4ff, #a78bfa)", color: "#080c14" }}>
                {loginPending ? "Connexion…" : "Se connecter"}
              </button>
              <p className="text-center text-xs" style={{ color: "#6b7c96" }}>
                Pas encore de compte ?{" "}
                <button type="button" onClick={() => setTab("register")} style={{ color: "#00d4ff" }}>
                  S&apos;inscrire
                </button>
              </p>
            </form>
          )}

          {/* Register form */}
          {tab === "register" && (
            <form action={regFormAction} className="space-y-4">
              <Field label="Prénom / Pseudo" name="name" placeholder="Ex: Marc" />
              <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" />
              <Field label="Mot de passe" name="password" type="password" placeholder="6 caractères min." />
              {regState?.error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {regState.error}
                </p>
              )}
              <button type="submit" disabled={regPending}
                className="w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #a78bfa, #00d4ff)", color: "#080c14" }}>
                {regPending ? "Création…" : "Créer mon compte"}
              </button>
              <p className="text-center text-xs" style={{ color: "#6b7c96" }}>
                Déjà un compte ?{" "}
                <button type="button" onClick={() => setTab("login")} style={{ color: "#00d4ff" }}>
                  Se connecter
                </button>
              </p>
            </form>
          )}

        </div>
      </div>

      {/* Features hint */}
      <div className="mt-6 w-full max-w-sm grid grid-cols-3 gap-2 text-center">
        {[
          { icon: "🎯", label: "Prédictions" },
          { icon: "👥", label: "Joueurs" },
          { icon: "❤️", label: "Émotionnel" },
        ].map(f => (
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
