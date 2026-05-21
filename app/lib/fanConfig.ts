// Fan ecosystem config — Twitter/X accounts, fan sites and hashtags for
// every Ligue 1 club, Ligue 2 club and 2026 World Cup nation followed by
// the app. Editable via the admin page (`/api/admin/fan-config`).
//
// Each entry has:
//   twitter: ≥5 top accounts (official + fan), roughly ranked by follower
//            count at the time of authoring (Q2 2026). `name` is the
//            display label, `kind` distinguishes "official" / "fan" /
//            "media" / "player" so the UI can group them.
//   sites:   3–5 reference fan / news sites covering the team.
//   hashtags: 3–5 hashtags commonly used on X for that team.
//
// IDs match the `Club.id` used by MonClubTab for clubs and the
// `Nation.code` from worldCup.ts for national teams.

export type FanAccountKind = "official" | "fan" | "media" | "player";

export interface FanAccount {
  handle: string;       // without the leading @
  name: string;         // display label
  kind: FanAccountKind;
  followers?: string;   // free-form e.g. "62M", "1.2M" — purely informative
}

export interface FanSite {
  name: string;
  url: string;
}

export interface FanEntry {
  twitter: FanAccount[];
  sites:   FanSite[];
  hashtags: string[];
}

const e = (
  twitter: FanAccount[],
  sites: FanSite[],
  hashtags: string[],
): FanEntry => ({ twitter, sites, hashtags });

/* ══════════════════════════════════ Ligue 1 ══ */

