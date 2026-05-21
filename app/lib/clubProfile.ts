// Comprehensive administrative & identity profile for every Ligue 1 and
// Ligue 2 club we follow. Centralized here so the /club page (and any
// future fiche / directory view) can consume one source of truth.
//
// Image URLs use Wikimedia Commons' `Special:FilePath` redirect — it
// resolves to the actual CDN file and returns 404 when missing, which lets
// the UI fall back to a colored gradient cleanly.
//
// Source data: club official sites, DNCG reports (LNFP), Wikipedia FR
// (population figures as of last census). Numbers prefixed with "~" are
// rounded estimates from public DNCG summaries.

export type ClubLeague = "L1" | "L2";

export interface ClubProfile {
  /** FotMob team id — primary key everywhere in the app. */
  id: number;
  name: string;
  shortName: string;
  league: ClubLeague;

  // ── Identité ──
  surnom?: string;
  fondation: number;          // year
  ville: string;
  region?: string;
  population?: string;        // city population, free-form e.g. "61 996 hab."
  devise?: string;
  couleurs: { primary: string; secondary: string };

  // ── Stade ──
  stade: {
    nom: string;
    capacite?: string;        // e.g. "47 929"
    inauguration?: number;
    /** Wikimedia Commons filename (without the "File:" prefix) */
    photo?: string;
    /** Full HTTPS URL if we want to override Special:FilePath */
    photoUrl?: string;
  };

  // ── Direction & acteurs clés ──
  president: string;
  presidentDepuis?: number;
  actionnaire?: string;
  directeurSportif?: string;
  entraineur?: string;
  capitaine?: string;

  // ── Économie ──
  forme: string;              // SAS / SA / SASP / SAM …
  siren?: string;
  siege: string;
  ca?: string;                // CA annuel
  employes?: string;
  dette?: string;
  billetterie?: string;
  droitsTv?: string;

  // ── Identité commerciale ──
  equipementier?: string;
  sponsorMaillot?: string;

  // ── Palmarès & affichage ──
  palmares?: string[];        // short list of biggest trophies
  legalNote?: string;
  sources?: { label: string; url: string }[];
}

// Helper: build a Wikimedia Commons direct URL from a filename + width.
// We default to 1200px which matches the hero strip resolution.
export function commonsUrl(file: string, width = 1200): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

// Pre-resolved Wikimedia URLs for stadium hero photos. These were verified
// once by hitting `fr.wikipedia.org/api/rest_v1/page/summary/<stadium>` and
// pulling `originalimage.source` — much more reliable than guessing the
// Special:FilePath filename, which depends on exact casing/spacing.
const STADIUM_PHOTO_URLS: Record<number, string> = {
  // ── Ligue 1 ──
  524:  "https://upload.wikimedia.org/wikipedia/commons/f/f4/Paris_Parc_des_Princes_1.jpg",
  548:  "https://upload.wikimedia.org/wikipedia/commons/7/78/Panoramio_-_V%26A_Dudush_-_stade_Louis_II.jpg",
  516:  "https://upload.wikimedia.org/wikipedia/commons/1/16/Stade_V%C3%A9lodrome_%2820150405%29.jpg",
  521:  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Lille_vs_PSG_2019_-_Stade_Pierre_Mauroy.jpg/3840px-Lille_vs_PSG_2019_-_Stade_Pierre_Mauroy.jpg",
  529:  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Le_Roazhon_Park_de_jour_en_2021.jpg/3840px-Le_Roazhon_Park_de_jour_en_2021.jpg",
  522:  "https://upload.wikimedia.org/wikipedia/fr/8/8c/Allianzrivierainauguration.jpg",
  523:  "https://upload.wikimedia.org/wikipedia/commons/d/d2/Int%C3%A9rieur_POL.JPG",
  576:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Stade_de_la_Meinau_-_Vue_depuis_les_gradins_-_pelouse_%281%29.jpg/3840px-Stade_de_la_Meinau_-_Vue_depuis_les_gradins_-_pelouse_%281%29.jpg",
  511:  "https://upload.wikimedia.org/wikipedia/commons/e/e9/Stadium-Lory.jpg",
  512:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Vue_panoramique_du_stade_depuis_tribune_Eurodif.jpg/3840px-Vue_panoramique_du_stade_depuis_tribune_Eurodif.jpg",
  532:  "https://upload.wikimedia.org/wikipedia/commons/f/fb/Stade_Jean_Bouin_Angers_2.JPG",
  533:  "https://upload.wikimedia.org/wikipedia/commons/9/96/Stade_Oc%C3%A9ane_nuit.jpg",
  519:  "https://upload.wikimedia.org/wikipedia/commons/9/91/Stade_de_l%27Abb%C3%A9_Deschamps.png",
  543:  "https://upload.wikimedia.org/wikipedia/commons/1/17/Stade_de_la_Beaujoire.jpg",
  545:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Match_Football_FC_Metz_x_FC_Nantes_-_Stade_Saint_Symphorien_-_Longeville-l%C3%A8s-Metz_%28FR57%29_-_2022-02-27_-_16.jpg/3840px-Match_Football_FC_Metz_x_FC_Nantes_-_Stade_Saint_Symphorien_-_Longeville-l%C3%A8s-Metz_%28FR57%29_-_2022-02-27_-_16.jpg",
  525:  "https://upload.wikimedia.org/wikipedia/commons/b/b1/Stade_du_Moustoir.jpg",
  1045: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Paris_Stade_S%C3%A9bastien_Charl%C3%A9ty.jpg/3840px-Paris_Stade_S%C3%A9bastien_Charl%C3%A9ty.jpg",
  546:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Stade_Bollaert-Delelis_Lens.jpg/1200px-Stade_Bollaert-Delelis_Lens.jpg",

  // ── Ligue 2 ──
  10242: "https://upload.wikimedia.org/wikipedia/fr/thumb/a/a2/Fa%C3%A7ade_du_stade_de_l%27Aube.jpeg/1200px-Fa%C3%A7ade_du_stade_de_l%27Aube.jpeg",
  9853:  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Match_ASSE_x_OL_-_Stade_Geoffroy-Guichard_-_6_octobre_2019_-_St_%C3%89tienne_Loire_5.jpg/3840px-Match_ASSE_x_OL_-_Stade_Geoffroy-Guichard_-_6_octobre_2019_-_St_%C3%89tienne_Loire_5.jpg",
  9837:  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Stade_Auguste_Delaune_-_Reims_%28FR51%29_-_2024-01-28_-_6.jpg/3840px-Stade_Auguste_Delaune_-_Reims_%28FR51%29_-_2024-01-28_-_6.jpg",
  10249: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Stade_de_la_Mosson_-_Vue_du_Stade.jpg/1200px-Stade_de_la_Mosson_-_Vue_du_Stade.jpg",
  8311:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Stade_Gabriel-Montpied%2C_tribune_Gergovie_2017-06-25.jpg/3840px-Stade_Gabriel-Montpied%2C_tribune_Gergovie_2017-06-25.jpg",
  9747:  "https://upload.wikimedia.org/wikipedia/commons/2/20/Roudourou-ensemble.JPG",
  8682:  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/MMArena_Le_Mans.jpg/1200px-MMArena_Le_Mans.jpg",
  6390:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Match_Football_Red_Star_FC_x_FBBP01_-_Stade_Bauer_-_Saint-Ouen-sur-Seine_%28FR93%29_-_2022-10-12_-_16.jpg/3840px-Match_Football_Red_Star_FC_x_FBBP01_-_Stade_Bauer_-_Saint-Ouen-sur-Seine_%28FR93%29_-_2022-10-12_-_16.jpg",
  4120:  "https://upload.wikimedia.org/wikipedia/commons/7/7e/Rodez_AF_v_FC_Nantes_B%2C_31_March_2007.jpg",
  293352:"https://upload.wikimedia.org/wikipedia/commons/9/9f/Parc_des_Sports_d%27Annecy_Manpower_1.jpg",
  6355:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Nouste_Camp_-_23-09-2023.jpg/3840px-Nouste_Camp_-_23-09-2023.jpg",
  47214: "https://upload.wikimedia.org/wikipedia/commons/9/91/Tribut123..jpg",
  9855:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Stade_des_Alpes_Grenoble_2018.jpg/1200px-Stade_des_Alpes_Grenoble_2018.jpg",
  8481:  "https://upload.wikimedia.org/wikipedia/commons/3/31/Stade_marcel_picot.jpg",
  4170:  "https://upload.wikimedia.org/wikipedia/commons/e/e7/Boulogne-sur-Mer_Stade_de_la_Liberation_%285%29.jpg",
  7853:  "https://upload.wikimedia.org/wikipedia/commons/9/91/STADE_FRANCIS_LE_BASSER.jpg",
  7794:  "https://upload.wikimedia.org/wikipedia/commons/4/4e/Stade_Armand-Cesari_vu_du_ciel.jpg",
  8587:  "https://upload.wikimedia.org/wikipedia/commons/0/0e/Stadlic3.JPG",
};

