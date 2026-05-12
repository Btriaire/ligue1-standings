"use client";

import { useConfig, DEFAULT_CONFIG } from "@/app/lib/config";
import { downloadCSV, loadPredictions } from "@/app/lib/predictions-store";
import {
  Settings, Zap, Heart, Star, Eye, RefreshCw, Download,
  Building2, Newspaper, Users, MessageCircle, Trash2, ChevronRight,
} from "lucide-react";
import { useState } from "react";

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm" style={{ color: "#e8edf5" }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange, color = "#00d4ff" }: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative flex-shrink-0"
        style={{ width: 44, height: 24 }}
      >
        <div className="absolute inset-0 rounded-full transition-colors"
          style={{ background: enabled ? `${color}99` : "rgba(255,255,255,0.12)" }} />
        <div className="absolute top-0.5 rounded-full transition-all"
          style={{ width: 20, height: 20, left: enabled ? 22 : 2, background: enabled ? color : "#6b7c96" }} />
      </button>
    </div>
  );
}

function SliderRow({ label, description, value, min, max, unit, onChange }: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>{label}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{description}</p>}
        </div>
        <span className="text-sm font-black px-2 py-0.5 rounded-lg ml-4"
          style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", minWidth: 48, textAlign: "center" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#00d4ff" }}
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: "#6b7c96" }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
      {children}
    </div>
  );
}