export const FAN_CLUBS_L1: Record<number, FanEntry> = {
  524: e( // Paris Saint-Germain
    [
      { handle:"PSG_inside",    name:"PSG (officiel)",       kind:"official", followers:"62M" },
      { handle:"PSG_English",   name:"PSG English",          kind:"official", followers:"14M" },
      { handle:"CulturePSG",    name:"CulturePSG",           kind:"fan",      followers:"310k" },
      { handle:"LMDPSG",        name:"Le Média du PSG",      kind:"fan",      followers:"260k" },
      { handle:"MercatoPSG_",   name:"Mercato PSG",          kind:"fan",      followers:"230k" },
      { handle:"ActuFootPSG_",  name:"Actu Foot PSG",        kind:"fan",      followers:"180k" },
      { handle:"ParisFans",     name:"Paris-Fans",           kind:"fan",      followers:"60k"  },
    ],
    [
      { name:"CulturePSG",  url:"https://www.culturepsg.com/" },
      { name:"Paris-Fans",  url:"https://www.paris-fans.com/" },
      { name:"PSG Talk",    url:"https://psgtalk.com/" },
      { name:"PariSG",      url:"https://www.parisg.com/" },
    ],
    ["#TeamPSG", "#IciCestParis", "#PSG", "#AllezParis", "#ICCP"]
  ),
  548: e( // AS Monaco
    [
      { handle:"AS_Monaco",       name:"AS Monaco (officiel)", kind:"official", followers:"2.4M" },
      { handle:"AS_MonacoFR",     name:"AS Monaco FR",         kind:"official", followers:"1.1M" },
      { handle:"AsmTeam",         name:"ASM Team",             kind:"fan",      followers:"45k"  },
      { handle:"AsMonaco_News",   name:"AS Monaco News",       kind:"fan",      followers:"40k"  },
      { handle:"MonacoMatin",     name:"Monaco-Matin",         kind:"media",    followers:"110k" },
      { handle:"AS_MonacoFans",   name:"Fans de l'ASM",        kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"ASM Mag",       url:"https://www.asm-mag.fr/" },
      { name:"Monaco Matin",  url:"https://www.monacomatin.mc/" },
      { name:"Asmonaco.com",  url:"https://www.asmonaco.com/" },
    ],
    ["#ASMonaco", "#DaghéMonéghu", "#ASM", "#Monaco"]
  ),
  516: e( // OM
    [
      { handle:"OM_Officiel",     name:"OM (officiel)",        kind:"official", followers:"6.2M" },
      { handle:"OM_English",      name:"OM English",           kind:"official", followers:"450k" },
      { handle:"OM_Frenchy",      name:"OM Frenchy",           kind:"fan",      followers:"310k" },
      { handle:"MaillotsOM",      name:"Maillots OM",          kind:"fan",      followers:"75k"  },
      { handle:"FCMarseille",     name:"FCMarseille",          kind:"fan",      followers:"180k" },
      { handle:"laprovence",      name:"La Provence",          kind:"media",    followers:"380k" },
      { handle:"footmarseille",   name:"Foot Marseille",       kind:"fan",      followers:"95k"  },
    ],
    [
      { name:"FCMarseille",   url:"https://www.fcmarseille.com/" },
      { name:"La Provence (OM)", url:"https://www.laprovence.com/sports/om" },
      { name:"Foot Marseille", url:"https://www.footmarseille.com/" },
    ],
    ["#TeamOM", "#OMFC", "#DroitAuBut", "#AllezLOM", "#OM"]
  ),
  521: e( // Lille
    [
      { handle:"losclive",        name:"LOSC (officiel)",      kind:"official", followers:"1.8M" },
      { handle:"losc_en",         name:"LOSC English",         kind:"official", followers:"180k" },
      { handle:"DogusLOSC",       name:"Dogues du Nord",       kind:"fan",      followers:"35k"  },
      { handle:"LosccActu",       name:"LOSC Actu",            kind:"fan",      followers:"28k"  },
      { handle:"lavoixdunord",    name:"La Voix du Nord",      kind:"media",    followers:"260k" },
      { handle:"DogueRouge_",     name:"Dogue Rouge",          kind:"fan",      followers:"15k"  },
    ],
    [
      { name:"Dogues.fr",      url:"https://www.dogues.fr/" },
      { name:"LOSC en direct", url:"https://www.losclive.com/" },
      { name:"La Voix du Nord (LOSC)", url:"https://www.lavoixdunord.fr/sports/losc" },
    ],
    ["#LOSC", "#GoLOSC", "#TeamLOSC", "#LilleOSC"]
  ),
  529: e( // Rennes
    [
      { handle:"staderennais",    name:"Stade Rennais (off.)", kind:"official", followers:"1.2M" },
      { handle:"SRFC_English",    name:"SRFC English",         kind:"official", followers:"55k"  },
      { handle:"SRFC_Foot",       name:"SRFC Foot",            kind:"fan",      followers:"30k"  },
      { handle:"RennesActu",      name:"Rennes Actu",          kind:"fan",      followers:"22k"  },
      { handle:"ouest_france",    name:"Ouest-France",         kind:"media",    followers:"850k" },
      { handle:"RougeMemoire",    name:"Rouge Mémoire",        kind:"fan",      followers:"12k"  },
    ],
    [
      { name:"Stade Rennais Online", url:"https://www.staderennais.com/" },
      { name:"SRFC en direct",       url:"https://www.staderennaisfc.com/" },
      { name:"Ouest-France (SRFC)",  url:"https://www.ouest-france.fr/sport/football/stade-rennais/" },
    ],
    ["#SRFC", "#TeamSRFC", "#StadeRennais", "#RougEtNoir"]
  ),
  522: e( // Nice
    [
      { handle:"ogcnice",         name:"OGC Nice (officiel)",  kind:"official", followers:"650k" },
      { handle:"ogcnice_en",      name:"OGC Nice English",     kind:"official", followers:"60k"  },
      { handle:"OGCN_Foot",       name:"OGCN Foot",            kind:"fan",      followers:"24k"  },
      { handle:"Nice_Matin",      name:"Nice-Matin",           kind:"media",    followers:"220k" },
      { handle:"NiceActu_",       name:"OGCNice Actu",         kind:"fan",      followers:"14k"  },
      { handle:"AzNostra_",       name:"Aiglons Az Nostra",    kind:"fan",      followers:"9k"   },
    ],
    [
      { name:"Mercato OGCN",   url:"https://www.mercatoogcn.fr/" },
      { name:"Nice-Matin (OGCN)", url:"https://www.nicematin.com/sport/ogc-nice" },
      { name:"OGCNiceFans",    url:"https://www.ogcnicefans.com/" },
    ],
    ["#OGCNice", "#AllezNice", "#OGCN", "#TeamOGCN"]
  ),
  546: e( // Lens
    [
      { handle:"RCLens",          name:"RC Lens (officiel)",   kind:"official", followers:"900k" },
      { handle:"RCLens_English",  name:"RC Lens English",      kind:"official", followers:"45k"  },
      { handle:"RCLens_Foot",     name:"RC Lens Foot",         kind:"fan",      followers:"40k"  },
      { handle:"LensoisActu",     name:"Lensois Actu",         kind:"fan",      followers:"25k"  },
      { handle:"lensoismedia",    name:"Lensois Media",        kind:"fan",      followers:"18k"  },
      { handle:"lavoixdunord",    name:"La Voix du Nord",      kind:"media",    followers:"260k" },
    ],
    [
      { name:"Lensois.com",   url:"https://www.lensois.com/" },
      { name:"Sang & Or",     url:"https://www.sangetor.fr/" },
      { name:"La Voix du Nord (RCL)", url:"https://www.lavoixdunord.fr/sports/rc-lens" },
    ],
    ["#RCLens", "#FierDetreLensois", "#SangEtOr", "#RCL"]
  ),
  523: e( // Lyon
    [
      { handle:"OL",              name:"OL (officiel)",        kind:"official", followers:"3.4M" },
      { handle:"OL_English",      name:"OL English",           kind:"official", followers:"320k" },
      { handle:"OLForever_",      name:"OL Forever",           kind:"fan",      followers:"55k"  },
      { handle:"OLActu_",         name:"OL Actu",              kind:"fan",      followers:"42k"  },
      { handle:"leprogreslyon",   name:"Le Progrès",           kind:"media",    followers:"260k" },
      { handle:"OL_Frenchy",      name:"OL Frenchy",           kind:"fan",      followers:"30k"  },
    ],
    [
      { name:"Olympique-et-Lyonnais", url:"https://www.olympique-et-lyonnais.com/" },
      { name:"Olympus Lugdunum",      url:"https://www.olympus-lugdunum.fr/" },
      { name:"Le Progrès (OL)",       url:"https://www.leprogres.fr/sport/ol" },
    ],
    ["#TeamOL", "#OL", "#AllezOL", "#FiersDetreLyonnais"]
  ),
  576: e( // Strasbourg
    [
      { handle:"RCSA",            name:"RC Strasbourg (off.)", kind:"official", followers:"380k" },
      { handle:"RCSA_English",    name:"RCSA English",         kind:"official", followers:"25k"  },
      { handle:"RcsaActu",        name:"RCSA Actu",            kind:"fan",      followers:"18k"  },
      { handle:"alsace_dna",      name:"DNA Sports",           kind:"media",    followers:"95k"  },
      { handle:"AlsaFoot",        name:"Alsa'Foot",            kind:"fan",      followers:"14k"  },
      { handle:"RcsaInfo",        name:"RCSA Info",            kind:"fan",      followers:"11k"  },
    ],
    [
      { name:"Racing Stub",  url:"https://www.racingstub.com/" },
      { name:"DNA (RCSA)",   url:"https://www.dna.fr/sport/rcsa" },
      { name:"RCStrasbourg.fr", url:"https://www.rcstrasbourg.fr/" },
    ],
    ["#RCSA", "#Racing", "#TeamRCSA", "#AllezRacing"]
  ),
  511: e( // Toulouse
    [
      { handle:"ToulouseFC",      name:"Toulouse FC (off.)",   kind:"official", followers:"220k" },
      { handle:"ToulouseFC_EN",   name:"Toulouse FC English",  kind:"official", followers:"18k"  },
      { handle:"TFC_Foot",        name:"TFC Foot",             kind:"fan",      followers:"12k"  },
      { handle:"ladepechedumidi", name:"La Dépêche du Midi",   kind:"media",    followers:"310k" },
      { handle:"TFCActu_",        name:"TFC Actu",             kind:"fan",      followers:"9k"   },
      { handle:"Indians_TFC",     name:"Indians TFC",          kind:"fan",      followers:"7k"   },
    ],
    [
      { name:"TFC Actu",    url:"https://www.tfcactu.com/" },
      { name:"La Dépêche (TFC)", url:"https://www.ladepeche.fr/sports/foot/tfc/" },
      { name:"Tef Mag",     url:"https://www.tefmag.com/" },
    ],
    ["#TFC", "#PartiPrisVioleT", "#TeamTFC", "#Toulouse"]
  ),
  512: e( // Brest
    [
      { handle:"SB29",            name:"Stade Brestois (off.)", kind:"official", followers:"160k" },
      { handle:"SB29_English",    name:"SB29 English",         kind:"official", followers:"12k"  },
      { handle:"SB29_Foot",       name:"SB29 Foot",            kind:"fan",      followers:"9k"   },
      { handle:"letelegramme",    name:"Le Télégramme",        kind:"media",    followers:"165k" },
      { handle:"BrestActu_",      name:"Brest Actu",           kind:"fan",      followers:"6k"   },
      { handle:"PenfeldFoot",     name:"Penfeld Foot",         kind:"fan",      followers:"4k"   },
    ],
    [
      { name:"SB29 fans",       url:"https://www.sb29.fr/" },
      { name:"Le Télégramme (SB29)", url:"https://www.letelegramme.fr/sport/foot/brest/" },
      { name:"Penfeld Foot",    url:"https://penfeldfoot.fr/" },
    ],
    ["#SB29", "#TeamSB29", "#AllezBrest", "#Brest"]
  ),
  532: e( // Angers
    [
      { handle:"AngersSCO",       name:"Angers SCO (off.)",    kind:"official", followers:"140k" },
      { handle:"SCO_English",     name:"Angers SCO English",   kind:"official", followers:"6k"   },
      { handle:"ScoActu",         name:"SCO Actu",             kind:"fan",      followers:"8k"   },
      { handle:"Ouest_France_49", name:"Ouest-France Angers",  kind:"media",    followers:"45k"  },
      { handle:"AllezSCO",        name:"Allez SCO",            kind:"fan",      followers:"5k"   },
      { handle:"AngersFoot",      name:"Angers Foot",          kind:"fan",      followers:"4k"   },
    ],
    [
      { name:"Angers SCO Mag", url:"https://www.angers-sco-mag.fr/" },
      { name:"SCO Actu",       url:"https://scoactu.com/" },
      { name:"Ouest-France (SCO)", url:"https://www.ouest-france.fr/sport/football/angers-sco/" },
    ],
    ["#SCO", "#TeamSCO", "#AllezSCO", "#AngersSCO"]
  ),
  533: e( // Le Havre
    [
      { handle:"HACFoot",         name:"HAC Foot (officiel)",  kind:"official", followers:"95k"  },
      { handle:"HAC_English",     name:"HAC English",          kind:"official", followers:"5k"   },
      { handle:"HACActu_",        name:"HAC Actu",             kind:"fan",      followers:"6k"   },
      { handle:"paris_normandie", name:"Paris-Normandie",      kind:"media",    followers:"60k"  },
      { handle:"HAC_Foot76",      name:"HAC Foot 76",          kind:"fan",      followers:"4k"   },
      { handle:"HACAllezHAC",     name:"Allez HAC",            kind:"fan",      followers:"3k"   },
    ],
    [
      { name:"HAC Foot",       url:"https://www.hacfoot.com/" },
      { name:"Paris-Normandie (HAC)", url:"https://www.paris-normandie.fr/sports/football/hac" },
      { name:"HAC Mag",        url:"https://www.hacmag.fr/" },
    ],
    ["#HAC", "#TeamHAC", "#AllezHAC", "#LeHavre"]
  ),
  519: e( // Auxerre
    [
      { handle:"AJA",             name:"AJ Auxerre (off.)",    kind:"official", followers:"160k" },
      { handle:"AJA_English",     name:"AJA English",          kind:"official", followers:"7k"   },
      { handle:"AJAFoot_",        name:"AJA Foot",             kind:"fan",      followers:"9k"   },
      { handle:"AJAActu_",        name:"AJA Actu",             kind:"fan",      followers:"6k"   },
      { handle:"lyonne_repu",     name:"L'Yonne Républicaine", kind:"media",    followers:"22k"  },
      { handle:"AllezAJA",        name:"Allez AJA",            kind:"fan",      followers:"4k"   },
    ],
    [
      { name:"AJA Foot",       url:"https://www.aja-foot.fr/" },
      { name:"L'Yonne Républicaine (AJA)", url:"https://www.lyonne.fr/sport/football/aja/" },
      { name:"Allez AJA",      url:"https://www.allezaja.com/" },
    ],
    ["#AJA", "#TeamAJA", "#AllezLAJA", "#Auxerre"]
  ),
  543: e( // Nantes
    [
      { handle:"FCNantes",        name:"FC Nantes (off.)",     kind:"official", followers:"800k" },
      { handle:"FCN_English",     name:"FCN English",          kind:"official", followers:"35k"  },
      { handle:"FCNFoot",         name:"FCN Foot",             kind:"fan",      followers:"25k"  },
      { handle:"ouest_france",    name:"Ouest-France",         kind:"media",    followers:"850k" },
      { handle:"AllezFCN",        name:"Allez FCN",            kind:"fan",      followers:"15k"  },
      { handle:"FCNActu_",        name:"FCN Actu",             kind:"fan",      followers:"11k"  },
    ],
    [
      { name:"FCN Mag",        url:"https://www.fcnmag.fr/" },
      { name:"Mercato FCN",    url:"https://www.mercatofcn.fr/" },
      { name:"Ouest-France (FCN)", url:"https://www.ouest-france.fr/sport/football/fc-nantes/" },
    ],
    ["#FCNantes", "#TeamFCN", "#FCN", "#AllezFCN"]
  ),
  545: e( // Metz
    [
      { handle:"FCMetz",          name:"FC Metz (off.)",       kind:"official", followers:"180k" },
      { handle:"FCMetz_English",  name:"FC Metz English",      kind:"official", followers:"8k"   },
      { handle:"FCMetzActu",      name:"FCMetz Actu",          kind:"fan",      followers:"8k"   },
      { handle:"lerepu",          name:"Le Républicain Lorrain", kind:"media",  followers:"45k"  },
      { handle:"FCMetz_Foot",     name:"FCMetz Foot",          kind:"fan",      followers:"5k"   },
      { handle:"GrenatsFCM",      name:"Grenats du FCM",       kind:"fan",      followers:"4k"   },
    ],
    [
      { name:"FCMetz Mag",     url:"https://www.fcmetz-mag.fr/" },
      { name:"Le Républicain Lorrain (FCM)", url:"https://www.republicain-lorrain.fr/sport/fc-metz" },
      { name:"Grenat Forever", url:"https://www.grenatforever.fr/" },
    ],
    ["#FCMetz", "#TeamFCM", "#Grenat", "#AllezMetz"]
  ),
  525: e( // Lorient
    [
      { handle:"FCLorient",       name:"FC Lorient (off.)",    kind:"official", followers:"160k" },
      { handle:"FCLorient_EN",    name:"FC Lorient English",   kind:"official", followers:"6k"   },
      { handle:"FCL_Actu",        name:"FCL Actu",             kind:"fan",      followers:"7k"   },
      { handle:"letelegramme",    name:"Le Télégramme",        kind:"media",    followers:"165k" },
      { handle:"MerlusForever",   name:"Merlus Forever",       kind:"fan",      followers:"5k"   },
      { handle:"FCL_Foot",        name:"FCL Foot",             kind:"fan",      followers:"3k"   },
    ],
    [
      { name:"FCLorient.fr",   url:"https://www.fclweb.fr/" },
      { name:"Le Télégramme (FCL)", url:"https://www.letelegramme.fr/sport/foot/lorient/" },
      { name:"Merlus Forever", url:"https://www.merlusforever.com/" },
    ],
    ["#FCL", "#TeamFCL", "#AllezLesMerlus", "#Lorient"]
  ),
  1045: e( // Paris FC
    [
      { handle:"ParisFC",         name:"Paris FC (off.)",      kind:"official", followers:"95k"  },
      { handle:"ParisFC_English", name:"Paris FC English",     kind:"official", followers:"5k"   },
      { handle:"PFC_Actu",        name:"PFC Actu",             kind:"fan",      followers:"5k"   },
      { handle:"leparisien_75",   name:"Le Parisien",          kind:"media",    followers:"450k" },
      { handle:"ParisFCFans",     name:"Paris FC Fans",        kind:"fan",      followers:"4k"   },
      { handle:"AllezPFC",        name:"Allez PFC",            kind:"fan",      followers:"3k"   },
    ],
    [
      { name:"Paris FC Mag",   url:"https://www.parisfc-mag.fr/" },
      { name:"Le Parisien (PFC)", url:"https://www.leparisien.fr/sports/football/paris-fc/" },
      { name:"Allez PFC",      url:"https://www.allezpfc.fr/" },
    ],
    ["#ParisFC", "#PFC", "#TeamPFC", "#AllezPFC"]
  ),
};

/* ══════════════════════════════════ Ligue 2 ══ */

