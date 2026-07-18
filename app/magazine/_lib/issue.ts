// Deterministic magazine-issue generator.
//
// Each issue is a pure function of its publication date. Given the same
// YYYY-MM-DD string, every visitor — and every server render — produces the
// exact same issue: same hero player, same angle, same byline, same pull
// quote, same WC storyline. This is what makes the archive viable: we can
// surface a numéro from any past date and re-derive its contents without
// snapshotting anything.
//
// The data that DOES change day-to-day (live standings, upcoming TV
// fixtures) is fetched freshly server-side at render time. So the archive
// "format" is fixed (same hero, same dossier, same byline) while the
// supporting blocks (sidebar standings, agenda TV) reflect today's reality.
// Acceptable trade-off — the alternative is a snapshot DB which is out of
// scope for an editorial side feature.

export interface MagazinePlayer {
  name: string; club: string; nat: string; flag: string;
  age: number; impact: number;
  byline: string; signature: string; pullQuote: string; paragraph: string;
}

const ROSTER: MagazinePlayer[] = [
  { name:"Kylian Mbappé",       club:"Real Madrid",     nat:"France",       flag:"🇫🇷", age:25, impact:99, byline:"Antoine Leblanc",  signature:"Le météore tricolore",         pullQuote:"« Je ne joue pas pour les statistiques. Je joue pour gagner. »",                                    paragraph:"À vingt-cinq ans, Kylian Mbappé porte déjà l'histoire d'un football entier. Son départ au Real Madrid a refermé un chapitre français — et ouvert un roman madrilène que l'Europe observe, fascinée." },
  { name:"Antoine Griezmann",   club:"Atlético Madrid", nat:"France",       flag:"🇫🇷", age:33, impact:91, byline:"Claire Durand",     signature:"Le passeur magnétique",        pullQuote:"« La pression, c'est quand tu n'as pas travaillé suffisamment. »",                                  paragraph:"Griezmann vieillit comme les grands vins. À l'Atlético, il est devenu l'architecte discret d'une équipe qui ne gagne pas sans lui — et qui ne le dit pas toujours assez fort." },
  { name:"Ousmane Dembélé",     club:"Paris SG",        nat:"France",       flag:"🇫🇷", age:27, impact:88, byline:"Marc Fontaine",     signature:"L'électron libre",             pullQuote:"« Quand je cours, je ne pense à rien. C'est ça le bonheur. »",                                     paragraph:"Dembélé a mis du temps à trouver sa vitesse de croisière. Désormais au PSG, il joue avec la sérénité de celui qui a prouvé quelque chose — à lui-même d'abord." },
  { name:"Eduardo Camavinga",   club:"Real Madrid",     nat:"France",       flag:"🇫🇷", age:21, impact:86, byline:"Sophie Arnaud",     signature:"Le maestro en devenir",        pullQuote:"« J'apprends encore. Je préfère ça. »",                                                            paragraph:"Il a vingt et un ans et joue des finales de Ligue des Champions comme d'autres jouent des matchs de préparation. Camavinga est une anomalie tranquille — et l'avenir du milieu français." },
  { name:"Bukayo Saka",         club:"Arsenal",         nat:"Angleterre",   flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", age:22, impact:90, byline:"James Carter",     signature:"Le talisman d'Arsenal",        pullQuote:"« L'équipe avant tout, toujours. »",                                                              paragraph:"Saka est devenu l'âme d'Arsenal en silence. À vingt-deux ans, il incarne ce que le foot a de plus rare : la régularité au plus haut niveau sans jamais une ligne fanfaronne." },
  { name:"Rodri",               club:"Manchester City", nat:"Espagne",      flag:"🇪🇸", age:27, impact:95, byline:"Luis Fernández",    signature:"Le métronome mondial",         pullQuote:"« Sans équilibre, pas de victoire. C'est mathématique. »",                                         paragraph:"Rodri a gagné le Ballon d'Or et la Ligue des Champions. Plus impressionnant encore : il l'a fait en rendant ses coéquipiers meilleurs à chaque rotation de cheville." },
  { name:"Jude Bellingham",     club:"Real Madrid",     nat:"Angleterre",   flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", age:20, impact:93, byline:"Emma Wilson",      signature:"La révolution en bottes",      pullQuote:"« Je suis là pour marquer l'histoire, pas pour l'observer. »",                                    paragraph:"À vingt ans, Bellingham fait peur. Au Real Madrid, il n'a pas attendu d'être accepté — il s'est imposé. L'Angleterre regarde, le monde note, Madrid jubile." },
  { name:"Vinicius Jr",         club:"Real Madrid",     nat:"Brésil",       flag:"🇧🇷", age:23, impact:94, byline:"Carlos Mendes",     signature:"La samba au sommet",           pullQuote:"« Mon football, c'est de la joie. On ne peut pas l'éteindre. »",                                   paragraph:"Vinicius a transformé le droit au bonheur en arme tactique. Ses dribbles ne sont pas des fioritures — ce sont des décisions prises à une vitesse que les défenseurs ne compilent pas encore." },
  { name:"Lautaro Martínez",    club:"Inter Milan",     nat:"Argentine",    flag:"🇦🇷", age:26, impact:89, byline:"Pablo Reyes",       signature:"La pince de l'Inter",          pullQuote:"« Je marque pour gagner, pas pour être commenté. »",                                               paragraph:"Dans l'ombre de Messi pendant longtemps, Lautaro a choisi l'Inter pour exister seul. Il y est devenu champion d'Italie, buteur prolifique, et capitaine d'une équipe qui lui ressemble : efficace et discrète." },
  { name:"Pedri",               club:"Barcelone",       nat:"Espagne",      flag:"🇪🇸", age:22, impact:87, byline:"Marta Casals",      signature:"L'héritier de la Masia",       pullQuote:"« Le football, c'est du tempo. Tout le reste suit. »",                                             paragraph:"Pedri joue avec cinquante ans de philosophie barcelonaise dans les pieds. À vingt-deux ans, il porte le poids d'un héritage sans le courber — ce qui, en soi, est déjà un exploit." },
  { name:"Erling Haaland",      club:"Manchester City", nat:"Norvège",      flag:"🇳🇴", age:23, impact:96, byline:"Lars Eriksen",      signature:"La machine nordique",          pullQuote:"« Je dors, je mange, je marque. »",                                                                paragraph:"Haaland ne joue pas au football. Il l'industrialise. Ses statistiques sont indécentes, son calme sous pression est clinique, et son sourire après chaque but ressemble à une confirmation qu'on attendait." },
  { name:"Phil Foden",          club:"Manchester City", nat:"Angleterre",   flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", age:24, impact:88, byline:"Tom Bradley",      signature:"Le génie de Stockport",        pullQuote:"« La balle ne ment pas. Elle va où tu veux qu'elle aille. »",                                     paragraph:"Foden a grandi dans l'ombre de Guardiola et de joueurs deux fois Ballon d'Or. Il en a tiré le meilleur : un style reconnaissable entre mille, une maturité précoce, et la capacité de décider un match en trente secondes." },
  { name:"Oumar Diallo",        club:"Rennes",          nat:"France",       flag:"🇫🇷", age:20, impact:78, byline:"Nicolas Verdier",   signature:"La pépite bretonne",           pullQuote:"« Rennes m'a donné ma chance. Je n'oublierai pas. »",                                              paragraph:"Dans le championnat de France, Diallo incarne une génération qui ne veut plus attendre. À vingt ans, ses accélérations sur le flanc gauche sont devenues l'une des choses les plus excitantes à regarder en Ligue 1." },
  { name:"Alexandre Lacazette",  club:"Lyon",            nat:"France",       flag:"🇫🇷", age:32, impact:82, byline:"Céline Morin",      signature:"Le capitaine revenu",          pullQuote:"« J'aurais pu partir. J'ai choisi de rester. Lyon, c'est chez moi. »",                             paragraph:"Lacazette n'avait pas à revenir. Il l'a fait, et il a mis l'OL sur ses épaules. Capitaine, buteur, leader — à trente-deux ans, il joue avec une liberté que seuls les joueurs réconciliés avec eux-mêmes atteignent." },
  { name:"Loïc Badé",           club:"Séville",         nat:"France",       flag:"🇫🇷", age:24, impact:80, byline:"Thomas Guérin",     signature:"La forteresse française",      pullQuote:"« Défendre, c'est lire. Pas seulement courir. »",                                                  paragraph:"Badé n'a pas suivi le chemin classique. Passé par l'Angleterre, revenu en Liga, il s'est construit bloc par bloc. Aujourd'hui, il est l'un des défenseurs les plus bankables du marché européen." },
];

const ROSTER_BY_IMPACT = [...ROSTER].sort((a, b) => b.impact - a.impact);

const CONTRIBUTORS = [
  "Antoine Leblanc", "Claire Durand", "Marc Fontaine", "Sophie Arnaud",
  "Nicolas Verdier", "Céline Morin", "Thomas Guérin", "Julie Marest",
  "Raphaël Conte", "Lise Bertrand",
];

// Issue zero — the day on which we "launched" the magazine. Issue number
// is `daysSince(START_DATE) + 1`. May 23 2026 sits roughly at #143 with a
// January start, which reads naturally for a daily.
const START_DATE = "2026-01-01";

// ── Hashing / RNG ────────────────────────────────────────────────────────────

/** FNV-1a 32-bit hash. Matches the helper used in WorldCupTab so daily
 *  picks line up if we ever want to cross-reference. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small deterministic PRNG seeded by the date hash. Each call
 *  to `rng()` advances the stream. We use one stream per issue. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted pick — weight[i] is relative likelihood of arr[i]. */
function pickWeighted<T>(rng: () => number, arr: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let target = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    target -= weights[i];
    if (target <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  const MS = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / MS);
}

export function issueNumber(date: Date): number {
  const start = new Date(START_DATE + "T12:00:00");
  return Math.max(1, daysBetween(start, date) + 1);
}

const MONTHS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const WEEKDAYS_FR = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

export function formatLongDateFr(d: Date): string {
  return `${WEEKDAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Editorial vocabulary ────────────────────────────────────────────────────

const RUBRIQUES = [
  "ENQUÊTE",
  "DÉCRYPTAGE",
  "PORTRAIT",
  "ANALYSE",
  "RÉCIT",
  "CHRONIQUE",
  "GRAND ENTRETIEN",
  "PERSPECTIVE",
] as const;

const HERO_ANGLES = [
  { rubrique: "PORTRAIT",        intro: "Le tournoi qui peut changer un destin" },
  { rubrique: "ENQUÊTE",         intro: "L'ascension, sans bruit, d'un favori discret" },
  { rubrique: "DÉCRYPTAGE",      intro: "Pourquoi cette CdM ressemble déjà à la sienne" },
  { rubrique: "RÉCIT",           intro: "Du gamin du quartier au capitaine attendu" },
  { rubrique: "ANALYSE",         intro: "Le système qui tourne autour d'un seul homme" },
  { rubrique: "GRAND ENTRETIEN", intro: "« Je n'avais pas prévu d'en arriver là »" },
  { rubrique: "CHRONIQUE",       intro: "Ce qu'on attend, sans toujours le dire, du numéro 10" },
  { rubrique: "PERSPECTIVE",     intro: "Avant la consécration, l'épreuve" },
] as const;

const PRONO_HEADLINES = [
  "Le coup tactique du week-end",
  "L'équation qui tient en quatre passes",
  "Pourquoi le favori ne l'est plus tant que ça",
  "Ce que disent les chiffres — et ce qu'ils taisent",
  "Le détail qui devrait tout changer",
  "L'angle mort des pronostics européens",
  "Trois lignes, deux variables, une certitude",
  "Quand la possession ne suffit plus",
];

const TV_HEADLINES = [
  "Les matchs à ne pas manquer",
  "Programme des trois prochains soirs",
  "À l'écran, cette semaine",
  "L'agenda foot de la rédaction",
  "Ce que regarde la rédaction, ce soir",
];


const PRONO_BLURBS = [
  "L'équilibre tactique sera dicté par le couloir droit, comme souvent dans ce type de configuration. Le différentiel d'expected goals sur les trente dernières journées suggère un scénario serré.",
  "Trois facteurs convergent : la fraîcheur physique, la profondeur du banc et l'historique récent en compétition à élimination directe. On parie sur l'équipe la moins commentée.",
  "Les statistiques avancées disent une chose, le terrain en raconte une autre. Notre prono s'appuie sur ce que les deux ont en commun — et c'est plus rare qu'on ne le pense.",
  "Le pressing haut, signature de l'équipe en forme, devrait imposer son tempo dès la 15e minute. Reste à voir si les latéraux tiendront 90 minutes à ce régime.",
  "Tout reposera sur le milieu de récupération. Si la sentinelle est en jambe, le scénario s'écrit dans un sens. Si elle décroche, dans l'autre. Pile ou face — version tactique.",
  "Le bookmaker propose 2,30. La rédaction n'est pas d'accord avec lui, et elle le dit.",
];

// ── Issue shape ──────────────────────────────────────────────────────────────

export interface Issue {
  date: Date;
  dateKey: string;
  issueNumber: number;
  formattedDate: string;
  // Hero article
  hero: {
    player: MagazinePlayer;
    rubrique: string;
    overline: string;
    title: string;
    chapeau: string;
  };
  // Three columns
  prono: {
    rubrique: string;
    title: string;
    body: string;
    byline: string;
    minutes: number;
  };
  portrait: {
    player: MagazinePlayer;
    title: string;
    byline: string;
    minutes: number;
  };
  tv: {
    rubrique: string;
    title: string;
    byline: string;
  };
  // Footer / signage
  editorial: {
    director: string;
    redacChef: string;
    chefCulture: string;
    chefPolitiqueFoot: string;
  };
  weekTagline: string;
}

const TAGLINES = [
  "Le foot lu, pas zappé.",
  "Une semaine, un récit.",
  "Le foot en long, en large, en pensant.",
  "Parce qu'un match, c'est aussi un texte.",
  "Le foot ne se résume pas. Il se raconte.",
  "L'actualité du ballon, sans le ballon facile.",
];

/** Build a deterministic title for the hero article from the player + angle. */
function heroTitle(rng: () => number, player: MagazinePlayer): string {
  const shapes = [
    `${player.name}, l'année du seuil`,
    `${player.name} : l'épreuve du verre`,
    `Ce que ${player.name.split(" ").slice(-1)[0]} ne dit pas encore`,
    `${player.name}, à la lisière du sacre`,
    `${player.name} et la patience des grands`,
    `Au pied de ${player.name}`,
    `${player.name}, ou la fabrique d'un favori`,
    `${player.name}, le silence et la frappe`,
    `${player.name} : portrait avant l'orage`,
  ];
  return pick(rng, shapes);
}

/** Build the issue for a given date. */
export function generateIssue(date: Date): Issue {
  const dateKey = ymd(date);
  const seed = hashString(dateKey);
  const rng = makeRng(seed);

  // Hero: weighted toward high-impact stars, but every player has a non-zero
  // chance so the daily picks rotate convincingly across the season.
  const heroWeights = ROSTER.map(p => Math.max(1, p.impact - 70) ** 2);
  const hero = pickWeighted(rng, ROSTER, heroWeights);
  const angle = pick(rng, HERO_ANGLES);

  // Portrait: a different player from the hero. Drawn from the next 12 by
  // impact so the column always carries weight.
  const portraitPool = ROSTER_BY_IMPACT.filter(p => p.name !== hero.name).slice(0, 14);
  const portrait = pick(rng, portraitPool);

  // Editorial team (rotates daily so credit lines feel alive).
  const shuffled = [...CONTRIBUTORS].sort(() => rng() - 0.5);

  return {
    date,
    dateKey,
    issueNumber: issueNumber(date),
    formattedDate: formatLongDateFr(date),

    hero: {
      player: hero,
      rubrique: angle.rubrique,
      overline: angle.intro,
      title: heroTitle(rng, hero),
      chapeau: hero.paragraph,
    },

    prono: {
      rubrique: "PRONOSTIC",
      title: pick(rng, PRONO_HEADLINES),
      body: pick(rng, PRONO_BLURBS),
      byline: pick(rng, CONTRIBUTORS),
      minutes: 3 + Math.floor(rng() * 4),
    },

    portrait: {
      player: portrait,
      title: pick(rng, [
        `${portrait.name}, l'art du déplacement`,
        `${portrait.name} : le métier avant la mode`,
        `${portrait.name} ne fait pas son âge`,
        `${portrait.name}, le second rôle qui dérange`,
        `${portrait.name}, profil d'un titulaire indiscutable`,
      ]),
      byline: portrait.byline,
      minutes: 4 + Math.floor(rng() * 4),
    },

    tv: {
      rubrique: "AGENDA",
      title: pick(rng, TV_HEADLINES),
      byline: pick(rng, RUBRIQUES) === "ENQUÊTE" ? "La rédaction" : pick(rng, CONTRIBUTORS),
    },

    editorial: {
      director: "Jean-Marc Delcourt",
      redacChef: shuffled[0],
      chefCulture: shuffled[1],
      chefPolitiqueFoot: shuffled[2],
    },

    weekTagline: pick(rng, TAGLINES),
  };
}

// ── Archive helpers ──────────────────────────────────────────────────────────

/** Returns the last N publication dates (descending), capped by START_DATE. */
export function recentDates(now: Date, count: number): { date: Date; key: string; issueNumber: number }[] {
  const start = new Date(START_DATE + "T12:00:00");
  const out: { date: Date; key: string; issueNumber: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    if (d.getTime() < start.getTime()) break;
    out.push({ date: d, key: ymd(d), issueNumber: issueNumber(d) });
  }
  return out;
}

/** Prev/next sibling dates around a given key. Capped at START_DATE on the
 *  past side; no cap forward (an empty issue still renders the layout). */
export function siblingDates(date: Date): { prev: string | null; next: string | null } {
  const start = new Date(START_DATE + "T12:00:00");
  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  return {
    prev: prev.getTime() >= start.getTime() ? ymd(prev) : null,
    next: ymd(next),
  };
}