export default function ConfigTab() {
  const [config, updateConfig, resetConfig] = useConfig();
  const [exported, setExported] = useState(false);
  const [cleared, setCleared] = useState(false);

  const predCount = typeof window !== "undefined" ? loadPredictions().length : 0;

  const handleExport = () => {
    downloadCSV();
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleClearHistory = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("footpredictom_predictions_v1");
      setCleared(true);
      setTimeout(() => setCleared(false), 2000);
    }
  };

  const REFRESH_OPTIONS = [
    { value: 30, label: "30 secondes" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 0, label: "Désactivé" },
  ];

  const isDefault = JSON.stringify(config) === JSON.stringify(DEFAULT_CONFIG);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Settings size={17} style={{ color: "#00d4ff" }} /> Configuration
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Personnalisez l'algorithme et les fonctionnalités
          </p>
        </div>
        {!isDefault && (
          <button
            onClick={resetConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-70"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
            <RefreshCw size={11} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Algorithm */}
      <Card>
        <SectionTitle
          icon={<Zap size={16} style={{ color: "#00d4ff" }} />}
          title="Algorithme prédictif"
          subtitle="Paramètres du moteur de prédiction"
        />

        <SliderRow
          label="Avantage domicile"
          description="Bonus accordé à l'équipe qui joue à domicile"
          value={config.homeAdvantage}
          min={0}
          max={15}
          unit="%"
          onChange={(v) => updateConfig({ homeAdvantage: v })}
        />

        <ToggleRow
          label="Élan de forme (momentum)"
          description="Bonus/malus basé sur les 3 derniers matchs vs les 5 derniers"
          enabled={config.formMomentumEnabled}
          onChange={(v) => updateConfig({ formMomentumEnabled: v })}
          color="#22c55e"
        />
      </Card>

      {/* Emotional score */}
      <Card>
        <SectionTitle
          icon={<Heart size={16} style={{ color: "#f472b6" }} />}
          title="Score Émotionnel"
          subtitle="Dimensions incluses dans l'analyse"
        />

        <ToggleRow
          label="Correction émotionnelle"
          description="Applique le score émotionnel aux prédictions IA"
          enabled={config.emotionalCorrectionEnabled}
          onChange={(v) => updateConfig({ emotionalCorrectionEnabled: v })}
          color="#f472b6"
        />

        <div className="mt-4 mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#6b7c96" }}>
            Dimensions actives
          </p>
        </div>

        <ToggleRow
          label={<span className="flex items-center gap-1.5"><Building2 size={12} style={{ color: "#f59e0b" }} /> Économique</span> as unknown as string}
          description="Solidité financière, propriétaire, revenus"
          enabled={config.ecoEnabled}
          onChange={(v) => updateConfig({ ecoEnabled: v })}
          color="#f59e0b"
        />
        <ToggleRow
          label={<span className="flex items-center gap-1.5"><Newspaper size={12} style={{ color: "#00d4ff" }} /> Médias & Sentiment</span> as unknown as string}
          description="Analyse des articles de presse récents"
          enabled={config.mediaEnabled}
          onChange={(v) => updateConfig({ mediaEnabled: v })}
          color="#00d4ff"
        />
        <ToggleRow
          label={<span className="flex items-center gap-1.5"><Users size={12} style={{ color: "#22c55e" }} /> Humain & Mercato</span> as unknown as string}
          description="Valeur de l'effectif, blessures"
          enabled={config.humanEnabled}
          onChange={(v) => updateConfig({ humanEnabled: v })}
          color="#22c55e"
        />
        <ToggleRow
          label={<span className="flex items-center gap-1.5"><MessageCircle size={12} style={{ color: "#f472b6" }} /> Supporters (Fan Buzz)</span> as unknown as string}
          description="Buzz supporters via Google News et L'Équipe"
          enabled={config.fanEnabled}
          onChange={(v) => updateConfig({ fanEnabled: v })}
          color="#f472b6"
        />
      </Card>

      {/* Expert predictions */}
      <Card>
        <SectionTitle
          icon={<Star size={16} style={{ color: "#eab308" }} />}
          title="Prédictions expertes"
          subtitle="Source externe the-predictors"
        />
        <ToggleRow
          label="Afficher les prédictions expertes"
          description="Badge expert sur les matchs couverts par l'API"
          enabled={config.expertPredictionsEnabled}
          onChange={(v) => updateConfig({ expertPredictionsEnabled: v })}
          color="#eab308"
        />
      </Card>

      {/* Display */}
      <Card>
        <SectionTitle
          icon={<Eye size={16} style={{ color: "#a78bfa" }} />}
          title="Affichage"
          subtitle="Options visuelles"
        />
        <ToggleRow
          label="Afficher les xG (Expected Goals)"
          description="Buts attendus par match"
          enabled={config.showXG}
          onChange={(v) => updateConfig({ showXG: v })}
          color="#a78bfa"
        />
        <ToggleRow
          label="Détails techniques"
          description="Probabilités brutes et paramètres algorithmiques"
          enabled={config.showTechnicalDetails}
          onChange={(v) => updateConfig({ showTechnicalDetails: v })}
          color="#a78bfa"
        />
        <ToggleRow
          label="Niveau de forme des joueurs"
          description="Badges hot/good/neutral/cold dans l'effectif"
          enabled={config.showPlayerForm}
          onChange={(v) => updateConfig({ showPlayerForm: v })}
          color="#a78bfa"
        />

        <div className="py-3">
          <p className="text-sm font-medium mb-2" style={{ color: "#e8edf5" }}>Intervalle de rafraîchissement</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig({ refreshInterval: opt.value })}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: config.refreshInterval === opt.value ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${config.refreshInterval === opt.value ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: config.refreshInterval === opt.value ? "#00d4ff" : "#6b7c96",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="mb-2">
            <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>Actualités Transferts — âge maximum</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Masque les articles plus anciens que la limite choisie</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[{ v: 7, l: "7 j" }, { v: 14, l: "14 j" }, { v: 30, l: "30 j" }, { v: 60, l: "60 j" }, { v: 0, l: "Tout" }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateConfig({ transfersMaxAgeDays: opt.v })}
                className="px-2 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: config.transfersMaxAgeDays === opt.v ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${config.transfersMaxAgeDays === opt.v ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: config.transfersMaxAgeDays === opt.v ? "#f59e0b" : "#6b7c96",
                }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <SectionTitle
          icon={<Download size={16} style={{ color: "#22c55e" }} />}
          title="Historique des prédictions"
          subtitle={`${predCount} prédiction${predCount > 1 ? "s" : ""} sauvegardée${predCount > 1 ? "s" : ""} localement`}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>Exporter en Excel / CSV</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
                Toutes les prédictions avec probabilités et scores émotionnels
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={predCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
              <Download size={12} />
              {exported ? "✓ Téléchargé" : "Exporter .csv"}
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>Effacer l'historique</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
                Supprime toutes les prédictions du stockage local
              </p>
            </div>
            <button
              onClick={handleClearHistory}
              disabled={predCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              <Trash2 size={12} />
              {cleared ? "✓ Effacé" : "Effacer"}
            </button>
          </div>
        </div>
      </Card>

      {/* Info */}
      <div className="rounded-2xl px-5 py-4 text-xs" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", color: "#6b7c96" }}>
        <div className="flex items-start gap-2">
          <ChevronRight size={13} style={{ color: "#00d4ff", marginTop: 1, flexShrink: 0 }} />
          <div>
            <p>Les paramètres sont sauvegardés automatiquement dans votre navigateur (localStorage).</p>
            <p className="mt-1">Les prédictions sont auto-sauvegardées à chaque chargement de l'onglet Prédictions IA, avant chaque match.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