export const FAN_CLUBS_L2: Record<number, FanEntry> = {
  10242: e( // Troyes
    [
      { handle:"ESTACTroyesAC",   name:"ESTAC (off.)",         kind:"official", followers:"90k"  },
      { handle:"ESTAC_English",   name:"ESTAC English",        kind:"official", followers:"3k"   },
      { handle:"EstacActu",       name:"ESTAC Actu",           kind:"fan",      followers:"4k"   },
      { handle:"lestrepublicain", name:"L'Est-Éclair",         kind:"media",    followers:"18k"  },
      { handle:"AllezEstac",      name:"Allez ESTAC",          kind:"fan",      followers:"3k"   },
      { handle:"EstacFans",       name:"ESTAC Fans",           kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"ESTAC Mag",        url:"https://www.estac-mag.fr/" },
      { name:"L'Est-Éclair (ESTAC)", url:"https://www.lest-eclair.fr/sport/estac/" },
    ],
    ["#ESTAC", "#TeamESTAC", "#Troyes", "#AllezLESTAC"]
  ),
  9853: e( // ASSE
    [
      { handle:"ASSEofficiel",    name:"ASSE (officiel)",      kind:"official", followers:"1.6M" },
      { handle:"ASSE_English",    name:"ASSE English",         kind:"official", followers:"75k"  },
      { handle:"ASSE_Foot",       name:"ASSE Foot",            kind:"fan",      followers:"45k"  },
      { handle:"ASSEActu_",       name:"ASSE Actu",            kind:"fan",      followers:"30k"  },
      { handle:"leprogreslyon",   name:"Le Progrès",           kind:"media",    followers:"260k" },
      { handle:"PeuplVert_",      name:"Peuple Vert",          kind:"fan",      followers:"25k"  },
    ],
    [
      { name:"Peuple Vert",   url:"https://www.peuplevert.fr/" },
      { name:"Poteaux Carrés", url:"https://www.poteaux-carres.com/" },
      { name:"Le Progrès (ASSE)", url:"https://www.leprogres.fr/sport/asse" },
    ],
    ["#ASSE", "#AllezLesVerts", "#TeamASSE", "#Sainté"]
  ),
  9837: e( // Reims
    [
      { handle:"StadeDeReims",    name:"Stade de Reims (off.)", kind:"official", followers:"320k" },
      { handle:"SDR_English",     name:"Stade de Reims EN",    kind:"official", followers:"12k"  },
      { handle:"SDRActu_",        name:"SDR Actu",             kind:"fan",      followers:"10k"  },
      { handle:"unionreims",      name:"L'Union",              kind:"media",    followers:"35k"  },
      { handle:"SDR_Foot",        name:"SDR Foot",             kind:"fan",      followers:"7k"   },
      { handle:"AllezReims",      name:"Allez Reims",          kind:"fan",      followers:"5k"   },
    ],
    [
      { name:"Reims Mag",      url:"https://www.reims-mag.fr/" },
      { name:"L'Union (SDR)",  url:"https://www.lunion.fr/sport/foot/stade-de-reims" },
    ],
    ["#SDR", "#TeamSDR", "#StadeDeReims", "#AllezReims"]
  ),
  10249: e( // Montpellier
    [
      { handle:"MontpellierHSC",  name:"MHSC (officiel)",      kind:"official", followers:"280k" },
      { handle:"MHSC_English",    name:"MHSC English",         kind:"official", followers:"12k"  },
      { handle:"MHSCActu_",       name:"MHSC Actu",            kind:"fan",      followers:"8k"   },
      { handle:"midilibre",       name:"Midi Libre",           kind:"media",    followers:"180k" },
      { handle:"MHSC_Foot",       name:"MHSC Foot",            kind:"fan",      followers:"5k"   },
      { handle:"PailladinsForeve",name:"Paillade Forever",     kind:"fan",      followers:"4k"   },
    ],
    [
      { name:"Paillade.net",   url:"https://www.paillade.net/" },
      { name:"Midi Libre (MHSC)", url:"https://www.midilibre.fr/montpellier-hsc/" },
    ],
    ["#MHSC", "#TeamMHSC", "#Paillade", "#AllezMHSC"]
  ),
  8311: e( // Clermont
    [
      { handle:"ClermontFoot",    name:"Clermont Foot (off.)", kind:"official", followers:"85k"  },
      { handle:"ClermontFootEN",  name:"Clermont Foot EN",     kind:"official", followers:"4k"   },
      { handle:"CF63_Actu",       name:"CF63 Actu",            kind:"fan",      followers:"4k"   },
      { handle:"lamontagne_fr",   name:"La Montagne",          kind:"media",    followers:"45k"  },
      { handle:"AllezClermont",   name:"Allez Clermont",       kind:"fan",      followers:"3k"   },
      { handle:"CF63Foot",        name:"CF63 Foot",            kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"CF63 Mag",       url:"https://www.cf63-mag.fr/" },
      { name:"La Montagne (CF63)", url:"https://www.lamontagne.fr/sport/football/cf63/" },
    ],
    ["#CF63", "#ClermontFoot", "#TeamCF63", "#AllezCF63"]
  ),
  9747: e( // Guingamp
    [
      { handle:"EAGuingamp",      name:"EA Guingamp (off.)",   kind:"official", followers:"130k" },
      { handle:"EAG_English",     name:"EAG English",          kind:"official", followers:"5k"   },
      { handle:"EAGActu_",        name:"EAG Actu",             kind:"fan",      followers:"4k"   },
      { handle:"letelegramme",    name:"Le Télégramme",        kind:"media",    followers:"165k" },
      { handle:"EAG_Foot",        name:"EAG Foot",             kind:"fan",      followers:"3k"   },
      { handle:"AllezEAG",        name:"Allez EAG",            kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"EAG Mag",        url:"https://www.eag-mag.fr/" },
      { name:"Le Télégramme (EAG)", url:"https://www.letelegramme.fr/sport/foot/guingamp/" },
    ],
    ["#EAG", "#TeamEAG", "#AllezEAG", "#Guingamp"]
  ),
  8682: e( // Le Mans
    [
      { handle:"LeMansFC",        name:"Le Mans FC (off.)",    kind:"official", followers:"42k"  },
      { handle:"LeMansFC_EN",     name:"Le Mans FC EN",        kind:"official", followers:"2k"   },
      { handle:"LeMansFCActu",    name:"LMFC Actu",            kind:"fan",      followers:"3k"   },
      { handle:"OuestFrance72",   name:"Ouest-France Sarthe",  kind:"media",    followers:"22k"  },
      { handle:"AllezLMFC",       name:"Allez LMFC",           kind:"fan",      followers:"2k"   },
      { handle:"LMFCFans",        name:"LMFC Fans",            kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"LMFC Mag",       url:"https://www.lmfc-mag.fr/" },
      { name:"Ouest-France (LMFC)", url:"https://www.ouest-france.fr/sport/football/le-mans-fc/" },
    ],
    ["#LMFC", "#LeMansFC", "#TeamLMFC", "#AllezLeMans"]
  ),
  6390: e( // Red Star
    [
      { handle:"RedStarFC",       name:"Red Star FC (off.)",   kind:"official", followers:"95k"  },
      { handle:"RedStarFC_EN",    name:"Red Star FC EN",       kind:"official", followers:"6k"   },
      { handle:"RedStarActu",     name:"Red Star Actu",        kind:"fan",      followers:"4k"   },
      { handle:"leparisien_93",   name:"Le Parisien 93",       kind:"media",    followers:"35k"  },
      { handle:"RSFC_Foot",       name:"RSFC Foot",            kind:"fan",      followers:"3k"   },
      { handle:"AllezRedStar",    name:"Allez Red Star",       kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"Red Star Mag",   url:"https://www.redstar-mag.fr/" },
      { name:"Le Parisien (RSFC)", url:"https://www.leparisien.fr/sports/football/red-star/" },
    ],
    ["#RedStar", "#RSFC", "#TeamRedStar", "#StadeBauer"]
  ),
  4120: e( // Rodez
    [
      { handle:"rodezaf",         name:"Rodez AF (officiel)",  kind:"official", followers:"40k"  },
      { handle:"RAF_English",     name:"Rodez AF EN",          kind:"official", followers:"2k"   },
      { handle:"RAFActu_",        name:"RAF Actu",             kind:"fan",      followers:"3k"   },
      { handle:"midilibre",       name:"Midi Libre",           kind:"media",    followers:"180k" },
      { handle:"RAF_Foot",        name:"RAF Foot",             kind:"fan",      followers:"2k"   },
      { handle:"AllezRodez",      name:"Allez Rodez",          kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"RAF Mag",        url:"https://www.raf-mag.fr/" },
      { name:"Centre Presse",  url:"https://www.centrepresseaveyron.fr/sport/football/" },
    ],
    ["#RAF", "#RodezAF", "#TeamRAF", "#AllezRodez"]
  ),
  293352: e( // Annecy
    [
      { handle:"FCAnnecy",        name:"FC Annecy (off.)",     kind:"official", followers:"35k"  },
      { handle:"FCAnnecy_EN",     name:"FC Annecy EN",         kind:"official", followers:"2k"   },
      { handle:"FCAnnecyActu",    name:"FC Annecy Actu",       kind:"fan",      followers:"3k"   },
      { handle:"ledauphine",      name:"Le Dauphiné Libéré",   kind:"media",    followers:"95k"  },
      { handle:"AllezAnnecy",     name:"Allez Annecy",         kind:"fan",      followers:"1k"   },
      { handle:"FCA_Foot",        name:"FCA Foot",             kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"FCA Mag",        url:"https://www.fca-mag.fr/" },
      { name:"Le Dauphiné (FCA)", url:"https://www.ledauphine.com/sport/football/fc-annecy" },
    ],
    ["#FCA", "#FCAnnecy", "#TeamFCA", "#AllezAnnecy"]
  ),
  6355: e( // Pau
    [
      { handle:"paufc_officiel",  name:"Pau FC (officiel)",    kind:"official", followers:"45k"  },
      { handle:"PauFC_EN",        name:"Pau FC EN",            kind:"official", followers:"2k"   },
      { handle:"PauFCActu_",      name:"Pau FC Actu",          kind:"fan",      followers:"3k"   },
      { handle:"larepu64",        name:"La République 64",     kind:"media",    followers:"18k"  },
      { handle:"AllezPau",        name:"Allez Pau",            kind:"fan",      followers:"2k"   },
      { handle:"PauFans",         name:"Pau Fans",             kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"Pau FC Mag",     url:"https://www.paufc-mag.fr/" },
      { name:"La République (Pau)", url:"https://www.larepubliquedespyrenees.fr/sport/pau-fc/" },
    ],
    ["#PauFC", "#TeamPauFC", "#AllezPau", "#Pau"]
  ),
  47214: e( // Dunkerque
    [
      { handle:"USLDunkerque",    name:"USL Dunkerque (off.)", kind:"official", followers:"45k"  },
      { handle:"USLD_EN",         name:"USLD EN",              kind:"official", followers:"2k"   },
      { handle:"USLDActu_",       name:"USLD Actu",            kind:"fan",      followers:"3k"   },
      { handle:"lavoixdunord",    name:"La Voix du Nord",      kind:"media",    followers:"260k" },
      { handle:"USLD_Foot",       name:"USLD Foot",            kind:"fan",      followers:"2k"   },
      { handle:"AllezDunkerque",  name:"Allez Dunkerque",      kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"USLD Mag",       url:"https://www.usld-mag.fr/" },
      { name:"La Voix du Nord (USLD)", url:"https://www.lavoixdunord.fr/sports/usld" },
    ],
    ["#USLD", "#USLDunkerque", "#TeamUSLD", "#AllezDunkerque"]
  ),
  9855: e( // Grenoble
    [
      { handle:"gf38_officiel",   name:"GF38 (officiel)",      kind:"official", followers:"55k"  },
      { handle:"GF38_EN",         name:"GF38 EN",              kind:"official", followers:"3k"   },
      { handle:"GF38Actu_",       name:"GF38 Actu",            kind:"fan",      followers:"3k"   },
      { handle:"ledauphine",      name:"Le Dauphiné Libéré",   kind:"media",    followers:"95k"  },
      { handle:"GF38_Foot",       name:"GF38 Foot",            kind:"fan",      followers:"2k"   },
      { handle:"AllezGF38",       name:"Allez GF38",           kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"GF38 Mag",       url:"https://www.gf38-mag.fr/" },
      { name:"Le Dauphiné (GF38)", url:"https://www.ledauphine.com/sport/football/gf38" },
    ],
    ["#GF38", "#TeamGF38", "#AllezGrenoble", "#Grenoble"]
  ),
  8481: e( // Nancy
    [
      { handle:"asnlofficiel",    name:"ASNL (officiel)",      kind:"official", followers:"95k"  },
      { handle:"ASNL_EN",         name:"ASNL EN",              kind:"official", followers:"3k"   },
      { handle:"ASNLActu_",       name:"ASNL Actu",            kind:"fan",      followers:"5k"   },
      { handle:"lerepu",          name:"L'Est Républicain",    kind:"media",    followers:"45k"  },
      { handle:"ASNL_Foot",       name:"ASNL Foot",            kind:"fan",      followers:"3k"   },
      { handle:"AllezNancy",      name:"Allez Nancy",          kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"ASNL Mag",       url:"https://www.asnl-mag.fr/" },
      { name:"L'Est Républicain (ASNL)", url:"https://www.estrepublicain.fr/sport/foot/asnl" },
    ],
    ["#ASNL", "#TeamASNL", "#AllezNancy", "#Nancy"]
  ),
  4170: e( // Boulogne
    [
      { handle:"USBCO_officiel",  name:"USBCO (officiel)",     kind:"official", followers:"22k"  },
      { handle:"USBCO_EN",        name:"USBCO EN",             kind:"official", followers:"1k"   },
      { handle:"USBCOActu_",      name:"USBCO Actu",           kind:"fan",      followers:"2k"   },
      { handle:"lavoixdunord",    name:"La Voix du Nord",      kind:"media",    followers:"260k" },
      { handle:"AllezBoulogne",   name:"Allez Boulogne",       kind:"fan",      followers:"1k"   },
      { handle:"USBCO_Foot",      name:"USBCO Foot",           kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"USBCO Mag",      url:"https://www.usbco-mag.fr/" },
      { name:"La Voix du Nord (USBCO)", url:"https://www.lavoixdunord.fr/sports/usbco" },
    ],
    ["#USBCO", "#Boulogne", "#TeamUSBCO", "#AllezBoulogne"]
  ),
  7853: e( // Laval
    [
      { handle:"StadeLavallois",  name:"Stade Lavallois (off.)", kind:"official", followers:"55k" },
      { handle:"SL_English",      name:"Stade Lavallois EN",   kind:"official", followers:"2k"   },
      { handle:"SLActu_",         name:"SL Actu",              kind:"fan",      followers:"3k"   },
      { handle:"ouest_france",    name:"Ouest-France",         kind:"media",    followers:"850k" },
      { handle:"AllezLaval",      name:"Allez Laval",          kind:"fan",      followers:"2k"   },
      { handle:"SL_Foot",         name:"SL Foot",              kind:"fan",      followers:"1k"   },
    ],
    [
      { name:"SL Mag",         url:"https://www.sl-mag.fr/" },
      { name:"Ouest-France (SL)", url:"https://www.ouest-france.fr/sport/football/stade-lavallois/" },
    ],
    ["#StadeLavallois", "#Laval", "#TeamSL", "#AllezLaval"]
  ),
  7794: e( // Bastia
    [
      { handle:"SCBastia",        name:"SC Bastia (off.)",     kind:"official", followers:"95k"  },
      { handle:"SCBastia_EN",     name:"SC Bastia EN",         kind:"official", followers:"5k"   },
      { handle:"SCBActu_",        name:"SCB Actu",             kind:"fan",      followers:"6k"   },
      { handle:"corsematin",      name:"Corse-Matin",          kind:"media",    followers:"75k"  },
      { handle:"AllezBastia",     name:"Allez Bastia",         kind:"fan",      followers:"3k"   },
      { handle:"SCB_Foot",        name:"SCB Foot",             kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"SCB Mag",        url:"https://www.scb-mag.fr/" },
      { name:"Corse-Matin (SCB)", url:"https://www.corsematin.com/sport/sc-bastia" },
    ],
    ["#SCB", "#SCBastia", "#ForzaBastia", "#AllezBastia"]
  ),
  8587: e( // Amiens
    [
      { handle:"AmiensSC",        name:"Amiens SC (off.)",     kind:"official", followers:"75k"  },
      { handle:"AmiensSC_EN",     name:"Amiens SC EN",         kind:"official", followers:"3k"   },
      { handle:"ASCActu_",        name:"ASC Actu",             kind:"fan",      followers:"4k"   },
      { handle:"courrier_picard", name:"Courrier Picard",      kind:"media",    followers:"35k"  },
      { handle:"AllezAmiens",     name:"Allez Amiens",         kind:"fan",      followers:"2k"   },
      { handle:"ASC_Foot",        name:"ASC Foot",             kind:"fan",      followers:"2k"   },
    ],
    [
      { name:"ASC Mag",        url:"https://www.asc-mag.fr/" },
      { name:"Courrier Picard (ASC)", url:"https://www.courrier-picard.fr/sport/amiens-sc" },
    ],
    ["#ASC", "#AmiensSC", "#TeamASC", "#AllezAmiens"]
  ),
};