export function clubStadiumPhoto(id: number): string | undefined {
  return STADIUM_PHOTO_URLS[id];
}

// Verified Wikimedia headshot URLs for prominent club figures (coaches,
// presidents, captains). Keyed by lowercase, accent-folded full name so the
// lookup is resilient to typography. Add more as new names appear in profiles.
const PERSON_PHOTOS: Record<string, string> = {
  "luis enrique":          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Luis_enrique.jpg/500px-Luis_enrique.jpg",
  "habib beye":            "https://upload.wikimedia.org/wikipedia/commons/2/20/Habib_Beye_2019_%28cropped%29.png",
  "marquinhos":            "https://upload.wikimedia.org/wikipedia/commons/d/dc/FC_Salzburg_gegen_Paris_Saint-Germain_UEFA_Champions_League_49_%28cropped%29.jpg",
  "pablo longoria":        "https://upload.wikimedia.org/wikipedia/commons/c/c6/Pablo_Longoria_2024.jpg",
  "nasser al-khelaifi":    "https://upload.wikimedia.org/wikipedia/commons/8/8b/Nasser_Al-Khelaifi.jpg",
  "paulo fonseca":         "https://upload.wikimedia.org/wikipedia/commons/e/ec/Paulo-Fonseca-Confer%C3%AAncia-de-Imprensa.jpg",
  "bruno genesio":         "https://upload.wikimedia.org/wikipedia/commons/3/3b/BrunoGenesio2020.png",
  "claude puel":           "https://upload.wikimedia.org/wikipedia/commons/4/47/Claude_Puel_%28cropped%29.jpg",
  "antoine kombouare":     "https://upload.wikimedia.org/wikipedia/commons/9/95/Antoine_Kombouar%C3%A9_%28valenciennes%29.jpg",
  "franck haise":          "https://upload.wikimedia.org/wikipedia/commons/b/be/Entra%C3%AEnement_du_RC_Lens_-_3_juillet_2023_47_%28cropped%29.jpg",
  "john textor":           "https://upload.wikimedia.org/wikipedia/commons/d/dc/John_Textor_%28cropped%29.jpg",
  "michele kang":          "https://upload.wikimedia.org/wikipedia/commons/e/ea/Michelle_Kang_220917-F-LE393-0304.jpg",
  "marc keller":           "https://upload.wikimedia.org/wikipedia/commons/1/1d/Marc_Keller_au_local_des_supporters_du_Racing_Club_de_Strasbourg_en_2017.jpg",
  "joseph oughourlian":    "https://upload.wikimedia.org/wikipedia/commons/2/2f/RC_Lens_-_US_Orl%C3%A9ans_%2817-05-2019%29_69.jpg",
  "pierre sage":           "https://upload.wikimedia.org/wikipedia/commons/d/db/Pierre_Sage_en_2024.jpg",
  "gary o'neil":           "https://upload.wikimedia.org/wikipedia/commons/4/41/Gary_O_Neil_2026.png",
  "vahid halilhodzic":     "https://upload.wikimedia.org/wikipedia/commons/e/e5/Alg%C3%A9rie_-_Arm%C3%A9nie_-_20140531_-_Vahid_Halilodzic_1_%28cropped%29.jpg",
  "dmitri rybolovlev":     "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/DmitryRybolovlev1.JPG/1024px-DmitryRybolovlev1.JPG",
  "dmitry rybolovlev":     "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/DmitryRybolovlev1.JPG/1024px-DmitryRybolovlev1.JPG",
};

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function personPhoto(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return PERSON_PHOTOS[normalizeName(name)];
}

/* ════════════════════════════════════════ Ligue 1 ════ */

