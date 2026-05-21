"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  AppleLogo,
  Barbell,
  BowlFood,
  ChartLineUp,
  Check,
  CloudArrowUp,
  CookingPot,
  Database,
  Desktop,
  Drop,
  Fire,
  ForkKnife,
  GoogleLogo,
  Heartbeat,
  MagnifyingGlass,
  Minus,
  PersonSimpleRun,
  Plus,
  Scales,
  Trash,
} from "@phosphor-icons/react";

type MealType = "Petit dej" | "Dejeuner" | "Diner" | "Snack";

type Meal = {
  id: string;
  name: string;
  type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
};

type Goal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  steps: number;
};

type StoredState = {
  meals?: Meal[];
  goal?: Goal;
  water?: number;
  steps?: number;
  connected?: { healthConnect: boolean; appleHealth: boolean };
};

const mealTypes: MealType[] = ["Petit dej", "Dejeuner", "Diner", "Snack"];

const presets = [
  { name: "Bol skyr, avoine, fruits rouges", type: "Petit dej" as MealType, calories: 410, protein: 32, carbs: 48, fat: 9 },
  { name: "Poulet, riz complet, legumes", type: "Dejeuner" as MealType, calories: 620, protein: 46, carbs: 72, fat: 16 },
  { name: "Saumon, patate douce, salade", type: "Diner" as MealType, calories: 570, protein: 38, carbs: 46, fat: 24 },
  { name: "Pomme et beurre de cacahuete", type: "Snack" as MealType, calories: 210, protein: 6, carbs: 26, fat: 10 },
];

const foodSources = [
  {
    name: "Open Food Facts",
    url: "https://world.openfoodfacts.org/",
    description: "Base ouverte mondiale, tres forte pour les produits emballes, codes-barres, labels, ingredients et Nutri-Score.",
    accent: "#dff763",
  },
  {
    name: "USDA FoodData Central",
    url: "https://fdc.nal.usda.gov/",
    description: "Reference officielle tres detaillee pour nutriments, aliments generiques, aliments de marque et donnees de recherche.",
    accent: "#7dd3fc",
  },
];

const defaultMeals: Meal[] = [
  { id: "seed-1", name: "Omelette epinards et pain complet", type: "Petit dej", calories: 430, protein: 31, carbs: 34, fat: 18, time: "08:15" },
  { id: "seed-2", name: "Bowl poulet quinoa avocat", type: "Dejeuner", calories: 685, protein: 48, carbs: 62, fat: 25, time: "12:42" },
  { id: "seed-3", name: "Yaourt grec, miel, noix", type: "Snack", calories: 260, protein: 22, carbs: 24, fat: 9, time: "16:20" },
];

const defaultGoal: Goal = {
  calories: 2300,
  protein: 155,
  carbs: 255,
  fat: 75,
  water: 2500,
  steps: 9000,
};

function loadStoredState(): StoredState {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem("mealflow-state");
  if (!stored) return {};
  try {
    return JSON.parse(stored) as StoredState;
  } catch {
    window.localStorage.removeItem("mealflow-state");
    return {};
  }
}

function clampPercent(value: number, target: number) {
  return Math.min(100, Math.round((value / target) * 100));
}