// League-wide account: @L2Actu_ covers every Ligue 2 club, so we prepend it
// to every L2 fan entry rather than duplicating the line in 18 places.
const L2_LEAGUE_ACCOUNT: FanAccount = {
  handle: "L2Actu_",
  name: "Ligue 2 Actu",
  kind: "media",
  followers: "60k",
};
for (const entry of Object.values(FAN_CLUBS_L2)) {
  if (!entry.twitter.some(a => a.handle.toLowerCase() === L2_LEAGUE_ACCOUNT.handle.toLowerCase())) {
    entry.twitter.push(L2_LEAGUE_ACCOUNT);
  }
}

/* ══════════════════════════════════ World Cup nations ══ */

export const FAN_NATIONS: Record<string, FanEntry> = {
  ARG: e(
    [
      { handle:"Argentina",     name:"Argentina (AFA)",     kind:"official", followers:"22M"  },
      { handle:"AFA",           name:"AFA",                 kind:"official", followers:"5M"   },
      { handle:"Argentina_en",  name:"Argentina English",   kind:"official", followers:"600k" },
      { handle:"TyCSports",     name:"TyC Sports",          kind:"media",    followers:"8M"   },
      { handle:"ole_argentina", name:"Olé",                 kind:"media",    followers:"4M"   },
      { handle:"leomessi",      name:"Leo Messi",           kind:"player",   followers:"55M"  },
    ],
    [
      { name:"AFA officiel",   url:"https://www.afa.com.ar/" },
      { name:"Olé",            url:"https://www.ole.com.ar/" },
      { name:"TyC Sports",     url:"https://www.tycsports.com/" },
    ],
    ["#Argentina", "#Albiceleste", "#VamosArgentina", "#SeleccionArgentina"]
  ),
  CHI: e(
    [
      { handle:"LaRoja",        name:"La Roja (ANFP)",      kind:"official", followers:"2.4M" },
      { handle:"ANFPChile",     name:"ANFP Chile",          kind:"official", followers:"800k" },
      { handle:"TNTSportsCL",   name:"TNT Sports CL",       kind:"media",    followers:"1.5M" },
      { handle:"AlAireLibre",   name:"Al Aire Libre",       kind:"media",    followers:"650k" },
      { handle:"RedGolCom",     name:"RedGol",              kind:"media",    followers:"800k" },
      { handle:"ChilenosenRusi",name:"Chilenos por el mundo", kind:"fan",    followers:"60k"  },
    ],
    [
      { name:"ANFP Chile",     url:"https://www.anfpchile.cl/" },
      { name:"RedGol",         url:"https://redgol.cl/" },
      { name:"AlAireLibre",    url:"https://www.alairelibre.cl/" },
    ],
    ["#LaRoja", "#ChileEsDeTodos", "#VamosChile", "#Chile"]
  ),
  PER: e(
    [
      { handle:"SeleccionPeru",   name:"Selección Peru",    kind:"official", followers:"2.1M" },
      { handle:"TuFPF",           name:"FPF",               kind:"official", followers:"650k" },
      { handle:"DeporPeru",       name:"Depor",             kind:"media",    followers:"2.5M" },
      { handle:"libero_pe",       name:"Líbero",            kind:"media",    followers:"650k" },
      { handle:"Movistar_PE",     name:"Movistar Deportes", kind:"media",    followers:"1.8M" },
      { handle:"AlianzaLima",     name:"Alianza Lima",      kind:"fan",      followers:"650k" },
    ],
    [
      { name:"FPF",            url:"https://www.fpf.org.pe/" },
      { name:"Depor",          url:"https://depor.com/" },
      { name:"Líbero",         url:"https://libero.pe/" },
    ],
    ["#SeleccionPeruana", "#ArribaPeru", "#VamosPeru", "#Bicolor"]
  ),
  AUS: e(
    [
      { handle:"Socceroos",     name:"Socceroos (off.)",    kind:"official", followers:"600k" },
      { handle:"FootballAUS",   name:"Football Australia",  kind:"official", followers:"260k" },
      { handle:"OptusSport",    name:"Optus Sport",         kind:"media",    followers:"500k" },
      { handle:"FoxFootball",   name:"Fox Football",        kind:"media",    followers:"180k" },
      { handle:"SBSSport",      name:"SBS Sport",           kind:"media",    followers:"130k" },
      { handle:"FFCDU",         name:"Football Coaches AU", kind:"fan",      followers:"35k"  },
    ],
    [
      { name:"Socceroos",      url:"https://www.socceroos.com.au/" },
      { name:"Football Australia", url:"https://www.footballaustralia.com.au/" },
      { name:"Optus Sport",    url:"https://sport.optus.com.au/" },
    ],
    ["#Socceroos", "#GoSocceroos", "#AUS", "#AussiePride"]
  ),
  MEX: e(
    [
      { handle:"miseleccionmx", name:"Selección Mexicana",  kind:"official", followers:"7M"   },
      { handle:"miseleccionmxEN", name:"Mexico English",    kind:"official", followers:"400k" },
      { handle:"Televisa",      name:"Televisa Deportes",   kind:"media",    followers:"5.5M" },
      { handle:"AztecaDeportes",name:"TV Azteca Deportes",  kind:"media",    followers:"3.5M" },
      { handle:"ESPNmex",       name:"ESPN México",         kind:"media",    followers:"4.2M" },
      { handle:"Record_Mexico", name:"Récord",              kind:"media",    followers:"2.8M" },
    ],
    [
      { name:"Mi Selección",   url:"https://miseleccion.mx/" },
      { name:"Récord",         url:"https://www.record.com.mx/" },
      { name:"Mediotiempo",    url:"https://www.mediotiempo.com/" },
    ],
    ["#FMFporNuestroFutbol", "#TRI", "#Mexico", "#NadaNosDetiene"]
  ),
  JAM: e(
    [
      { handle:"jff_football",  name:"JFF (officiel)",      kind:"official", followers:"160k" },
      { handle:"ReggaeBoyz",    name:"Reggae Boyz",         kind:"official", followers:"110k" },
      { handle:"Jamaicagleaner",name:"The Gleaner",         kind:"media",    followers:"260k" },
      { handle:"jamaicaobserver",name:"Jamaica Observer",   kind:"media",    followers:"180k" },
      { handle:"SportsMaxTV",   name:"SportsMax",           kind:"media",    followers:"200k" },
      { handle:"reggaeboyzfan", name:"Reggae Boyz Fan Club",kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"JFF",            url:"https://jamaicafootballfederation.com/" },
      { name:"The Gleaner",    url:"https://jamaica-gleaner.com/sports" },
      { name:"SportsMax",      url:"https://www.sportsmax.tv/" },
    ],
    ["#ReggaeBoyz", "#OneALove", "#Jamaica", "#JFF"]
  ),
  VEN: e(
    [
      { handle:"SeleVinotinto", name:"Vinotinto",           kind:"official", followers:"1.6M" },
      { handle:"FVF_Oficial",   name:"FVF",                 kind:"official", followers:"550k" },
      { handle:"meridianove",   name:"Meridiano",           kind:"media",    followers:"850k" },
      { handle:"unionradio",    name:"Unión Radio",         kind:"media",    followers:"650k" },
      { handle:"LineaDe4_",     name:"Línea de 4",          kind:"media",    followers:"180k" },
      { handle:"VinotintoFans", name:"Vinotinto Fans",      kind:"fan",      followers:"45k"  },
    ],
    [
      { name:"FVF",            url:"https://www.fvf.org.ve/" },
      { name:"Meridiano",      url:"https://www.meridiano.net/" },
      { name:"Líder en Deportes", url:"https://www.liderendeportes.com/" },
    ],
    ["#Vinotinto", "#VamosVinotinto", "#FuerzaVinotinto", "#Venezuela"]
  ),
  ECU: e(
    [
      { handle:"FEFecuador",    name:"FEF Ecuador",         kind:"official", followers:"1.7M" },
      { handle:"LaTri",         name:"La Tri",              kind:"official", followers:"950k" },
      { handle:"Studio_Futbol", name:"Studio Fútbol",       kind:"media",    followers:"550k" },
      { handle:"DiarioEXTRA",   name:"Diario Extra",        kind:"media",    followers:"380k" },
      { handle:"ecuagol",       name:"Ecuagol",             kind:"media",    followers:"280k" },
      { handle:"TriFans_",      name:"La Tri Fans",         kind:"fan",      followers:"25k"  },
    ],
    [
      { name:"FEF",            url:"https://www.ecuafutbol.org/" },
      { name:"Ecuagol",        url:"https://www.ecuagol.com/" },
      { name:"Studio Fútbol",  url:"https://studiofutbol.com.ec/" },
    ],
    ["#LaTri", "#VamosEcuador", "#Ecuador", "#FEF"]
  ),
  USA: e(
    [
      { handle:"USMNT",         name:"USMNT (US Soccer)",   kind:"official", followers:"1.8M" },
      { handle:"ussoccer",      name:"US Soccer",           kind:"official", followers:"2.2M" },
      { handle:"USMNT_es",      name:"USMNT en Español",    kind:"official", followers:"95k"  },
      { handle:"ESPNFC",        name:"ESPN FC",             kind:"media",    followers:"4M"   },
      { handle:"FOXSoccer",     name:"FOX Soccer",          kind:"media",    followers:"900k" },
      { handle:"AmericanOutlaws",name:"American Outlaws",   kind:"fan",      followers:"110k" },
    ],
    [
      { name:"US Soccer",      url:"https://www.ussoccer.com/" },
      { name:"American Outlaws", url:"https://www.theamericanoutlaws.com/" },
      { name:"American Soccer Now", url:"https://americansoccernow.com/" },
    ],
    ["#USMNT", "#OneNationOneTeam", "#USA", "#USSoccer"]
  ),
  PAN: e(
    [
      { handle:"fepafut",       name:"Fepafut (off.)",      kind:"official", followers:"450k" },
      { handle:"LMP_pa",        name:"LPF Panamá",          kind:"media",    followers:"180k" },
      { handle:"prensacom",     name:"La Prensa Panamá",    kind:"media",    followers:"600k" },
      { handle:"TVMaxPanama",   name:"TVMax Panamá",        kind:"media",    followers:"320k" },
      { handle:"diariomas_pa",  name:"Diario Más",          kind:"media",    followers:"140k" },
      { handle:"MareaRoja_pa",  name:"Marea Roja",          kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"FEPAFUT",        url:"https://www.fepafut.com/" },
      { name:"La Prensa (Dep.)", url:"https://www.prensa.com/deportes/" },
      { name:"TVMax",          url:"https://www.tvmaxpanama.com/" },
    ],
    ["#MareaRoja", "#VamosPanama", "#PanamaPaisDeFutbol", "#Panama"]
  ),
  CUB: e(
    [
      { handle:"FCubanaFutbol", name:"Federación Cubana FB",kind:"official", followers:"55k"  },
      { handle:"JuventudReb",   name:"Juventud Rebelde",    kind:"media",    followers:"180k" },
      { handle:"granma_digital",name:"Granma",              kind:"media",    followers:"280k" },
      { handle:"CubaSi_",       name:"Cubasí",              kind:"media",    followers:"95k"  },
      { handle:"Tele_Rebelde",  name:"Tele Rebelde",        kind:"media",    followers:"85k"  },
      { handle:"LeonesCuba_",   name:"Leones de Cuba",      kind:"fan",      followers:"8k"   },
    ],
    [
      { name:"Federación Cubana de Fútbol", url:"https://fcf.cu/" },
      { name:"Juventud Rebelde (Dep.)", url:"https://www.juventudrebelde.cu/deportes" },
    ],
    ["#Cuba", "#LeonesDelCaribe", "#VamosCuba", "#FCF"]
  ),
  NZL: e(
    [
      { handle:"NZ_Football",   name:"New Zealand Football",kind:"official", followers:"150k" },
      { handle:"AllWhites",     name:"All Whites",          kind:"official", followers:"95k"  },
      { handle:"OneNZTV",       name:"One News NZ",         kind:"media",    followers:"200k" },
      { handle:"NewstalkZB",    name:"Newstalk ZB",         kind:"media",    followers:"110k" },
      { handle:"NZHerald",      name:"NZ Herald Sport",     kind:"media",    followers:"380k" },
      { handle:"WhiteNoise_NZ", name:"White Noise (fan)",   kind:"fan",      followers:"8k"   },
    ],
    [
      { name:"NZ Football",    url:"https://www.nzfootball.co.nz/" },
      { name:"Stuff Sport",    url:"https://www.stuff.co.nz/sport/football" },
      { name:"NZ Herald Sport",url:"https://www.nzherald.co.nz/sport/football/" },
    ],
    ["#AllWhites", "#NZFootball", "#NewZealand", "#GoNZ"]
  ),
  CAN: e(
    [
      { handle:"CanadaSoccerEN",name:"Canada Soccer EN",    kind:"official", followers:"260k" },
      { handle:"CanadaSoccerFR",name:"Canada Soccer FR",    kind:"official", followers:"42k"  },
      { handle:"CanMNT",        name:"CanMNT",              kind:"official", followers:"180k" },
      { handle:"TSN_Sports",    name:"TSN",                 kind:"media",    followers:"1.4M" },
      { handle:"Sportsnet",     name:"Sportsnet",           kind:"media",    followers:"1M"   },
      { handle:"VoyageursMTL",  name:"Voyageurs",           kind:"fan",      followers:"30k"  },
    ],
    [
      { name:"Canada Soccer",  url:"https://canadasoccer.com/" },
      { name:"Northern Tribune", url:"https://northerntribune.ca/" },
      { name:"Waking The Red", url:"https://www.wakingthered.com/" },
    ],
    ["#CanMNT", "#WeCAN", "#CanadaRED", "#CanadaSoccer"]
  ),
  HON: e(
    [
      { handle:"FenafuthOrg",   name:"Fenafuth",            kind:"official", followers:"700k" },
      { handle:"LaH_Oficial",   name:"La H",                kind:"official", followers:"320k" },
      { handle:"diariolaprensa",name:"La Prensa",           kind:"media",    followers:"850k" },
      { handle:"Diez_HN",       name:"Diez",                kind:"media",    followers:"950k" },
      { handle:"DeportesTVC",   name:"Deportes TVC",        kind:"media",    followers:"380k" },
      { handle:"CatrachosFans", name:"Catrachos Fans",      kind:"fan",      followers:"18k"  },
    ],
    [
      { name:"Fenafuth",       url:"https://fenafuth.com/" },
      { name:"Diez",           url:"https://www.diez.hn/" },
      { name:"La Prensa Dep.", url:"https://www.laprensa.hn/deportes/" },
    ],
    ["#FuerzaCatracha", "#Honduras", "#LaH", "#Catrachos"]
  ),
  URU: e(
    [
      { handle:"Uruguay",       name:"Uruguay (AUF)",       kind:"official", followers:"2.8M" },
      { handle:"AUFseleccionES",name:"AUF",                 kind:"official", followers:"600k" },
      { handle:"OvacionDigital",name:"Ovación",             kind:"media",    followers:"550k" },
      { handle:"Referi",        name:"Referí",              kind:"media",    followers:"420k" },
      { handle:"sport890",      name:"Sport 890",           kind:"media",    followers:"280k" },
      { handle:"LaCelesteFans", name:"La Celeste Fans",     kind:"fan",      followers:"25k"  },
    ],
    [
      { name:"AUF",            url:"https://www.auf.org.uy/" },
      { name:"Ovación",        url:"https://www.ovaciondigital.com.uy/" },
      { name:"Referí",         url:"https://www.referi.uy/" },
    ],
    ["#Celeste", "#VamosUruguay", "#Uruguay", "#LaCeleste"]
  ),
  POR: e(
    [
      { handle:"selecaoportugal",name:"Seleção Portugal",   kind:"official", followers:"5.5M" },
      { handle:"FPFutebol",     name:"FPF",                 kind:"official", followers:"380k" },
      { handle:"abolanet",      name:"A Bola",              kind:"media",    followers:"1.2M" },
      { handle:"record_portugal",name:"Record",             kind:"media",    followers:"1.1M" },
      { handle:"OJogoOficial",  name:"O Jogo",              kind:"media",    followers:"650k" },
      { handle:"Cristiano",     name:"Cristiano Ronaldo",   kind:"player",   followers:"112M" },
    ],
    [
      { name:"FPF",            url:"https://www.fpf.pt/" },
      { name:"A Bola",         url:"https://www.abola.pt/" },
      { name:"Record",         url:"https://www.record.pt/" },
    ],
    ["#Portugal", "#SelecaoPortugal", "#ForcaPortugal", "#POR"]
  ),
  ESP: e(
    [
      { handle:"SEFutbol",      name:"Selección España",    kind:"official", followers:"5.8M" },
      { handle:"rfef",          name:"RFEF",                kind:"official", followers:"850k" },
      { handle:"marca",         name:"Marca",               kind:"media",    followers:"7M"   },
      { handle:"sport",         name:"Sport",               kind:"media",    followers:"2.5M" },
      { handle:"as_com",        name:"AS",                  kind:"media",    followers:"4.5M" },
      { handle:"3gerardpique",  name:"Gerard Piqué",        kind:"player",   followers:"22M"  },
    ],
    [
      { name:"RFEF",           url:"https://www.rfef.es/" },
      { name:"Marca",          url:"https://www.marca.com/" },
      { name:"AS",             url:"https://as.com/" },
    ],
    ["#VamosEspana", "#LaRoja", "#SelEspanola", "#Espana"]
  ),
  MAR: e(
    [
      { handle:"EnMaroc",       name:"Equipe Maroc (off.)", kind:"official", followers:"950k" },
      { handle:"FRMFOFFICIEL",  name:"FRMF",                kind:"official", followers:"650k" },
      { handle:"le360sport",    name:"Le360 Sport",         kind:"media",    followers:"850k" },
      { handle:"botola_pro",    name:"Botola Pro",          kind:"media",    followers:"260k" },
      { handle:"hespress_maroc",name:"Hespress",            kind:"media",    followers:"1.2M" },
      { handle:"AtlasLionsFans",name:"Atlas Lions Fans",    kind:"fan",      followers:"55k"  },
    ],
    [
      { name:"FRMF",           url:"https://www.frmf.ma/" },
      { name:"Le360 Sport",    url:"https://fr.le360.ma/sport/" },
      { name:"Hespress",       url:"https://fr.hespress.com/" },
    ],
    ["#DimaMaghrib", "#AtlasLions", "#Maroc", "#TeamMaroc"]
  ),
  BEL: e(
    [
      { handle:"BelRedDevils",  name:"Belgian Red Devils",  kind:"official", followers:"1.4M" },
      { handle:"URBSFA_KBVB",   name:"URBSFA/KBVB",         kind:"official", followers:"180k" },
      { handle:"sporza",        name:"Sporza",              kind:"media",    followers:"550k" },
      { handle:"hlnsport",      name:"HLN Sport",           kind:"media",    followers:"320k" },
      { handle:"DH_lesport",    name:"DH Les Sport+",       kind:"media",    followers:"95k"  },
      { handle:"KevinDeBruyne", name:"Kevin De Bruyne",     kind:"player",   followers:"4M"   },
    ],
    [
      { name:"Belgian Red Devils", url:"https://www.belgianfootball.be/" },
      { name:"Sporza",         url:"https://sporza.be/" },
      { name:"HLN Sport",      url:"https://www.hln.be/sport/" },
    ],
    ["#REDTOGETHER", "#BELRedDevils", "#Belgium", "#Diables"]
  ),
  JPN: e(
    [
      { handle:"jfa_samuraiblue",name:"Samurai Blue",       kind:"official", followers:"1.4M" },
      { handle:"jfa",           name:"JFA",                 kind:"official", followers:"550k" },
      { handle:"daihyo",        name:"Daihyo",              kind:"media",    followers:"260k" },
      { handle:"nikkansports",  name:"Nikkan Sports",       kind:"media",    followers:"600k" },
      { handle:"SoccerKingJP",  name:"Soccer King",         kind:"media",    followers:"380k" },
      { handle:"JFA_supporters", name:"JFA Supporters",     kind:"fan",      followers:"40k"  },
    ],
    [
      { name:"JFA",            url:"https://www.jfa.jp/" },
      { name:"Soccer King",    url:"https://www.soccer-king.jp/" },
      { name:"Nikkan Sports",  url:"https://www.nikkansports.com/soccer/" },
    ],
    ["#SamuraiBlue", "#daihyo", "#Japan", "#JPN"]
  ),
  FRA: e(
    [
      { handle:"equipedefrance",name:"Équipe de France",    kind:"official", followers:"6.8M" },
      { handle:"FFF",           name:"FFF",                 kind:"official", followers:"850k" },
      { handle:"lequipe",       name:"L'Équipe",            kind:"media",    followers:"6M"   },
      { handle:"rmcsport",      name:"RMC Sport",           kind:"media",    followers:"2.4M" },
      { handle:"GoalFR",        name:"Goal France",         kind:"media",    followers:"1.4M" },
      { handle:"KMbappe",       name:"Kylian Mbappé",       kind:"player",   followers:"15M"  },
    ],
    [
      { name:"FFF",            url:"https://www.fff.fr/" },
      { name:"L'Équipe",       url:"https://www.lequipe.fr/Football/Equipe-de-france/" },
      { name:"France Football",url:"https://www.francefootball.fr/" },
    ],
    ["#FiersDetreBleus", "#EquipeDeFrance", "#LesBleus", "#FRA"]
  ),
  KSA: e(
    [
      { handle:"SaudiNT",       name:"Saudi NT EN",         kind:"official", followers:"450k" },
      { handle:"SaudiNT_AR",    name:"Saudi NT AR",         kind:"official", followers:"2M"   },
      { handle:"SaudiFF",       name:"SAFF",                kind:"official", followers:"900k" },
      { handle:"ssc_sports",    name:"SSC Sport",           kind:"media",    followers:"3.5M" },
      { handle:"alriyadh",      name:"Al Riyadh",           kind:"media",    followers:"4.5M" },
      { handle:"GreenFalcons",  name:"Green Falcons fans",  kind:"fan",      followers:"55k"  },
    ],
    [
      { name:"SAFF",           url:"https://www.thesaff.com.sa/" },
      { name:"SSC Sport",      url:"https://www.sscsports.com/" },
    ],
    ["#GreenFalcons", "#SaudiArabia", "#KSA", "#الأخضر_السعودي"]
  ),
  SUI: e(
    [
      { handle:"SFV_ASF",       name:"ASF/SFV",             kind:"official", followers:"380k" },
      { handle:"Nati",          name:"Nati",                kind:"official", followers:"260k" },
      { handle:"blicksport",    name:"Blick Sport",         kind:"media",    followers:"180k" },
      { handle:"SRFsport",      name:"SRF Sport",           kind:"media",    followers:"260k" },
      { handle:"_letempssport", name:"Le Temps Sport",      kind:"media",    followers:"45k"  },
      { handle:"NatiFans",      name:"Nati Fans",           kind:"fan",      followers:"15k"  },
    ],
    [
      { name:"ASF/SFV",        url:"https://www.football.ch/" },
      { name:"Blick Sport",    url:"https://www.blick.ch/sport/" },
      { name:"SRF Sport",      url:"https://www.srf.ch/sport" },
    ],
    ["#HoppSchwiiz", "#Nati", "#Switzerland", "#SUI"]
  ),
  ALG: e(
    [
      { handle:"LesVerts",      name:"Les Verts (FAF)",     kind:"official", followers:"2.4M" },
      { handle:"FAF_ar",        name:"FAF",                 kind:"official", followers:"650k" },
      { handle:"dzfoot_dz",     name:"DZFoot",              kind:"media",    followers:"650k" },
      { handle:"Algerie360",    name:"Algérie 360",         kind:"media",    followers:"450k" },
      { handle:"elheddafdz",    name:"El Heddaf",           kind:"media",    followers:"850k" },
      { handle:"FennecsFans",   name:"Fennecs Fans",        kind:"fan",      followers:"95k"  },
    ],
    [
      { name:"FAF",            url:"https://www.faf.dz/" },
      { name:"DZFoot",         url:"https://www.dzfoot.com/" },
      { name:"El Heddaf",      url:"https://www.elheddaf.com/" },
    ],
    ["#OneTwoThreeViveLAlgerie", "#Fennecs", "#Algerie", "#TeamDZ"]
  ),
  BRA: e(
    [
      { handle:"CBF_Futebol",   name:"CBF",                 kind:"official", followers:"9M"   },
      { handle:"SeleçãoBR",     name:"Seleção Brasileira",  kind:"official", followers:"8M"   },
      { handle:"BrazilianTeam", name:"Brazilian Team EN",   kind:"official", followers:"700k" },
      { handle:"ge_globo",      name:"GloboEsporte",        kind:"media",    followers:"10M"  },
      { handle:"sportv",        name:"SporTV",              kind:"media",    followers:"6M"   },
      { handle:"neymarjr",      name:"Neymar Jr",           kind:"player",   followers:"63M"  },
    ],
    [
      { name:"CBF",            url:"https://www.cbf.com.br/" },
      { name:"GloboEsporte",   url:"https://ge.globo.com/" },
      { name:"UOL Esporte",    url:"https://www.uol.com.br/esporte/" },
    ],
    ["#GigantesPorNatureza", "#Brasil", "#SeleçãoBrasileira", "#VaiBrasil"]
  ),
  COL: e(
    [
      { handle:"FCFSeleccionCol",name:"Selección Colombia", kind:"official", followers:"5.2M" },
      { handle:"FCFColombia",   name:"FCF",                 kind:"official", followers:"1.4M" },
      { handle:"WinSportsTV",   name:"Win Sports",          kind:"media",    followers:"3.5M" },
      { handle:"ESPNColombia",  name:"ESPN Colombia",       kind:"media",    followers:"2.2M" },
      { handle:"Gol_Caracol",   name:"Gol Caracol",         kind:"media",    followers:"2.8M" },
      { handle:"jamesdrodriguez",name:"James Rodríguez",    kind:"player",   followers:"5M"   },
    ],
    [
      { name:"FCF",            url:"https://fcf.com.co/" },
      { name:"Win Sports",     url:"https://www.winsports.co/" },
      { name:"Gol Caracol",    url:"https://gol.caracoltv.com/" },
    ],
    ["#VamosColombia", "#FCF", "#Colombia", "#LosCafeteros"]
  ),
  PAR: e(
    [
      { handle:"Albirroja",     name:"Albirroja",           kind:"official", followers:"1.4M" },
      { handle:"APFOficial",    name:"APF",                 kind:"official", followers:"320k" },
      { handle:"ABCDigital",    name:"ABC Color",           kind:"media",    followers:"950k" },
      { handle:"UltimaHoracom", name:"Última Hora",         kind:"media",    followers:"550k" },
      { handle:"Tigo_Sports",   name:"Tigo Sports",         kind:"media",    followers:"600k" },
      { handle:"AlbirrojaFans", name:"Albirroja Fans",      kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"APF",            url:"https://www.apf.org.py/" },
      { name:"ABC Deportes",   url:"https://www.abc.com.py/deportes/" },
      { name:"Tigo Sports",    url:"https://tigosports.com.py/" },
    ],
    ["#VamosParaguay", "#Albirroja", "#Paraguay", "#APF"]
  ),
  CMR: e(
    [
      { handle:"FecafootOfficiel",name:"Fecafoot",          kind:"official", followers:"380k" },
      { handle:"LionsIndomptab", name:"Lions Indomptables", kind:"official", followers:"260k" },
      { handle:"CamfootCom",    name:"Camfoot",             kind:"media",    followers:"180k" },
      { handle:"cameroontribu", name:"Cameroon Tribune",    kind:"media",    followers:"110k" },
      { handle:"crtv_web",      name:"CRTV",                kind:"media",    followers:"380k" },
      { handle:"LionsFans_CMR", name:"Lions Fans",          kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"Fecafoot",       url:"https://www.fecafoot-officiel.com/" },
      { name:"Camfoot",        url:"https://www.camfoot.com/" },
      { name:"Cameroon Tribune", url:"https://www.cameroon-tribune.cm/" },
    ],
    ["#LionsIndomptables", "#Cameroun", "#IndomitableLions", "#CMR"]
  ),
  GER: e(
    [
      { handle:"DFB_Team",      name:"DFB-Team",            kind:"official", followers:"3.5M" },
      { handle:"DFB_Team_EN",   name:"DFB Team EN",         kind:"official", followers:"850k" },
      { handle:"DFB",           name:"DFB",                 kind:"official", followers:"1.4M" },
      { handle:"kicker",        name:"Kicker",              kind:"media",    followers:"1.6M" },
      { handle:"SPORTBILD",     name:"Sport Bild",          kind:"media",    followers:"850k" },
      { handle:"DFB_Fans",      name:"DFB Fans",            kind:"fan",      followers:"55k"  },
    ],
    [
      { name:"DFB",            url:"https://www.dfb.de/" },
      { name:"Kicker",         url:"https://www.kicker.de/" },
      { name:"Sport Bild",     url:"https://sportbild.bild.de/" },
    ],
    ["#DieMannschaft", "#GER", "#Germany", "#FussballEM"]
  ),
  NED: e(
    [
      { handle:"OnsOranje",     name:"Oranje",              kind:"official", followers:"1.5M" },
      { handle:"KNVB",          name:"KNVB",                kind:"official", followers:"320k" },
      { handle:"VoetbalIntl",   name:"Voetbal International", kind:"media",  followers:"650k" },
      { handle:"telegraafsport",name:"Telegraaf Sport",     kind:"media",    followers:"850k" },
      { handle:"NOSsport",      name:"NOS Sport",           kind:"media",    followers:"950k" },
      { handle:"OranjeArmy",    name:"Oranje Army",         kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"KNVB",           url:"https://www.knvb.nl/" },
      { name:"Voetbal Int.",   url:"https://www.vi.nl/" },
      { name:"NOS Sport",      url:"https://nos.nl/sport" },
    ],
    ["#OnsOranje", "#NED", "#Netherlands", "#OranjeArmy"]
  ),
  POL: e(
    [
      { handle:"laczynaspilka", name:"Łączy nas piłka",     kind:"official", followers:"1.4M" },
      { handle:"laczynaspilkaEN",name:"Polish NT EN",       kind:"official", followers:"180k" },
      { handle:"PZPN_pl",       name:"PZPN",                kind:"official", followers:"280k" },
      { handle:"sport_pl",      name:"Sport.pl",            kind:"media",    followers:"550k" },
      { handle:"przegladsport", name:"Przegląd Sportowy",   kind:"media",    followers:"650k" },
      { handle:"lewy_official", name:"Robert Lewandowski", kind:"player",    followers:"6M"   },
    ],
    [
      { name:"PZPN",           url:"https://www.pzpn.pl/" },
      { name:"Łączy nas piłka",url:"https://www.laczynaspilka.pl/" },
      { name:"Sport.pl",       url:"https://www.sport.pl/" },
    ],
    ["#LaczyNasPilka", "#Poland", "#POL", "#BialoCzerwoni"]
  ),
  SRB: e(
    [
      { handle:"FSSrbije",      name:"FS Srbije",           kind:"official", followers:"320k" },
      { handle:"OrloviSrbije",  name:"Orlovi",              kind:"official", followers:"180k" },
      { handle:"b92sport",      name:"B92 Sport",           kind:"media",    followers:"380k" },
      { handle:"MozzartSport",  name:"Mozzart Sport",       kind:"media",    followers:"260k" },
      { handle:"sportski_zurnal",name:"Sportski Žurnal",    kind:"media",    followers:"180k" },
      { handle:"OrloviFans",    name:"Orlovi Fans",         kind:"fan",      followers:"15k"  },
    ],
    [
      { name:"FSS",            url:"https://www.fss.rs/" },
      { name:"B92 Sport",      url:"https://www.b92.net/sport/" },
      { name:"Mozzart Sport",  url:"https://www.mozzartsport.com/" },
    ],
    ["#OrloviSrbije", "#Serbia", "#SRB", "#Orlovi"]
  ),
  ENG: e(
    [
      { handle:"England",       name:"England",             kind:"official", followers:"3.8M" },
      { handle:"FA",            name:"The FA",              kind:"official", followers:"700k" },
      { handle:"SkySportsPL",   name:"Sky Sports PL",       kind:"media",    followers:"5.2M" },
      { handle:"BBCSport",      name:"BBC Sport",           kind:"media",    followers:"10M"  },
      { handle:"TheSunFootball",name:"Sun Football",        kind:"media",    followers:"2.4M" },
      { handle:"HKane",         name:"Harry Kane",          kind:"player",   followers:"5M"   },
    ],
    [
      { name:"The FA",         url:"https://www.thefa.com/" },
      { name:"BBC Football",   url:"https://www.bbc.com/sport/football" },
      { name:"Goal England",   url:"https://www.goal.com/en-gb" },
    ],
    ["#ThreeLions", "#ENG", "#England", "#ItsComingHome"]
  ),
  SEN: e(
    [
      { handle:"FootballSenegal",name:"FSF Sénégal",        kind:"official", followers:"700k" },
      { handle:"FSFOfficielle", name:"FSF Officielle",      kind:"official", followers:"380k" },
      { handle:"wiwsport",      name:"Wiwsport",            kind:"media",    followers:"650k" },
      { handle:"SeneNews",      name:"SeneNews",            kind:"media",    followers:"550k" },
      { handle:"RTSofficiel",   name:"RTS Sénégal",         kind:"media",    followers:"380k" },
      { handle:"SadioMane",     name:"Sadio Mané",          kind:"player",   followers:"4M"   },
    ],
    [
      { name:"FSF",            url:"https://www.fsfoot.sn/" },
      { name:"Wiwsport",       url:"https://www.wiwsport.com/" },
      { name:"SeneNews Sport", url:"https://www.senenews.com/sports" },
    ],
    ["#LionsDuSenegal", "#Sunugaal", "#SEN", "#TeamSenegal"]
  ),
  TUN: e(
    [
      { handle:"FTF_OFFICIEL",  name:"FTF",                 kind:"official", followers:"450k" },
      { handle:"EaglesOfCarthage",name:"Eagles of Carthage",kind:"official", followers:"260k" },
      { handle:"tunisiefoot",   name:"Tunisie Foot",        kind:"media",    followers:"380k" },
      { handle:"shems_fm",      name:"Shems FM",            kind:"media",    followers:"450k" },
      { handle:"directinfo_tn", name:"Direct Info",         kind:"media",    followers:"320k" },
      { handle:"AiglesCarthag", name:"Aigles de Carthage Fans", kind:"fan",  followers:"22k"  },
    ],
    [
      { name:"FTF",            url:"https://www.ftf.org.tn/" },
      { name:"Tunisie Foot",   url:"https://www.tunisie-foot.com/" },
      { name:"Webdo Sport",    url:"https://www.webdo.tn/sport/" },
    ],
    ["#AiglesDeCarthage", "#Tunisie", "#TUN", "#نسور_قرطاج"]
  ),
  CRC: e(
    [
      { handle:"fedefutbolcrc", name:"Fedefutbol",          kind:"official", followers:"450k" },
      { handle:"Sele_Nacional", name:"Sele Nacional",       kind:"official", followers:"320k" },
      { handle:"Telediario7",   name:"Teletica Deportes",   kind:"media",    followers:"380k" },
      { handle:"larepublica_cr",name:"La República",        kind:"media",    followers:"180k" },
      { handle:"NacionDeportes",name:"La Nación Deportes",  kind:"media",    followers:"450k" },
      { handle:"SeleTicaFans",  name:"Sele Tica Fans",      kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"Fedefutbol",     url:"https://www.fedefutbolcrc.com/" },
      { name:"La Nación (Dep.)", url:"https://www.nacion.com/deportes/" },
      { name:"Teletica Dep.",  url:"https://www.teletica.com/deportes/" },
    ],
    ["#VamosSele", "#LaSele", "#CostaRica", "#CRC"]
  ),
  ITA: e(
    [
      { handle:"Azzurri",       name:"Azzurri",             kind:"official", followers:"3.2M" },
      { handle:"Azzurri_En",    name:"Azzurri EN",          kind:"official", followers:"550k" },
      { handle:"FIGC",          name:"FIGC",                kind:"official", followers:"600k" },
      { handle:"Gazzetta_it",   name:"Gazzetta dello Sport",kind:"media",    followers:"3.5M" },
      { handle:"CorSport",      name:"Corriere dello Sport",kind:"media",    followers:"1.6M" },
      { handle:"tuttosport",    name:"Tuttosport",          kind:"media",    followers:"900k" },
    ],
    [
      { name:"FIGC",           url:"https://www.figc.it/" },
      { name:"Gazzetta",       url:"https://www.gazzetta.it/" },
      { name:"Corriere Sport", url:"https://www.corrieredellosport.it/" },
    ],
    ["#Azzurri", "#ForzaAzzurri", "#Italia", "#ITA"]
  ),
  CRO: e(
    [
      { handle:"HNS_CFF",       name:"HNS / CFF",           kind:"official", followers:"650k" },
      { handle:"VatreniHNS",    name:"Vatreni",             kind:"official", followers:"450k" },
      { handle:"sportskenovost",name:"Sportske Novosti",    kind:"media",    followers:"380k" },
      { handle:"index_hr",      name:"Index Sport",         kind:"media",    followers:"550k" },
      { handle:"24sata_sport",  name:"24sata Sport",        kind:"media",    followers:"280k" },
      { handle:"lukamodric10",  name:"Luka Modrić",         kind:"player",   followers:"3M"   },
    ],
    [
      { name:"HNS",            url:"https://hns-cff.hr/" },
      { name:"Sportske Novosti", url:"https://sportske.jutarnji.hr/" },
      { name:"Index Sport",    url:"https://www.index.hr/sport/" },
    ],
    ["#Vatreni", "#Hrvatska", "#Croatia", "#CRO"]
  ),
  ROU: e(
    [
      { handle:"haisanationala",name:"Hai România!",        kind:"official", followers:"180k" },
      { handle:"FRFotbal",      name:"FRF",                 kind:"official", followers:"110k" },
      { handle:"GSPro",         name:"Gazeta Sporturilor",  kind:"media",    followers:"380k" },
      { handle:"prosport",      name:"ProSport",            kind:"media",    followers:"260k" },
      { handle:"DigiSport",     name:"Digi Sport",          kind:"media",    followers:"450k" },
      { handle:"TricoloriiFans",name:"Tricolorii Fans",     kind:"fan",      followers:"12k"  },
    ],
    [
      { name:"FRF",            url:"https://www.frf.ro/" },
      { name:"GSP",            url:"https://www.gsp.ro/" },
      { name:"ProSport",       url:"https://www.prosport.ro/" },
    ],
    ["#Tricolorii", "#Romania", "#HaiRomania", "#ROU"]
  ),
  ANG: e(
    [
      { handle:"FAFutebol",     name:"FAF Angola",          kind:"official", followers:"95k"  },
      { handle:"PalancasNegrasA",name:"Palancas Negras",    kind:"official", followers:"75k"  },
      { handle:"OPaisDigital",  name:"O País",              kind:"media",    followers:"260k" },
      { handle:"jornal_angola", name:"Jornal de Angola",    kind:"media",    followers:"180k" },
      { handle:"redeangola",    name:"Rede Angola",         kind:"media",    followers:"110k" },
      { handle:"PalancasFans",  name:"Palancas Fans",       kind:"fan",      followers:"8k"   },
    ],
    [
      { name:"FAF",            url:"https://www.fafutebol.ao/" },
      { name:"O País Sport",   url:"https://www.opais.co.ao/" },
    ],
    ["#PalancasNegras", "#Angola", "#ForçaAngola", "#ANG"]
  ),
  UKR: e(
    [
      { handle:"UAFukraine",    name:"UAF Ukraine",         kind:"official", followers:"260k" },
      { handle:"UAF_ukr",       name:"UAF",                 kind:"official", followers:"180k" },
      { handle:"footballua",    name:"Football.ua",         kind:"media",    followers:"380k" },
      { handle:"tribuna_com",   name:"Tribuna",             kind:"media",    followers:"260k" },
      { handle:"DynamoKievUA",  name:"Dynamo Kiev",         kind:"fan",      followers:"450k" },
      { handle:"andriyshev",    name:"Andriy Shevchenko",   kind:"player",   followers:"1M"   },
    ],
    [
      { name:"UAF",            url:"https://uaf.ua/" },
      { name:"Football.ua",    url:"https://football.ua/" },
      { name:"Tribuna",        url:"https://tribuna.com/" },
    ],
    ["#TeamUkraine", "#Ukraine", "#UKR", "#СлаваУкраїні"]
  ),
  GHA: e(
    [
      { handle:"ghanafaofficial",name:"GFA",                kind:"official", followers:"380k" },
      { handle:"BlackStars",    name:"Black Stars",         kind:"official", followers:"450k" },
      { handle:"GhanaSoccernet",name:"Ghana Soccernet",     kind:"media",    followers:"320k" },
      { handle:"citisportsgh",  name:"Citi Sports",         kind:"media",    followers:"180k" },
      { handle:"3SportsGh",     name:"3Sports",             kind:"media",    followers:"260k" },
      { handle:"BlackStarsFans",name:"Black Stars Fans",    kind:"fan",      followers:"22k"  },
    ],
    [
      { name:"GFA",            url:"https://www.ghanafa.org/" },
      { name:"Ghana Soccernet",url:"https://www.ghanasoccernet.com/" },
      { name:"Citi Sports",    url:"https://citinewsroom.com/category/sports/" },
    ],
    ["#BlackStars", "#Ghana", "#BringBackTheLove", "#GHA"]
  ),
  RSA: e(
    [
      { handle:"BafanaBafana",  name:"Bafana Bafana",       kind:"official", followers:"850k" },
      { handle:"SAFA_net",      name:"SAFA",                kind:"official", followers:"260k" },
      { handle:"SuperSportTV",  name:"SuperSport",          kind:"media",    followers:"1.8M" },
      { handle:"KickOffMag",    name:"Kick Off",            kind:"media",    followers:"650k" },
      { handle:"SoccerLadumaSA",name:"Soccer Laduma",       kind:"media",    followers:"950k" },
      { handle:"BafanaFans",    name:"Bafana Fans",         kind:"fan",      followers:"35k"  },
    ],
    [
      { name:"SAFA",           url:"https://www.safa.net/" },
      { name:"Kick Off",       url:"https://www.kickoff.com/" },
      { name:"Soccer Laduma",  url:"https://www.soccerladuma.co.za/" },
    ],
    ["#BafanaBafana", "#SouthAfrica", "#RSA", "#SiyaBhula"]
  ),
  COD: e(
    [
      { handle:"FECOFAOfficiel",name:"FECOFA",              kind:"official", followers:"140k" },
      { handle:"LeopardsRDC",   name:"Léopards RDC",        kind:"official", followers:"95k"  },
      { handle:"radiookapi",    name:"Radio Okapi",         kind:"media",    followers:"550k" },
      { handle:"actualitecd",   name:"Actualite.cd",        kind:"media",    followers:"380k" },
      { handle:"7sur7cd",       name:"7sur7.cd",            kind:"media",    followers:"320k" },
      { handle:"LeopardsFans",  name:"Léopards Fans",       kind:"fan",      followers:"12k"  },
    ],
    [
      { name:"FECOFA",         url:"https://fecofa.cd/" },
      { name:"Actualite.cd",   url:"https://actualite.cd/" },
      { name:"Radio Okapi",    url:"https://www.radiookapi.net/" },
    ],
    ["#Leopards", "#RDC", "#TeamCongo", "#COD"]
  ),
  KOR: e(
    [
      { handle:"theKFA",        name:"KFA",                 kind:"official", followers:"450k" },
      { handle:"thekoreanFA_en",name:"KFA English",         kind:"official", followers:"110k" },
      { handle:"sportsseoul",   name:"Sports Seoul",        kind:"media",    followers:"260k" },
      { handle:"OSEN_news",     name:"OSEN",                kind:"media",    followers:"380k" },
      { handle:"sportschosun",  name:"Sports Chosun",       kind:"media",    followers:"320k" },
      { handle:"sonny7",        name:"Son Heung-min",       kind:"player",   followers:"4M"   },
    ],
    [
      { name:"KFA",            url:"https://www.kfa.or.kr/" },
      { name:"OSEN",           url:"https://osen.mt.co.kr/" },
      { name:"Sports Chosun",  url:"https://sports.chosun.com/" },
    ],
    ["#TeamKorea", "#Taegeukjeonsa", "#SouthKorea", "#KOR"]
  ),
  CIV: e(
    [
      { handle:"FIFOfficiel",   name:"FIF",                 kind:"official", followers:"380k" },
      { handle:"ElephantsCIV",  name:"Éléphants CIV",       kind:"official", followers:"260k" },
      { handle:"abidjannet",    name:"Abidjan.net",         kind:"media",    followers:"450k" },
      { handle:"rti_officiel",  name:"RTI Officiel",        kind:"media",    followers:"380k" },
      { handle:"linfodrome",    name:"L'Infodrome",         kind:"media",    followers:"180k" },
      { handle:"didierdrogba",  name:"Didier Drogba",       kind:"player",   followers:"4M"   },
    ],
    [
      { name:"FIF",            url:"https://www.fif.ci/" },
      { name:"Abidjan.net Sport", url:"https://news.abidjan.net/sport/" },
      { name:"Fratmat",        url:"https://www.fratmat.info/" },
    ],
    ["#Elephants", "#CIV", "#CotedIvoire", "#TeamCIV"]
  ),
  ZIM: e(
    [
      { handle:"ZIFAOfficial",  name:"ZIFA",                kind:"official", followers:"180k" },
      { handle:"Warriors_Zim",  name:"Warriors",            kind:"official", followers:"95k"  },
      { handle:"HeraldZimbabwe",name:"The Herald",          kind:"media",    followers:"550k" },
      { handle:"NewsdzeZim",    name:"NewsDay",             kind:"media",    followers:"450k" },
      { handle:"263Chat",       name:"263Chat",             kind:"media",    followers:"320k" },
      { handle:"WarriorsFansZ", name:"Warriors Fans",       kind:"fan",      followers:"12k"  },
    ],
    [
      { name:"ZIFA",           url:"https://www.zifa.co.zw/" },
      { name:"Herald Sports",  url:"https://www.herald.co.zw/category/sports/" },
      { name:"NewsDay",        url:"https://www.newsday.co.zw/" },
    ],
    ["#Warriors", "#Zimbabwe", "#ZIM", "#GoWarriors"]
  ),
  KEN: e(
    [
      { handle:"Football_Kenya",name:"FKF",                 kind:"official", followers:"180k" },
      { handle:"HarambeeStars", name:"Harambee Stars",      kind:"official", followers:"260k" },
      { handle:"NationSportske",name:"Nation Sport",        kind:"media",    followers:"950k" },
      { handle:"StandardKenya", name:"The Standard",        kind:"media",    followers:"650k" },
      { handle:"CitizenTVKenya",name:"Citizen TV",          kind:"media",    followers:"1.8M" },
      { handle:"HarambeeFans",  name:"Harambee Stars Fans", kind:"fan",      followers:"15k"  },
    ],
    [
      { name:"FKF",            url:"https://www.footballkenya.org/" },
      { name:"Nation Sport",   url:"https://nation.africa/kenya/sports" },
      { name:"Standard Sport", url:"https://www.standardmedia.co.ke/sports" },
    ],
    ["#HarambeeStars", "#Kenya", "#KEN", "#TeamKenya"]
  ),
};

