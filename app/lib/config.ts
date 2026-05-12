"use client";

import { useState, useEffect } from "react";

export interface AppConfig {
  // Prediction algorithm
  homeAdvantage: number;           // 0–15, default 8%
  formMomentumEnabled: boolean;    // bonus for recent win/loss streaks
  // Features
  emotionalCorrectionEnabled: boolean;
  expertPredictionsEnabled: boolean;
  showXG: boolean;
  showTechnicalDetails: boolean;
  showPlayerForm: boolean;
  // Emotional dimensions on/off
  ecoEnabled: boolean;
  mediaEnabled: boolean;
  humanEnabled: boolean;
  fanEnabled: boolean;
  // Refresh
  refreshInterval: number;         // seconds: 30/60/120/0(off)
  // Transfers
  transfersMaxAgeDays: number;     // 7/14/30/60/0(all), default 30
}

export const DEFAULT_CONFIG: AppConfig = {
  homeAdvantage: 8,
  formMomentumEnabled: true,
  emotionalCorrectionEnabled: true,
  expertPredictionsEnabled: true,
  showXG: true,
  showTechnicalDetails: false,
  showPlayerForm: true,
  ecoEnabled: true,
  mediaEnabled: true,
  humanEnabled: true,
  fanEnabled: true,
  refreshInterval: 60,
  transfersMaxAgeDays: 30,
};

const CONFIG_KEY = "footpredictom_config_v2";

export function loadConfig(): AppConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (!stored) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("config-updated"));
  } catch {}
}

export function useConfig(): [AppConfig, (update: Partial<AppConfig>) => void, () => void] {
  const [config, setConfig] = useState<AppConfig>({ ...DEFAULT_CONFIG });

  useEffect(() => {
    setConfig(loadConfig());
    const handler = () => setConfig(loadConfig());
    window.addEventListener("config-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("config-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const updateConfig = (update: Partial<AppConfig>) => {
    const newConfig = { ...config, ...update };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const resetConfig = () => {
    const fresh = { ...DEFAULT_CONFIG };
    setConfig(fresh);
    saveConfig(fresh);
  };

  return [config, updateConfig, resetConfig];
}