function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function MacroRing({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const percent = clampPercent(value, target);
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
      <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-white/45">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">
        {value}g <span className="text-white/35">/ {target}g</span>
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-[#12161b] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px]" style={{ background: `${tone}18`, color: tone }}>
          {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">{label}</span>
      </div>
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/45">{detail}</p>
    </div>
  );
}

function MealPlate() {
  return (
    <div className="relative min-h-[250px] overflow-hidden rounded-[8px] border border-white/10 bg-[#eef7ef] p-6 text-[#143528]">
      <div className="absolute right-5 top-5 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ff7058]" />
        <span className="h-2 w-2 rounded-full bg-[#f3c14b]" />
        <span className="h-2 w-2 rounded-full bg-[#57b97b]" />
      </div>
      <div className="relative mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full bg-white shadow-[0_24px_60px_rgba(38,84,62,0.18)]">
        <div className="absolute h-36 w-36 rounded-full border-[14px] border-[#f4f1e8]" />
        <div className="absolute left-12 top-12 h-16 w-20 rounded-[45%] bg-[#ef6f4f]" />
        <div className="absolute bottom-11 right-12 h-16 w-16 rounded-full bg-[#f6c85f]" />
        <div className="absolute right-10 top-11 h-16 w-12 rounded-[45%] bg-[#5faf78]" />
        <div className="absolute bottom-14 left-12 h-10 w-14 rounded-full bg-[#76bd8b]" />
        <ForkKnife size={42} weight="duotone" className="relative text-[#173d30]" />
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5d7c6b]">Assiette du jour</p>
          <p className="mt-1 max-w-[220px] text-xl font-black leading-tight">Proteines, fibres et plaisir au meme endroit.</p>
        </div>
        <CookingPot size={34} weight="duotone" className="hidden text-[#ff7058] sm:block" />
      </div>
    </div>
  );
}

function FoodDatabasePanel({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  const cleanedQuery = query.trim();
  const openFoodFactsSearch = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanedQuery || "poulet riz")}&search_simple=1&action=process`;
  const usdaSearch = `https://fdc.nal.usda.gov/fdc-app.html#/?query=${encodeURIComponent(cleanedQuery || "chicken rice")}`;

  return (
    <div className="rounded-[8px] border border-[#dff763]/25 bg-[#132014] p-5 shadow-[0_24px_80px_rgba(101,140,45,0.12)]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#dff763] text-[#132014]">
            <Database size={24} weight="fill" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Base aliments</h2>
            <p className="text-sm font-medium text-white/50">Recherche externe pour completer tes repas.</p>
          </div>
        </div>
        <a
          href="https://world.openfoodfacts.org/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#dff763] px-4 py-3 text-sm font-black text-[#132014] transition hover:brightness-95"
        >
          Open Food Facts <ArrowSquareOut size={16} weight="bold" />
        </a>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[8px] border border-white/10 bg-black/20 p-4">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/42">
            Chercher un aliment en ligne
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <MagnifyingGlass size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Ex: skyr, saumon, riz basmati, barcode..."
                  className="w-full min-w-0 rounded-[8px] border border-white/10 bg-white/[0.06] py-3 pl-10 pr-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/28 focus:border-[#dff763]/70"
                />
              </div>
              <a
                href={openFoodFactsSearch}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-black text-[#132014] transition hover:bg-[#efffb2]"
              >
                Rechercher <ArrowSquareOut size={16} weight="bold" />
              </a>
            </div>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={openFoodFactsSearch} target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10">
              Produits et codes-barres
            </a>
            <a href={usdaSearch} target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10">
              Nutriments USDA
            </a>
            <a href="https://openfoodfacts.github.io/openfoodfacts-server/api/" target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10">
              API Open Food Facts
            </a>
          </div>
        </div>

        <div className="grid gap-2">
          {foodSources.map((source) => (
            <a
              key={source.name}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black" style={{ color: source.accent }}>{source.name}</p>
                <ArrowSquareOut size={15} className="text-white/35" />
              </div>
              <p className="text-sm font-medium leading-5 text-white/48">{source.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const hasLoadedStorage = useRef(false);
  const [meals, setMeals] = useState<Meal[]>(defaultMeals);
  const [goal, setGoal] = useState<Goal>(defaultGoal);
  const [water, setWater] = useState(1500);
  const [steps, setSteps] = useState(6400);
  const [connected, setConnected] = useState({ healthConnect: false, appleHealth: false });
  const [form, setForm] = useState({
    name: "",
    type: "Dejeuner" as MealType,
    calories: "520",
    protein: "35",
    carbs: "50",
    fat: "16",
  });
  const [foodSearch, setFoodSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedState = loadStoredState();
      if (storedState.meals) setMeals(storedState.meals);
      if (storedState.goal) setGoal(storedState.goal);
      if (typeof storedState.water === "number") setWater(storedState.water);
      if (typeof storedState.steps === "number") setSteps(storedState.steps);
      if (storedState.connected) setConnected(storedState.connected);
      hasLoadedStorage.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage.current) return;
    window.localStorage.setItem("mealflow-state", JSON.stringify({ meals, goal, water, steps, connected }));
  }, [meals, goal, water, steps, connected]);

  const totals = useMemo(() => sumMeals(meals), [meals]);
  const remaining = Math.max(0, goal.calories - totals.calories);
  const caloriePercent = clampPercent(totals.calories, goal.calories);
  const mealGroups = mealTypes.map((type) => ({ type, items: meals.filter((meal) => meal.type === type) }));

  const addMeal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const meal: Meal = {
      id: crypto.randomUUID(),
      name: form.name.trim() || "Repas personnalise",
      type: form.type,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMeals((current) => [meal, ...current]);
    setForm((current) => ({ ...current, name: "" }));
  };

  return (
    <main className="min-h-screen bg-[#0b0f12] text-white">
      <section className="mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
        <header className="flex flex-col gap-5 rounded-[8px] border border-white/10 bg-[#11161a] p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#dff763] text-[#142014]">
              <BowlFood size={27} weight="fill" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">MealFlow</h1>
              <p className="text-sm font-medium text-white/45">Tracker repas, macros, eau et activite.</p>
            </div>
          </div>
          <div className="hidden flex-1 grid-cols-3 gap-2 lg:grid lg:max-w-xl">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Web app</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-white"><Desktop size={16} /> Desktop ready</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Food DB</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-[#dff763]"><Database size={16} /> Open Food Facts</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Deploy</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-white"><CloudArrowUp size={16} /> Vercel OK</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex lg:min-w-[310px]">
            <button
              onClick={() => setConnected((value) => ({ ...value, healthConnect: !value.healthConnect }))}
              className="flex items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
            >
              <GoogleLogo size={16} weight="bold" />
              Health Connect
            </button>
            <button
              onClick={() => setConnected((value) => ({ ...value, appleHealth: !value.appleHealth }))}
              className="flex items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
            >
              <AppleLogo size={16} weight="fill" />
              Apple Health
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_440px] 2xl:grid-cols-[minmax(0,1.7fr)_460px]">
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Fire size={22} weight="fill" />} label="Calories" value={`${totals.calories}`} detail={`${remaining} kcal restantes`} tone="#ff7058" />
              <StatCard icon={<Barbell size={22} weight="fill" />} label="Proteines" value={`${totals.protein}g`} detail={`Objectif ${goal.protein}g`} tone="#7dd3fc" />
              <StatCard icon={<PersonSimpleRun size={22} weight="fill" />} label="Pas" value={steps.toLocaleString("fr-FR")} detail={`${goal.steps.toLocaleString("fr-FR")} vises`} tone="#dff763" />
              <StatCard icon={<Database size={22} weight="fill" />} label="Food DB" value="2 sources" detail="Open Food Facts + USDA" tone="#c4b5fd" />
            </div>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Aujourd&apos;hui</h2>
                  <p className="text-sm font-medium text-white/45">Vue rapide inspiree de Lose It et MyFitnessPal.</p>
                </div>
                <p className="text-sm font-bold text-[#dff763]">{caloriePercent}% de ton objectif</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-[8px] bg-white/[0.04] p-5">
                  <div
                    className="grid h-40 w-40 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#dff763 ${caloriePercent * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                    }}
                  >
                    <div className="grid h-28 w-28 place-items-center rounded-full bg-[#11161a] text-center">
                      <div>
                        <p className="text-3xl font-black">{remaining}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">kcal left</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid w-full grid-cols-2 gap-2 text-center text-sm">
                    <div className="rounded-[8px] bg-white/[0.04] p-2">
                      <p className="font-black">{totals.calories}</p>
                      <p className="text-xs text-white/40">mangees</p>
                    </div>
                    <div className="rounded-[8px] bg-white/[0.04] p-2">
                      <p className="font-black">320</p>
                      <p className="text-xs text-white/40">brulees</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MacroRing label="Proteines" value={totals.protein} target={goal.protein} color="#7dd3fc" />
                  <MacroRing label="Glucides" value={totals.carbs} target={goal.carbs} color="#dff763" />
                  <MacroRing label="Lipides" value={totals.fat} target={goal.fat} color="#ffb86b" />
                </div>
              </div>
            </div>

            <FoodDatabasePanel query={foodSearch} onQueryChange={setFoodSearch} />

            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-tight">Journal</h2>
                  <span className="rounded-[8px] bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/50">{meals.length} entrees</span>
                </div>
                <div className="space-y-4">
                  {mealGroups.map(({ type, items }) => (
                    <div key={type}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <p className="font-black text-white/75">{type}</p>
                        <p className="font-bold text-white/35">{sumMeals(items).calories} kcal</p>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <div className="rounded-[8px] border border-dashed border-white/10 p-3 text-sm font-medium text-white/30">Aucun repas ajoute.</div>
                        ) : (
                          items.map((meal) => (
                            <div key={meal.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                              <div>
                                <p className="font-bold text-white">{meal.name}</p>
                                <p className="mt-1 text-xs font-semibold text-white/38">
                                  {meal.time} · P {meal.protein}g · G {meal.carbs}g · L {meal.fat}g
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-right text-sm font-black text-[#dff763]">{meal.calories} kcal</p>
                                <button
                                  aria-label={`Supprimer ${meal.name}`}
                                  onClick={() => setMeals((current) => current.filter((item) => item.id !== meal.id))}
                                  className="grid h-8 w-8 place-items-center rounded-[8px] text-white/35 transition hover:bg-red-400/10 hover:text-red-300"
                                >
                                  <Trash size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="grid gap-6">
                <MealPlate />
                <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
                  <h2 className="mb-4 text-xl font-black tracking-tight">Hydratation</h2>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-[8px] bg-sky-300/15 text-sky-200">
                      <Drop size={24} weight="fill" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">{water} ml</p>
                      <p className="text-sm font-medium text-white/40">Objectif {goal.water} ml</p>
                    </div>
                  </div>
                  <div className="mb-4 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-sky-300" style={{ width: `${clampPercent(water, goal.water)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setWater((value) => Math.max(0, value - 250))} className="flex items-center justify-center gap-2 rounded-[8px] bg-white/[0.06] py-2 text-sm font-bold transition hover:bg-white/10">
                      <Minus size={15} /> 250 ml
                    </button>
                    <button onClick={() => setWater((value) => value + 250)} className="flex items-center justify-center gap-2 rounded-[8px] bg-[#dff763] py-2 text-sm font-black text-[#132013] transition hover:brightness-95">
                      <Plus size={15} /> 250 ml
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="grid content-start gap-6">
            <form onSubmit={addMeal} className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <h2 className="text-xl font-black tracking-tight">Ajouter un repas</h2>
              <p className="mt-1 text-sm font-medium text-white/45">Saisie rapide avec macros modifiables.</p>
              <div className="mt-5 grid gap-3">
                <label className="grid min-w-0 gap-2 text-sm font-bold text-white/70">
                  Aliment ou repas
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex: pates pesto et poulet"
                    className="w-full min-w-0 rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#dff763]/70"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mealTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, type }))}
                      className="rounded-[8px] border px-3 py-2 text-sm font-bold transition"
                      style={{
                        borderColor: form.type === type ? "#dff763" : "rgba(255,255,255,0.1)",
                        background: form.type === type ? "rgba(223,247,99,0.12)" : "rgba(255,255,255,0.04)",
                        color: form.type === type ? "#efffb2" : "rgba(255,255,255,0.58)",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                    <label key={key} className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/38">
                      {key === "calories" ? "Kcal" : key === "protein" ? "Prot." : key === "carbs" ? "Gluc." : "Lip."}
                      <input
                        type="number"
                        min="0"
                        value={form[key]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        className="w-full min-w-0 rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[#dff763]/70"
                      />
                    </label>
                  ))}
                </div>
                <button className="mt-2 flex items-center justify-center gap-2 rounded-[8px] bg-[#dff763] px-4 py-3 text-sm font-black text-[#132013] transition hover:brightness-95">
                  <Plus size={17} weight="bold" /> Ajouter au journal
                </button>
              </div>
            </form>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight">Favoris</h2>
                <ForkKnife size={20} className="text-white/35" />
              </div>
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      setMeals((current) => [
                        { ...preset, id: crypto.randomUUID(), time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
                        ...current,
                      ])
                    }
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.07]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-white">{preset.name}</span>
                      <span className="mt-1 block text-xs font-semibold text-white/35">{preset.type} · {preset.protein}g proteines</span>
                    </span>
                    <span className="text-sm font-black text-[#dff763]">{preset.calories}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <h2 className="text-xl font-black tracking-tight">Objectifs</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                  <label key={key} className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/38">
                    {key === "calories" ? "Calories" : key === "protein" ? "Proteines" : key === "carbs" ? "Glucides" : "Lipides"}
                    <input
                      type="number"
                      value={goal[key]}
                      onChange={(event) => setGoal((current) => ({ ...current, [key]: Number(event.target.value) || 0 }))}
                      className="w-full min-w-0 rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[#dff763]/70"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#dff763]/15 text-[#dff763]">
                  <Heartbeat size={22} weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Sante connectee</h2>
                  <p className="text-sm font-medium text-white/40">Pret pour les ponts natifs mobile.</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-black"><GoogleLogo size={18} /> Android Health Connect</p>
                    <span className={`flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-black ${connected.healthConnect ? "bg-[#dff763]/15 text-[#dff763]" : "bg-white/10 text-white/38"}`}>
                      {connected.healthConnect ? <Check size={13} weight="bold" /> : <Scales size={13} />} {connected.healthConnect ? "Connecte" : "A relier"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/42">Google Fit API est remplace par les APIs Android Health. Le bon chemin produit est une app Android ou PWA companion qui lit pas, depense et poids via Health Connect.</p>
                </div>
                <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-black"><AppleLogo size={18} weight="fill" /> Apple HealthKit</p>
                    <span className={`flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-black ${connected.appleHealth ? "bg-[#dff763]/15 text-[#dff763]" : "bg-white/10 text-white/38"}`}>
                      {connected.appleHealth ? <Check size={13} weight="bold" /> : <Scales size={13} />} {connected.appleHealth ? "Connecte" : "A relier"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/42">Apple Health n&apos;a pas d&apos;API web directe. Il faut une app iOS avec HealthKit pour lire/ecrire calories alimentaires, poids, pas et energie active.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-white/10 text-white">
                  <CloudArrowUp size={22} weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Projet Vercel</h2>
                  <p className="text-sm font-medium text-white/40">Pret a pusher en preview ou prod.</p>
                </div>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-medium leading-6 text-white/50">
                  Oui, tu peux creer un projet Vercel depuis ce repo. Le plus simple: connecter le repo GitHub a Vercel, ou lancer le CLI pour linker puis deployer.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://vercel.com/docs/projects/deploy-from-cli"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/10"
                  >
                    Docs CLI <ArrowSquareOut size={14} weight="bold" />
                  </a>
                  <a
                    href="https://vercel.com/docs/getting-started-with-vercel/import"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#dff763] px-3 py-2 text-xs font-black text-[#132014] transition hover:brightness-95"
                  >
                    Import Git <ArrowSquareOut size={14} weight="bold" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-[#11161a] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black tracking-tight"><ChartLineUp size={21} /> Tendance</h2>
                <button
                  onClick={() => setSteps((value) => value + 1000)}
                  className="rounded-[8px] bg-white/[0.06] px-3 py-2 text-xs font-black text-white/65 transition hover:bg-white/10"
                >
                  +1000 pas
                </button>
              </div>
              <div className="flex h-28 items-end gap-2">
                {[64, 72, 58, 83, 77, 91, caloriePercent].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div data-trend-bar className="w-full rounded-t-[8px] bg-[#dff763]" style={{ height: `${height}%`, opacity: 0.45 + index * 0.07 }} />
                    <span className="text-[10px] font-black text-white/30">{["L", "M", "M", "J", "V", "S", "D"][index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