/* ══════════════════════════════════ Helpers ══ */

/** Lookup by club id (works for both L1 and L2). */
export function fanConfigForClub(id: number): FanEntry | null {
  return FAN_CLUBS_L1[id] ?? FAN_CLUBS_L2[id] ?? null;
}

/** Lookup by nation ISO code (e.g. "FRA", "BRA"). */
export function fanConfigForNation(code: string): FanEntry | null {
  return FAN_NATIONS[code] ?? null;
}

/** Flat list with stable entity ids of every entry the admin page edits. */
export interface FanCatalogEntry {
  id: string;        // "club:524", "nation:FRA", …
  scope: "L1" | "L2" | "WC";
  label: string;     // human label shown in admin
  entry: FanEntry;
}

export function buildFanCatalog(
  l1: { id: number; name: string }[],
  l2: { id: number; name: string }[],
  nations: { code: string; name: string }[],
): FanCatalogEntry[] {
  const out: FanCatalogEntry[] = [];
  for (const c of l1) {
    const entry = FAN_CLUBS_L1[c.id];
    if (entry) out.push({ id: `club:${c.id}`, scope:"L1", label:c.name, entry });
  }
  for (const c of l2) {
    const entry = FAN_CLUBS_L2[c.id];
    if (entry) out.push({ id: `club:${c.id}`, scope:"L2", label:c.name, entry });
  }
  for (const n of nations) {
    const entry = FAN_NATIONS[n.code];
    if (entry) out.push({ id: `nation:${n.code}`, scope:"WC", label:n.name, entry });
  }
  return out;
}