export const CLUB_PROFILES_L1: Record<number, ClubProfile> = {
  524: {
    id: 524, name: "Paris Saint-Germain", shortName: "PSG", league: "L1",
    surnom: "Les Rouge et Bleu", fondation: 1970,
    ville: "Paris", region: "Île-de-France", population: "2,1 M hab.",
    devise: "Ici c'est Paris", couleurs: { primary: "#0033a0", secondary: "#dc143c" },
    stade: { nom: "Parc des Princes", capacite: "47 929", inauguration: 1972, photo: "Parc_des_Princes_-_20130116_2.jpg" },
    president: "Nasser Al-Khelaïfi", presidentDepuis: 2011,
    actionnaire: "Qatar Sports Investments (QSI)",
    directeurSportif: "Luís Campos", entraineur: "Luis Enrique", capitaine: "Marquinhos",
    forme: "SAS", siren: "317 506 329",
    siege: "24 r. du Commandant-Guilbaud, 75016 Paris",
    ca: "~800 M€", employes: "~400", dette: "~200 M€", billetterie: "~70 M€", droitsTv: "~80 M€",
    equipementier: "Nike", sponsorMaillot: "Qatar Airways",
    palmares: ["12× Ligue 1", "16× Coupe de France", "9× Coupe de la Ligue", "1× Ligue des Champions (2025)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }, { label: "Deloitte FML", url: "https://www2.deloitte.com/uk/en/pages/sports-business-group/articles/football-money-league.html" }],
  },
  548: {
    id: 548, name: "AS Monaco", shortName: "Monaco", league: "L1",
    surnom: "Les Rouge et Blanc", fondation: 1924,
    ville: "Monaco", region: "Principauté de Monaco", population: "39 050 hab.",
    couleurs: { primary: "#d4af37", secondary: "#e41f20" },
    stade: { nom: "Stade Louis-II", capacite: "16 360", inauguration: 1985, photo: "Stade_Louis_II.jpg" },
    president: "Dmitry Rybolovlev", presidentDepuis: 2011,
    actionnaire: "Monaco Sport Invest (D. Rybolovlev)",
    directeurSportif: "Thiago Scuro", entraineur: "Sébastien Pocognoli",
    forme: "SAM", siege: "7 av. des Castelans, Monaco",
    ca: "~200 M€", employes: "~150", dette: "~30 M€", billetterie: "~20 M€", droitsTv: "~55 M€",
    equipementier: "Kappa", sponsorMaillot: "Vibrant Stork",
    palmares: ["8× Ligue 1", "5× Coupe de France", "Finaliste LDC 2004"],
    legalNote: "Entité de droit monégasque",
    sources: [{ label: "UEFA Club Licensing", url: "https://www.uefa.com/insideuefa/football-development/club-licensing/" }],
  },
  516: {
    id: 516, name: "Olympique de Marseille", shortName: "OM", league: "L1",
    surnom: "Les Olympiens", fondation: 1899,
    ville: "Marseille", region: "Provence-Alpes-Côte d'Azur", population: "873 076 hab.",
    devise: "Droit au but", couleurs: { primary: "#00a0e4", secondary: "#ffffff" },
    stade: { nom: "Orange Vélodrome", capacite: "67 394", inauguration: 1937, photo: "Stade_Velodrome_Marseille.jpg" },
    president: "Pablo Longoria", presidentDepuis: 2021,
    actionnaire: "Frank McCourt (McCourt Global)",
    directeurSportif: "Mehdi Benatia", entraineur: "Habib Beye",
    forme: "SA", siren: "786 164 659",
    siege: "145 traverse Charles Susini, 13008 Marseille",
    ca: "~170 M€", employes: "~200", dette: "~80 M€", billetterie: "~25 M€", droitsTv: "~55 M€",
    equipementier: "Puma", sponsorMaillot: "CMA CGM",
    palmares: ["9× Ligue 1", "10× Coupe de France", "1× Ligue des Champions (1993)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  521: {
    id: 521, name: "LOSC Lille", shortName: "LOSC", league: "L1",
    surnom: "Les Dogues", fondation: 1944,
    ville: "Lille", region: "Hauts-de-France", population: "236 234 hab.",
    couleurs: { primary: "#c8102e", secondary: "#ffd700" },
    stade: { nom: "Stade Pierre-Mauroy", capacite: "50 186", inauguration: 2012, photo: "Stade_Pierre-Mauroy.jpg" },
    president: "Olivier Létang", presidentDepuis: 2020,
    actionnaire: "Merlyn Partners (Olivier Létang minoritaire)",
    directeurSportif: "Marc Ingla", entraineur: "Bruno Génésio",
    forme: "SA", siren: "783 897 830",
    siege: "261 bd de Tournai, 59650 Villeneuve-d'Ascq",
    ca: "~110 M€", employes: "~180", dette: "~20 M€", billetterie: "~15 M€", droitsTv: "~45 M€",
    equipementier: "New Balance", sponsorMaillot: "Boulanger",
    palmares: ["4× Ligue 1 (2021)", "6× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  529: {
    id: 529, name: "Stade Rennais", shortName: "Rennes", league: "L1",
    surnom: "Les Rouge et Noir", fondation: 1901,
    ville: "Rennes", region: "Bretagne", population: "225 081 hab.",
    couleurs: { primary: "#e41e20", secondary: "#000000" },
    stade: { nom: "Roazhon Park", capacite: "29 778", inauguration: 1912, photo: "Stade_de_la_Route_de_Lorient_Rennes.JPG" },
    president: "Arnaud Pouille", presidentDepuis: 2024,
    actionnaire: "Famille Pinault (Artémis)",
    directeurSportif: "Loïc Désiré", entraineur: "Franck Haise",
    forme: "SAS", siren: "303 623 965",
    siege: "111 route de Lorient, 35000 Rennes",
    ca: "~130 M€", employes: "~160", dette: "~15 M€", billetterie: "~18 M€", droitsTv: "~40 M€",
    equipementier: "Puma", sponsorMaillot: "Samsic",
    palmares: ["3× Coupe de France (2019)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  522: {
    id: 522, name: "OGC Nice", shortName: "Nice", league: "L1",
    surnom: "Les Aiglons", fondation: 1904,
    ville: "Nice", region: "Provence-Alpes-Côte d'Azur", population: "347 105 hab.",
    couleurs: { primary: "#e30a17", secondary: "#000000" },
    stade: { nom: "Allianz Riviera", capacite: "35 624", inauguration: 2013, photo: "Allianz_Riviera_panorama.jpg" },
    president: "Fabrice Bocquet", presidentDepuis: 2025,
    actionnaire: "INEOS (Sir Jim Ratcliffe)",
    directeurSportif: "Florent Ghisolfi", entraineur: "Claude Puel",
    forme: "SA", siren: "776 416 358",
    siege: "Av. Simone Veil, 06200 Nice",
    ca: "~150 M€", employes: "~180", dette: "~25 M€", billetterie: "~20 M€", droitsTv: "~45 M€",
    equipementier: "Macron", sponsorMaillot: "Ineos",
    palmares: ["4× Ligue 1", "3× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  546: {
    id: 546, name: "RC Lens", shortName: "Lens", league: "L1",
    surnom: "Les Sang et Or", fondation: 1906,
    ville: "Lens", region: "Hauts-de-France", population: "30 940 hab.",
    couleurs: { primary: "#e31e24", secondary: "#ffd700" },
    stade: { nom: "Stade Bollaert-Delelis", capacite: "38 223", inauguration: 1933, photo: "Stade_Bollaert-Delelis.jpg" },
    president: "Joseph Oughourlian", presidentDepuis: 2018,
    actionnaire: "Amber Capital (J. Oughourlian)",
    directeurSportif: "Diego Lopez", entraineur: "Pierre Sage",
    forme: "SA", siren: "497 854 280",
    siege: "Rue de Lens, 62300 Lens",
    ca: "~90 M€", employes: "~120", dette: "~10 M€", billetterie: "~12 M€", droitsTv: "~38 M€",
    equipementier: "Puma", sponsorMaillot: "Saxoprint",
    palmares: ["1× Ligue 1 (1998)", "1× Coupe de la Ligue"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  523: {
    id: 523, name: "Olympique Lyonnais", shortName: "OL", league: "L1",
    surnom: "Les Gones", fondation: 1950,
    ville: "Lyon", region: "Auvergne-Rhône-Alpes", population: "522 250 hab.",
    couleurs: { primary: "#c8102e", secondary: "#0033a0" },
    stade: { nom: "Groupama Stadium", capacite: "59 186", inauguration: 2016, photo: "Groupama_Stadium_-_Lyon_(Décines).jpg" },
    president: "Michele Kang", presidentDepuis: 2025,
    actionnaire: "Eagle Football Holdings (Michele Kang)",
    directeurSportif: "Matthieu Louis-Jean", entraineur: "Paulo Fonseca",
    forme: "SA", siren: "320 835 374",
    siege: "350 av. Jean Jaurès, 69007 Lyon",
    ca: "~180 M€", employes: "~250", dette: "~120 M€", billetterie: "~22 M€", droitsTv: "~50 M€",
    equipementier: "Adidas", sponsorMaillot: "Emirates",
    palmares: ["7× Ligue 1 (2002-2008)", "5× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  576: {
    id: 576, name: "RC Strasbourg Alsace", shortName: "Strasbourg", league: "L1",
    surnom: "Le Racing", fondation: 1906,
    ville: "Strasbourg", region: "Grand Est", population: "291 313 hab.",
    couleurs: { primary: "#00529f", secondary: "#ffffff" },
    stade: { nom: "Stade de la Meinau", capacite: "26 109", inauguration: 1914, photo: "Stade_Meinau_2012.JPG" },
    president: "Marc Keller", presidentDepuis: 2012,
    actionnaire: "BlueCo (groupe Todd Boehly / Chelsea)",
    directeurSportif: "Andrey Santos", entraineur: "Gary O'Neil",
    forme: "SA", siren: "422 952 942",
    siege: "11 rue du Stade, 67100 Strasbourg",
    ca: "~120 M€", employes: "~150", dette: "~40 M€", billetterie: "~14 M€", droitsTv: "~38 M€",
    equipementier: "Adidas", sponsorMaillot: "Stoeffler",
    palmares: ["1× Ligue 1 (1979)", "3× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  511: {
    id: 511, name: "Toulouse FC", shortName: "Toulouse", league: "L1",
    surnom: "Le Téfécé", fondation: 1970,
    ville: "Toulouse", region: "Occitanie", population: "504 078 hab.",
    couleurs: { primary: "#6a1de0", secondary: "#ffffff" },
    stade: { nom: "Stadium de Toulouse", capacite: "33 150", inauguration: 1937, photo: "Stadium_de_Toulouse.jpg" },
    president: "Olivier Cloarec", presidentDepuis: 2025,
    actionnaire: "RedBird Capital Partners",
    directeurSportif: "Jean-Baptiste Léger", entraineur: "Carles Martínez Novell",
    forme: "SA", siren: "408 476 801",
    siege: "Stadium Municipal, 31400 Toulouse",
    ca: "~75 M€", employes: "~100", dette: "~8 M€", billetterie: "~10 M€", droitsTv: "~32 M€",
    equipementier: "Craft", sponsorMaillot: "Newrest",
    palmares: ["2× Coupe de France (1957, 2023)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  512: {
    id: 512, name: "Stade Brestois 29", shortName: "Brest", league: "L1",
    surnom: "Les Ti'Zefs", fondation: 1950,
    ville: "Brest", region: "Bretagne", population: "139 384 hab.",
    couleurs: { primary: "#c8102e", secondary: "#003da5" },
    stade: { nom: "Stade Francis-Le Blé", capacite: "15 931", inauguration: 1922, photo: "Stade_Francis_Le_Ble_Brest.jpg" },
    president: "Denis Le Saint", presidentDepuis: 2016,
    actionnaire: "Denis Le Saint (groupe agroalimentaire)",
    directeurSportif: "Grégory Lorenzi", entraineur: "Éric Roy",
    forme: "SASP", siren: "390 260 337",
    siege: "Rue de Pontaniou, 29200 Brest",
    ca: "~55 M€", employes: "~90", dette: "~5 M€", billetterie: "~8 M€", droitsTv: "~28 M€",
    equipementier: "Hummel", sponsorMaillot: "Sill",
    palmares: ["3× champion L2"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  532: {
    id: 532, name: "Angers SCO", shortName: "Angers", league: "L1",
    surnom: "Les Scoïstes", fondation: 1919,
    ville: "Angers", region: "Pays de la Loire", population: "157 945 hab.",
    couleurs: { primary: "#1a1a1a", secondary: "#ffffff" },
    stade: { nom: "Stade Raymond-Kopa", capacite: "18 752", inauguration: 1912, photo: "Stade_Jean-Bouin_Angers.JPG" },
    president: "Saïd Chabane", presidentDepuis: 2011,
    actionnaire: "Saïd Chabane (Pâtisserie du Mans)",
    directeurSportif: "Olivier Pickeu", entraineur: "Alexandre Dujeux",
    forme: "SA", siren: "775 577 063",
    siege: "Stade Raymond-Kopa, 49000 Angers",
    ca: "~45 M€", employes: "~80", dette: "~12 M€", billetterie: "~7 M€", droitsTv: "~26 M€",
    equipementier: "Kappa", sponsorMaillot: "VetSelect",
    palmares: ["Finaliste Coupe de France 2017"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  533: {
    id: 533, name: "Le Havre AC", shortName: "Le Havre", league: "L1",
    surnom: "Les Ciel et Marine", fondation: 1872,
    ville: "Le Havre", region: "Normandie", population: "165 830 hab.",
    couleurs: { primary: "#0033a0", secondary: "#ffffff" },
    stade: { nom: "Stade Océane", capacite: "25 178", inauguration: 2012, photo: "Stade_Oceane_Le_Havre.jpg" },
    president: "Vincent Volpe", presidentDepuis: 2018,
    actionnaire: "Vincent Volpe (Industriel)",
    directeurSportif: "Mathieu Bideau", entraineur: "Didier Digard",
    forme: "SA", siren: "431 026 609",
    siege: "Stade Océane, 76600 Le Havre",
    ca: "~40 M€", employes: "~75", dette: "~6 M€", billetterie: "~6 M€", droitsTv: "~25 M€",
    equipementier: "Joma", sponsorMaillot: "Auchan",
    palmares: ["Doyen du football français", "1× Champion L2 (2023)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  519: {
    id: 519, name: "AJ Auxerre", shortName: "Auxerre", league: "L1",
    surnom: "L'AJA", fondation: 1905,
    ville: "Auxerre", region: "Bourgogne-Franche-Comté", population: "33 821 hab.",
    couleurs: { primary: "#003399", secondary: "#ffffff" },
    stade: { nom: "Stade de l'Abbé-Deschamps", capacite: "23 467", inauguration: 1918, photo: "Stade_de_l'Abbé-Deschamps.jpg" },
    president: "Yan Gaborit", presidentDepuis: 2023,
    actionnaire: "James Zhou / actionnariat chinois",
    directeurSportif: "Najim Slaoui", entraineur: "Christophe Pélissier",
    forme: "SA", siren: "302 697 937",
    siege: "Stade de l'Abbé-Deschamps, 89000 Auxerre",
    ca: "~40 M€", employes: "~70", dette: "~8 M€", billetterie: "~5 M€", droitsTv: "~24 M€",
    equipementier: "Macron", sponsorMaillot: "Crédit Agricole",
    palmares: ["1× Ligue 1 (1996)", "4× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  543: {
    id: 543, name: "FC Nantes", shortName: "Nantes", league: "L1",
    surnom: "Les Canaris", fondation: 1943,
    ville: "Nantes", region: "Pays de la Loire", population: "320 732 hab.",
    couleurs: { primary: "#ffd700", secondary: "#00671c" },
    stade: { nom: "Stade de la Beaujoire", capacite: "35 322", inauguration: 1984, photo: "Stade_de_la_Beaujoire.JPG" },
    president: "Waldemar Kita", presidentDepuis: 2007,
    actionnaire: "Waldemar Kita (Famille Kita)",
    directeurSportif: "Franck Kita", entraineur: "Vahid Halilhodžić",
    forme: "SA", siren: "302 505 072",
    siege: "Stade de la Beaujoire, 44300 Nantes",
    ca: "~70 M€", employes: "~110", dette: "~15 M€", billetterie: "~9 M€", droitsTv: "~30 M€",
    equipementier: "Macron", sponsorMaillot: "Synergie",
    palmares: ["8× Ligue 1", "4× Coupe de France (2022)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  545: {
    id: 545, name: "FC Metz", shortName: "Metz", league: "L1",
    surnom: "Les Grenats", fondation: 1932,
    ville: "Metz", region: "Grand Est", population: "117 492 hab.",
    couleurs: { primary: "#8b0000", secondary: "#000000" },
    stade: { nom: "Stade Saint-Symphorien", capacite: "30 000", inauguration: 1923, photo: "Stade_Saint_Symphorien_Metz.jpg" },
    president: "Bernard Serin", presidentDepuis: 2009,
    actionnaire: "Bernard Serin (CMI France)",
    directeurSportif: "Pierre Dréossi", entraineur: "Benoît Tavenot",
    forme: "SASP", siren: "384 233 417",
    siege: "Stade Saint-Symphorien, 57050 Metz",
    ca: "~35 M€", employes: "~65", dette: "~5 M€", billetterie: "~4 M€", droitsTv: "~22 M€",
    equipementier: "Kappa", sponsorMaillot: "Moselle",
    palmares: ["2× Coupe de France", "2× Coupe de la Ligue"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  525: {
    id: 525, name: "FC Lorient", shortName: "Lorient", league: "L1",
    surnom: "Les Merlus", fondation: 1926,
    ville: "Lorient", region: "Bretagne", population: "57 547 hab.",
    couleurs: { primary: "#1a1a1a", secondary: "#ff6600" },
    stade: { nom: "Stade du Moustoir", capacite: "18 110", inauguration: 1959, photo: "Stade_du_Moustoir_Lorient.jpg" },
    president: "Loïc Féry", presidentDepuis: 2009,
    actionnaire: "Loïc Féry (Chenavari Investments)",
    directeurSportif: "Pierre-Yves Hamel", entraineur: "Olivier Pantaloni",
    forme: "SA", siren: "304 890 016",
    siege: "Stade du Moustoir, 56100 Lorient",
    ca: "~50 M€", employes: "~85", dette: "~7 M€", billetterie: "~7 M€", droitsTv: "~26 M€",
    equipementier: "Kappa", sponsorMaillot: "B&B Hôtels",
    palmares: ["1× Coupe de France (2002)", "1× Champion L2"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  1045: {
    id: 1045, name: "Paris FC", shortName: "Paris FC", league: "L1",
    surnom: "Les Bleu Ciel", fondation: 1969,
    ville: "Paris", region: "Île-de-France", population: "2,1 M hab.",
    couleurs: { primary: "#003da5", secondary: "#e4002b" },
    stade: { nom: "Stade Charléty", capacite: "20 000", inauguration: 1939, photo: "Stade_Charléty.jpg" },
    president: "Pierre Ferracci", presidentDepuis: 2024,
    actionnaire: "Famille Arnault (LVMH) + Red Bull",
    directeurSportif: "François Ferracci", entraineur: "Antoine Kombouaré",
    forme: "SA", siren: "814 988 091",
    siege: "Stade Charléty, 75013 Paris",
    ca: "~60 M€", employes: "~90", dette: "~10 M€", billetterie: "~8 M€", droitsTv: "~25 M€",
    equipementier: "Nike", sponsorMaillot: "Red Bull",
    palmares: ["Promu en L1 (2025)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
};

/* ════════════════════════════════════════ Ligue 2 ════ */

export const CLUB_PROFILES_L2: Record<number, ClubProfile> = {
  10242: {
    id: 10242, name: "ES Troyes AC", shortName: "Troyes", league: "L2",
    surnom: "L'ESTAC", fondation: 1986,
    ville: "Troyes", region: "Grand Est", population: "61 996 hab.",
    couleurs: { primary: "#1b47b0", secondary: "#ffffff" },
    stade: { nom: "Stade de l'Aube", capacite: "21 877", inauguration: 1924, photo: "Stade_de_l'Aube.jpg" },
    president: "Aymeric Magne", presidentDepuis: 2024,
    actionnaire: "City Football Group (Abou Dabi)",
    directeurSportif: "Sébastien Larcier", entraineur: "Stéphane Dumont",
    forme: "SASP", siege: "Stade de l'Aube, 10000 Troyes",
    ca: "~25 M€", employes: "~55", dette: "—", billetterie: "~3 M€", droitsTv: "~6 M€",
    equipementier: "Macron", sponsorMaillot: "Champagne Region",
    palmares: ["2× Champion L2 (2015, 2021)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  9853: {
    id: 9853, name: "AS Saint-Étienne", shortName: "Saint-Étienne", league: "L2",
    surnom: "Les Verts", fondation: 1919,
    ville: "Saint-Étienne", region: "Auvergne-Rhône-Alpes", population: "172 565 hab.",
    couleurs: { primary: "#008b3d", secondary: "#ffffff" },
    stade: { nom: "Geoffroy-Guichard", capacite: "41 965", inauguration: 1931, photo: "Stade_Geoffroy-Guichard.jpg" },
    president: "Ivan Gazidis", presidentDepuis: 2024,
    actionnaire: "Kilmer Sports Ventures (Larry Tanenbaum)",
    directeurSportif: "Huss Fahmy", entraineur: "Philippe Montanier", capitaine: "Anthony Briançon",
    forme: "SASP", siege: "114 Cours Marshall, 42000 Saint-Étienne",
    ca: "~45 M€", employes: "~120", dette: "~10 M€", billetterie: "~8 M€", droitsTv: "~10 M€",
    equipementier: "Hummel", sponsorMaillot: "Vinci",
    palmares: ["10× Ligue 1", "6× Coupe de France", "Finaliste C1 1976"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  9837: {
    id: 9837, name: "Stade de Reims", shortName: "Reims", league: "L2",
    surnom: "Les Rouge et Blanc", fondation: 1931,
    ville: "Reims", region: "Grand Est", population: "180 752 hab.",
    couleurs: { primary: "#e10600", secondary: "#ffffff" },
    stade: { nom: "Stade Auguste-Delaune", capacite: "21 684", inauguration: 1935, photo: "Stade_Auguste-Delaune_II.jpg" },
    president: "Jean-Pierre Caillot", presidentDepuis: 2004,
    actionnaire: "Jean-Pierre Caillot (Transports Caillot)",
    directeurSportif: "Mathieu Lacour", entraineur: "Samba Diawara",
    forme: "SASP", siege: "Stade Auguste-Delaune, 51100 Reims",
    ca: "~55 M€", employes: "~110", dette: "~12 M€", billetterie: "~6 M€", droitsTv: "~12 M€",
    equipementier: "Umbro", sponsorMaillot: "Lardy",
    palmares: ["6× Ligue 1 (années 50)", "2× Finaliste C1 (1956, 1959)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  10249: {
    id: 10249, name: "Montpellier HSC", shortName: "Montpellier", league: "L2",
    surnom: "La Paillade", fondation: 1974,
    ville: "Montpellier", region: "Occitanie", population: "299 096 hab.",
    couleurs: { primary: "#f47b20", secondary: "#003da5" },
    stade: { nom: "Stade de la Mosson", capacite: "32 939", inauguration: 1972, photo: "Stade_de_la_Mosson_Montpellier.jpg" },
    president: "Laurent Nicollin", presidentDepuis: 2017,
    actionnaire: "Famille Nicollin (Groupe Nicollin)",
    directeurSportif: "Bruno Carotti", entraineur: "Zoumana Camara",
    forme: "SASP", siege: "Stade de la Mosson, 34080 Montpellier",
    ca: "~55 M€", employes: "~100", dette: "~12 M€", billetterie: "~6 M€", droitsTv: "~14 M€",
    equipementier: "Nike", sponsorMaillot: "GSF",
    palmares: ["1× Ligue 1 (2012)", "2× Coupe de France"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  8311: {
    id: 8311, name: "Clermont Foot", shortName: "Clermont", league: "L2",
    surnom: "Les Lanciers", fondation: 1990,
    ville: "Clermont-Ferrand", region: "Auvergne-Rhône-Alpes", population: "147 284 hab.",
    couleurs: { primary: "#003da5", secondary: "#e10600" },
    stade: { nom: "Stade Gabriel-Montpied", capacite: "11 980", inauguration: 1995, photo: "Stade_Gabriel-Montpied.jpg" },
    president: "Ahmet Schaefer", presidentDepuis: 2018,
    actionnaire: "Ahmet Schaefer (entrepreneur turco-allemand)",
    directeurSportif: "Pascal Gastien", entraineur: "Christophe Pélissier",
    forme: "SASP", siege: "Stade Gabriel-Montpied, 63100 Clermont-Ferrand",
    ca: "~25 M€", employes: "~50", dette: "—", billetterie: "~2 M€", droitsTv: "~7 M€",
    equipementier: "Hummel", sponsorMaillot: "Michelin",
    palmares: ["1× promu en L1 (2021)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  9747: {
    id: 9747, name: "EA Guingamp", shortName: "Guingamp", league: "L2",
    surnom: "Les Rouge et Noir", fondation: 1912,
    ville: "Guingamp", region: "Bretagne", population: "6 858 hab.",
    couleurs: { primary: "#e10600", secondary: "#1a1a1a" },
    stade: { nom: "Stade de Roudourou", capacite: "18 378", inauguration: 1990, photo: "Stade_de_Roudourou_Guingamp.jpg" },
    president: "Frédéric Legrand", presidentDepuis: 2019,
    actionnaire: "Bertrand Desplat / actionnariat local",
    directeurSportif: "Stéphane Le Mignan", entraineur: "Stéphane Dumont",
    forme: "SASP", siege: "Stade de Roudourou, 22200 Guingamp",
    ca: "~22 M€", employes: "~50", dette: "—", billetterie: "~2 M€", droitsTv: "~7 M€",
    equipementier: "Patrick", sponsorMaillot: "Blot",
    palmares: ["2× Coupe de France (2009, 2014)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  8682: {
    id: 8682, name: "Le Mans FC", shortName: "Le Mans", league: "L2",
    surnom: "Les Sang et Or", fondation: 1985,
    ville: "Le Mans", region: "Pays de la Loire", population: "146 105 hab.",
    couleurs: { primary: "#e10600", secondary: "#ffffff" },
    stade: { nom: "Stade Marie-Marvingt (MMArena)", capacite: "25 064", inauguration: 2011, photo: "MMArena_Le_Mans.jpg" },
    president: "Thierry Gomez", presidentDepuis: 2019,
    actionnaire: "Investisseurs locaux + ville du Mans",
    directeurSportif: "Adrien Tameze", entraineur: "Yannick Loubatière",
    forme: "SASP", siege: "MMArena, 72100 Le Mans",
    ca: "~12 M€", employes: "~40", dette: "—", billetterie: "~1,2 M€", droitsTv: "~5 M€",
    equipementier: "Kappa", sponsorMaillot: "MMA",
    palmares: ["Promu L2 (2024)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  6390: {
    id: 6390, name: "Red Star FC", shortName: "Red Star", league: "L2",
    surnom: "Les Audoniens", fondation: 1897,
    ville: "Saint-Ouen", region: "Île-de-France", population: "51 769 hab.",
    couleurs: { primary: "#005232", secondary: "#ffffff" },
    stade: { nom: "Stade Bauer", capacite: "10 000", inauguration: 1909, photo: "Stade_Bauer_Saint-Ouen.jpg" },
    president: "Patrice Haddad", presidentDepuis: 2008,
    actionnaire: "777 Partners (jusqu'en 2024) / Red Star Holdings",
    directeurSportif: "Habib Bellaïd", entraineur: "Grégory Poirier",
    forme: "SASP", siege: "Stade Bauer, 93400 Saint-Ouen",
    ca: "~10 M€", employes: "~35", dette: "—", billetterie: "~0,8 M€", droitsTv: "~5 M€",
    equipementier: "Kappa", sponsorMaillot: "Bricoman",
    palmares: ["5× Coupe de France (avant 1942)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  4120: {
    id: 4120, name: "Rodez AF", shortName: "Rodez", league: "L2",
    surnom: "Les Sang et Or", fondation: 1929,
    ville: "Rodez", region: "Occitanie", population: "24 932 hab.",
    couleurs: { primary: "#e10600", secondary: "#1a1a1a" },
    stade: { nom: "Stade Paul-Lignon", capacite: "5 955", inauguration: 1949, photo: "Stade_Paul-Lignon_Rodez.jpg" },
    president: "Pierre-Olivier Murat", presidentDepuis: 2016,
    actionnaire: "Famille Murat / actionnariat local",
    directeurSportif: "Sébastien Bichard", entraineur: "Didier Santini",
    forme: "SASP", siege: "Stade Paul-Lignon, 12000 Rodez",
    ca: "~7 M€", employes: "~30", dette: "—", billetterie: "~0,5 M€", droitsTv: "~4 M€",
    equipementier: "Hummel", sponsorMaillot: "RAGT",
    palmares: ["Champion National 2019"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  293352: {
    id: 293352, name: "FC Annecy", shortName: "Annecy", league: "L2",
    surnom: "Les Marquisards", fondation: 1993,
    ville: "Annecy", region: "Auvergne-Rhône-Alpes", population: "131 285 hab.",
    couleurs: { primary: "#e10600", secondary: "#ffffff" },
    stade: { nom: "Parc des Sports d'Annecy", capacite: "15 660", inauguration: 1964, photo: "Parc_des_Sports_Annecy.jpg" },
    president: "Sébastien Faraglia", presidentDepuis: 2019,
    actionnaire: "Sébastien Faraglia / SCIC locale",
    directeurSportif: "Cyril Rool", entraineur: "Laurent Guyot",
    forme: "SASP", siege: "Parc des Sports, 74000 Annecy",
    ca: "~9 M€", employes: "~35", dette: "—", billetterie: "~0,7 M€", droitsTv: "~5 M€",
    equipementier: "Kappa", sponsorMaillot: "Salomon",
    palmares: ["Champion National 2022"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  6355: {
    id: 6355, name: "Pau FC", shortName: "Pau", league: "L2",
    surnom: "Les Béarnais", fondation: 1959,
    ville: "Pau", region: "Nouvelle-Aquitaine", population: "75 665 hab.",
    couleurs: { primary: "#003da5", secondary: "#ffd700" },
    stade: { nom: "Nouste Camp", capacite: "4 031", inauguration: 2020, photo: "Nouste_Camp_Pau.jpg" },
    president: "Bernard Laporte-Fray", presidentDepuis: 2010,
    actionnaire: "Bernard Laporte-Fray (transports)",
    directeurSportif: "Joël Lopez", entraineur: "Nicolas Usaï",
    forme: "SASP", siege: "Nouste Camp, 64000 Pau",
    ca: "~8 M€", employes: "~30", dette: "—", billetterie: "~0,4 M€", droitsTv: "~4 M€",
    equipementier: "Hummel", sponsorMaillot: "Total",
    palmares: ["Champion National 2020"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  47214: {
    id: 47214, name: "USL Dunkerque", shortName: "Dunkerque", league: "L2",
    surnom: "Les Maritimes", fondation: 1909,
    ville: "Dunkerque", region: "Hauts-de-France", population: "84 663 hab.",
    couleurs: { primary: "#e10600", secondary: "#ffffff" },
    stade: { nom: "Stade Marcel-Tribut", capacite: "4 200", inauguration: 1933, photo: "Stade_Marcel-Tribut.jpg" },
    president: "Jean-Pierre Scouarnec", presidentDepuis: 2018,
    actionnaire: "Investisseurs locaux + collectivité",
    directeurSportif: "Demba Touré", entraineur: "Luis Castro",
    forme: "SASP", siege: "Stade Marcel-Tribut, 59140 Dunkerque",
    ca: "~9 M€", employes: "~35", dette: "—", billetterie: "~0,4 M€", droitsTv: "~5 M€",
    equipementier: "Macron", sponsorMaillot: "Communauté Urbaine de Dunkerque",
    palmares: ["Promu L2 (2024)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  9855: {
    id: 9855, name: "Grenoble Foot 38", shortName: "Grenoble", league: "L2",
    surnom: "Les Rouge et Bleu", fondation: 1892,
    ville: "Grenoble", region: "Auvergne-Rhône-Alpes", population: "157 477 hab.",
    couleurs: { primary: "#003da5", secondary: "#ffffff" },
    stade: { nom: "Stade des Alpes", capacite: "20 068", inauguration: 2008, photo: "Stade_des_Alpes_Grenoble.jpg" },
    president: "Max-Alain Gradel", presidentDepuis: 2024,
    actionnaire: "Roberto Cravero / actionnariat italien",
    directeurSportif: "Maurizio Micheli", entraineur: "Vincent Hognon",
    forme: "SASP", siege: "Stade des Alpes, 38000 Grenoble",
    ca: "~14 M€", employes: "~45", dette: "—", billetterie: "~1,2 M€", droitsTv: "~6 M€",
    equipementier: "Macron", sponsorMaillot: "Caisse d'Épargne",
    palmares: ["Plus vieux club français en activité"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  8481: {
    id: 8481, name: "AS Nancy-Lorraine", shortName: "Nancy", league: "L2",
    surnom: "Les Chardons", fondation: 1967,
    ville: "Tomblaine (agglo. Nancy)", region: "Grand Est", population: "104 885 hab.",
    couleurs: { primary: "#e10600", secondary: "#ffffff" },
    stade: { nom: "Stade Marcel-Picot", capacite: "20 087", inauguration: 1926, photo: "Stade_Marcel-Picot_Nancy.jpg" },
    president: "Gauthier Ganaye", presidentDepuis: 2022,
    actionnaire: "PKP6 Capital / Saadiq Sapian",
    directeurSportif: "Cyril Serredszum", entraineur: "Pablo Correa",
    forme: "SASP", siege: "Stade Marcel-Picot, 54510 Tomblaine",
    ca: "~14 M€", employes: "~45", dette: "—", billetterie: "~1,1 M€", droitsTv: "~6 M€",
    equipementier: "Macron", sponsorMaillot: "Crédit Mutuel",
    palmares: ["1× Coupe de France (1978)", "1× Coupe de la Ligue (2006)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  4170: {
    id: 4170, name: "US Boulogne", shortName: "Boulogne", league: "L2",
    surnom: "Les Sang et Or", fondation: 1898,
    ville: "Boulogne-sur-Mer", region: "Hauts-de-France", population: "39 553 hab.",
    couleurs: { primary: "#e10600", secondary: "#1a1a1a" },
    stade: { nom: "Stade de la Libération", capacite: "7 139", inauguration: 1955, photo: "Stade_de_la_Libération_Boulogne.jpg" },
    president: "Christophe Cazé", presidentDepuis: 2020,
    actionnaire: "Investisseurs locaux",
    directeurSportif: "Olivier Quint", entraineur: "Vincent Bordot",
    forme: "SASP", siege: "Stade de la Libération, 62200 Boulogne-sur-Mer",
    ca: "~7 M€", employes: "~30", dette: "—", billetterie: "~0,3 M€", droitsTv: "~4 M€",
    equipementier: "Kappa", sponsorMaillot: "Boulogne-sur-Mer",
    palmares: ["Champion National 2024"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  7853: {
    id: 7853, name: "Stade Lavallois", shortName: "Laval", league: "L2",
    surnom: "Les Tango", fondation: 1902,
    ville: "Laval", region: "Pays de la Loire", population: "49 489 hab.",
    couleurs: { primary: "#f47b20", secondary: "#1a1a1a" },
    stade: { nom: "Stade Francis-Le Basser", capacite: "18 467", inauguration: 1971, photo: "Stade_Francis-Le_Basser.jpg" },
    president: "Laurent Lairy", presidentDepuis: 2018,
    actionnaire: "Société à actionnariat local",
    directeurSportif: "Stéphane Le Mignan", entraineur: "Anthony Robic",
    forme: "SASP", siege: "Stade Francis-Le Basser, 53000 Laval",
    ca: "~9 M€", employes: "~35", dette: "—", billetterie: "~0,6 M€", droitsTv: "~5 M€",
    equipementier: "Hummel", sponsorMaillot: "Crédit Mutuel",
    palmares: ["1× Champion L2 (1976)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  7794: {
    id: 7794, name: "SC Bastia", shortName: "Bastia", league: "L2",
    surnom: "Les Turchini / Lions de Furiani", fondation: 1905,
    ville: "Bastia", region: "Corse", population: "47 657 hab.",
    couleurs: { primary: "#003da5", secondary: "#ffffff" },
    stade: { nom: "Stade Armand-Cesari", capacite: "16 480", inauguration: 1932, photo: "Stade_Armand-Cesari.jpg" },
    president: "Pierre-Noël Luiggi", presidentDepuis: 2017,
    actionnaire: "Pierre-Noël Luiggi (Oscaro)",
    directeurSportif: "Mathieu Chabert", entraineur: "Benoît Tavenot",
    forme: "SASP", siege: "Stade Armand-Cesari, 20600 Furiani",
    ca: "~11 M€", employes: "~40", dette: "—", billetterie: "~0,9 M€", droitsTv: "~6 M€",
    equipementier: "Kappa", sponsorMaillot: "Corsica Ferries",
    palmares: ["1× Coupe de France (1981)", "Finaliste C3 1978"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
  8587: {
    id: 8587, name: "Amiens SC", shortName: "Amiens", league: "L2",
    surnom: "Les Licornes", fondation: 1901,
    ville: "Amiens", region: "Hauts-de-France", population: "133 755 hab.",
    couleurs: { primary: "#1a1a1a", secondary: "#ffffff" },
    stade: { nom: "Stade de la Licorne", capacite: "12 097", inauguration: 1999, photo: "Stade_de_la_Licorne_Amiens.jpg" },
    president: "Bernard Joannin", presidentDepuis: 2010,
    actionnaire: "Bernard Joannin / investisseurs",
    directeurSportif: "John Williams", entraineur: "Omar Daf",
    forme: "SASP", siege: "Stade de la Licorne, 80080 Amiens",
    ca: "~14 M€", employes: "~45", dette: "—", billetterie: "~1,1 M€", droitsTv: "~6 M€",
    equipementier: "Puma", sponsorMaillot: "Hauts-de-France",
    palmares: ["Finaliste Coupe de la Ligue 2011", "1× promu en L1 (2017)"],
    sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }],
  },
};

export const CLUB_PROFILES: Record<number, ClubProfile> = {
  ...CLUB_PROFILES_L1,
  ...CLUB_PROFILES_L2,
};

export function clubProfile(id: number): ClubProfile | undefined {
  return CLUB_PROFILES[id];
}
