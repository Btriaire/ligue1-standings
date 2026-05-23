// Curated editorial roster for the magazine. Smaller, deeper-detail
// counterpart to the PLAYERS array in `app/components/WorldCupTab.tsx`.
//
// Why a separate file? The WC tab roster is sized for stat-grid display
// (78 entries × short labels). The magazine needs fewer stars but with
// long-form editorial copy — signature gesture, 2-3 sentence bio,
// pull-quote, fictional byline. Duplicating the data here keeps the
// magazine self-contained and lets us write properly "presse" prose
// without retrofitting the tab component.

export type MagPos = "ATT" | "MIL" | "DEF" | "GB";

export interface MagazinePlayer {
  name: string;
  flag: string;
  nat: string;
  club: string;
  age: number;
  pos: MagPos;
  impact: number;     // 0-100, drives "vedette du numéro" weighting
  signature: string;  // "Le geste signature : ..."
  paragraph: string;  // 2-3 sentence editorial bio
  pullQuote: string;  // fictional pull-quote
  byline: string;     // fictional journalist name (recurring contributors)
}

// Twelve recurring "contributors" — each portrait picks one deterministically.
export const CONTRIBUTORS = [
  "Mathilde Verriest",
  "Pierre-Antoine Lacombe",
  "Yann Sorel",
  "Camille Beaumont",
  "Étienne Vasseur",
  "Sophie Carayon",
  "Laurent Mercier",
  "Inès Halloul",
  "Théo Pradier",
  "Marie-Capucine Aubry",
  "Hugo Trintignant",
  "Salma Belkacem",
];

export const ROSTER: MagazinePlayer[] = [
  {
    name: "Kylian Mbappé", flag: "🇫🇷", nat: "France", club: "Real Madrid",
    age: 27, pos: "ATT", impact: 96,
    signature: "Le contre-pied, exécuté à 32 km/h, sur 18 mètres",
    paragraph:
      "On l'a vu naître à Bondy, grandir à Monaco, devenir roi à Paris, et désormais s'installer à Madrid comme on prendrait une demeure de famille. À 27 ans, Mbappé arrive à cette Coupe du Monde dans un état d'apesanteur statistique : neuf buts en huit qualifs, capitaine d'une équipe de France qu'il porte parfois à bout de bras, parfois en sourdine, comme s'il ménageait un secret. L'été 2026 sera son tournoi-charnière ou son sacre définitif.",
    pullQuote: "« Je veux qu'on parle encore de cette équipe dans trente ans. »",
    byline: "Mathilde Verriest",
  },
  {
    name: "Vinicius Jr", flag: "🇧🇷", nat: "Brésil", club: "Real Madrid",
    age: 25, pos: "ATT", impact: 92,
    signature: "L'élastico inversé suivi d'un crochet intérieur",
    paragraph:
      "Vinícius José Paixão de Oliveira Júnior n'a jamais aimé qu'on raccourcisse son nom. Il aime, en revanche, qu'on déplie l'espace devant lui. Sur l'aile gauche du Real, il a transformé l'art du dribble en industrie ; en Seleção, il cherche encore cette même alchimie. La CdM 2026 sera le procès — ou le couronnement — de cette dualité.",
    pullQuote: "« Le Brésil ne joue plus pour gagner, il joue pour rappeler qu'il est le Brésil. »",
    byline: "Pierre-Antoine Lacombe",
  },
  {
    name: "Jude Bellingham", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", nat: "Angleterre", club: "Real Madrid",
    age: 22, pos: "MIL", impact: 94,
    signature: "L'arrivée lancée dans la surface, tête haute, ballon à plat",
    paragraph:
      "Bellingham est ce milieu qu'on dit « complet » parce qu'on ne sait plus comment le décrire. À 22 ans, il est déjà un sujet — pas un simple joueur. Sa CdM est attendue comme on attend la sortie d'un film d'auteur : on sait que ce sera intense, on ignore juste s'il préférera l'introspection au spectacle. L'Angleterre, elle, n'a plus de plan B.",
    pullQuote: "« Je ne joue pas pour la couronne. Je joue pour ceux qui m'ont vu marcher. »",
    byline: "Yann Sorel",
  },
  {
    name: "Lamine Yamal", flag: "🇪🇸", nat: "Espagne", club: "FC Barcelone",
    age: 18, pos: "ATT", impact: 91,
    signature: "Le crochet extérieur posé, sans rupture de rythme",
    paragraph:
      "Il a 18 ans et il joue déjà comme s'il en avait trente. Champion d'Europe à 17, finaliste de tout ce qu'il a touché, Yamal arrive à cette CdM 2026 sans l'avoir vraiment méritée — il l'a juste prise. Ce qui frappe, chez lui, ce n'est pas la technique, qu'on lui prête depuis l'enfance ; c'est le sang-froid. Un sang-froid qui rappelle qu'on peut être prodige sans être pressé.",
    pullQuote: "« Je n'ai pas le temps d'avoir le trac. J'ai d'autres choses à faire. »",
    byline: "Camille Beaumont",
  },
  {
    name: "Cristiano Ronaldo", flag: "🇵🇹", nat: "Portugal", club: "Al-Nassr",
    age: 41, pos: "ATT", impact: 85,
    signature: "Le saut sur coup de pied arrêté, suspendu hors du temps",
    paragraph:
      "À 41 ans, Ronaldo participera vraisemblablement à sa cinquième — et probablement dernière — Coupe du Monde. Le débat n'est plus statistique, il est mythologique : qu'est-ce qu'on regarde encore, chez ce joueur, en 2026 ? La réponse est moins évidente qu'elle n'en a l'air. Une silhouette, peut-être. Une époque, sans doute. La promesse d'un dernier coup de griffe, à coup sûr.",
    pullQuote: "« Je ne pars que quand le terrain me chasse. Il ne m'a pas encore chassé. »",
    byline: "Étienne Vasseur",
  },
  {
    name: "Florian Wirtz", flag: "🇩🇪", nat: "Allemagne", club: "Bayer Leverkusen",
    age: 22, pos: "MIL", impact: 90,
    signature: "La passe entre les lignes, jouée en première intention",
    paragraph:
      "L'Allemagne d'aujourd'hui ne sait plus très bien ce qu'elle est — sauf qu'elle est portée par Wirtz. Meilleur joueur de Bundesliga depuis trois saisons, milieu de création à l'ancienne dans un foot qui les a oubliés, il est en train, sans bruit, de redonner du sens à un maillot qui en cherchait. La CdM sera son examen public.",
    pullQuote: "« Le numéro 10 n'est pas mort. Il a juste appris à courir. »",
    byline: "Sophie Carayon",
  },
  {
    name: "Erling Haaland", flag: "🇳🇴", nat: "Norvège", club: "Manchester City",
    age: 26, pos: "ATT", impact: 88,
    signature: "Le repli aimanté dans l'axe avant la frappe sèche",
    paragraph:
      "Premier grand tournoi pour Haaland, et premier vrai test : la Norvège est qualifiée pour la première fois depuis 1998. Le monstre de City va découvrir une chose qu'il n'a jamais connue — un système international taillé pour lui. Ce qu'on en retiendra dépendra moins de ses buts (il y en aura) que des matchs où la Norvège tombera (il y en aura aussi).",
    pullQuote: "« Marquer ne m'a jamais suffi. Je veux gagner avec mon pays. »",
    byline: "Laurent Mercier",
  },
  {
    name: "Julián Álvarez", flag: "🇦🇷", nat: "Argentine", club: "Atlético Madrid",
    age: 25, pos: "ATT", impact: 90,
    signature: "Le repli en pivot pour libérer le couloir",
    paragraph:
      "Héros silencieux de la CdM 2022, Álvarez arrive en 2026 dans la peau qu'il préfère : celle qu'on ne regarde pas trop. Sans Messi pour porter l'attention, l'Argentine devra inventer un récit — et il y a fort à parier que ce récit s'écrira au numéro 9. Quatre buts au Qatar, et déjà l'odeur du favori discret.",
    pullQuote: "« Je préfère gagner sans qu'on en parle. Ça veut dire qu'on a bien fait. »",
    byline: "Inès Halloul",
  },
  {
    name: "Antoine Griezmann", flag: "🇫🇷", nat: "France", club: "Atlético Madrid",
    age: 35, pos: "MIL", impact: 87,
    signature: "Le décalage entre les lignes, suivi d'une ouverture courbe",
    paragraph:
      "C'est sans doute son dernier grand tournoi. Griezmann le sait, et il le dit — sans pathos, sans déclaration de retraite, juste comme on dit que l'automne approche. Reculé en milieu axial chez les Bleus, il y prolonge l'art qu'il a toujours exercé : déranger les schémas sans casser les liens. Sa CdM sera plus politique que tactique.",
    pullQuote: "« On ne quitte pas une équipe. On finit par la voir continuer sans nous. »",
    byline: "Théo Pradier",
  },
  {
    name: "William Saliba", flag: "🇫🇷", nat: "France", club: "Arsenal",
    age: 25, pos: "DEF", impact: 88,
    signature: "L'anticipation, déclenchée trois secondes avant la passe",
    paragraph:
      "Le foot moderne a longtemps maltraité la fonction de défenseur central. Saliba la réhabilite. À 25 ans, il est devenu — sans bruit, sans excès, sans même qu'on s'en rende vraiment compte — le meilleur défenseur de Premier League. La France l'aligne désormais comme on aligne une certitude.",
    pullQuote: "« Défendre, c'est lire. Je passe mes soirées à lire. »",
    byline: "Marie-Capucine Aubry",
  },
  {
    name: "Virgil van Dijk", flag: "🇳🇱", nat: "Pays-Bas", club: "Liverpool",
    age: 34, pos: "DEF", impact: 87,
    signature: "Le duel aérien gagné sans saut visible",
    paragraph:
      "Van Dijk arrive en 2026 avec la stature d'un dernier gardien du temple. Les Pays-Bas, sans véritable star offensive depuis le départ de Memphis, reposeront beaucoup sur sa capacité à organiser tout ce qui se passe devant lui. Capitaine, monument, repère.",
    pullQuote: "« Diriger une défense, c'est savoir parler quand il faut, et se taire le reste du temps. »",
    byline: "Hugo Trintignant",
  },
  {
    name: "Luka Modrić", flag: "🇭🇷", nat: "Croatie", club: "Al-Qadsiah",
    age: 41, pos: "MIL", impact: 84,
    signature: "Le déplacement court, déclenché juste avant la pression",
    paragraph:
      "Cinquième Coupe du Monde, et probablement la dernière. Modrić aura tout vu, tout joué, tout porté — y compris une équipe nationale qu'il a trois fois mené en demi-finale. Son rôle, en 2026, sera moins celui du métronome que celui du dernier témoin. Une présence plus qu'une performance.",
    pullQuote: "« On joue tant qu'on a quelque chose à transmettre. Moi, j'ai encore. »",
    byline: "Salma Belkacem",
  },
  {
    name: "Aurélien Tchouaméni", flag: "🇫🇷", nat: "France", club: "Real Madrid",
    age: 25, pos: "MIL", impact: 86,
    signature: "Le tampon défensif, posé sans contact apparent",
    paragraph:
      "Tchouaméni n'a pas besoin de toucher le ballon pour exister. Il habite l'entre-deux de la sentinelle moderne — entre Kanté et Pogba, entre l'effacement et la conduite. La France l'aligne désormais comme on aligne un fondamental.",
    pullQuote: "« Le ballon, je le récupère. C'est aux autres de le faire vivre. »",
    byline: "Mathilde Verriest",
  },
  {
    name: "Endrick", flag: "🇧🇷", nat: "Brésil", club: "Real Madrid",
    age: 19, pos: "ATT", impact: 84,
    signature: "L'appel-décroché vers la profondeur",
    paragraph:
      "À 19 ans, Endrick est l'héritier qu'on a annoncé trop tôt et qu'on regarde malgré tout. Sa CdM sera l'épreuve qu'on n'a pas voulu lui imposer mais qu'il a réclamée. Il y a chez lui une joie de jeu qu'on n'avait plus vue depuis le jeune Rivaldo. Le Brésil, qui a perdu la sienne, a besoin de la sienne.",
    pullQuote: "« J'aime jouer. J'aime même quand on perd, du moment qu'on a joué. »",
    byline: "Pierre-Antoine Lacombe",
  },
  {
    name: "Kevin De Bruyne", flag: "🇧🇪", nat: "Belgique", club: "Manchester City",
    age: 34, pos: "MIL", impact: 88,
    signature: "Le centre tendu, déposé à 70 km/h sur le pied gauche",
    paragraph:
      "Dernière chance pour la génération dorée belge, qui n'aura finalement jamais rien gagné. De Bruyne le sait, et il joue désormais comme un homme qui ne demande plus rien aux statistiques. Sa Coupe du Monde sera celle d'un héritage déjà constitué — sauf surprise majeure.",
    pullQuote: "« Je n'ai plus rien à prouver. J'aimerais juste partir mieux. »",
    byline: "Yann Sorel",
  },
  {
    name: "Phil Foden", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", nat: "Angleterre", club: "Manchester City",
    age: 26, pos: "MIL", impact: 86,
    signature: "L'enroulé du droit depuis 22 mètres, pied droit, lucarne opposée",
    paragraph:
      "Foden a longtemps été le « numéro 10 » qu'on n'osait pas aligner. Cette fois, l'Angleterre n'a plus le choix. Il y a chez lui une qualité de cadrage qui rappelle le meilleur Silva, en plus direct. Sa CdM sera son procès de maturité.",
    pullQuote: "« Je n'ai jamais cherché à plaire. J'ai juste cherché à jouer. »",
    byline: "Camille Beaumont",
  },
  {
    name: "Bukayo Saka", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", nat: "Angleterre", club: "Arsenal",
    age: 24, pos: "ATT", impact: 85,
    signature: "Le rentré du pied droit, suivi d'une frappe enroulée",
    paragraph:
      "Saka a déjà connu l'enfer (le penalty de 2020) et la lumière (Arsenal version 2024). À 24 ans, il est cette rare denrée : un ailier qui pense le jeu plutôt que de juste l'occuper. L'Angleterre a besoin qu'il soit le second de Bellingham — sans devenir un faire-valoir.",
    pullQuote: "« J'ai grandi avec une douleur. Aujourd'hui, je grandis sans. »",
    byline: "Étienne Vasseur",
  },
  {
    name: "Pedri", flag: "🇪🇸", nat: "Espagne", club: "FC Barcelone",
    age: 23, pos: "MIL", impact: 87,
    signature: "Le un-deux à un toucher, en mouvement, entre trois adversaires",
    paragraph:
      "Pedri n'a jamais aimé la lumière, ce qui est étrange pour un joueur qui en attire autant. À 23 ans, il est déjà le métronome d'une Espagne qui a redécouvert son ADN. Sa CdM sera celle d'un milieu qui aime moins marquer que comprendre.",
    pullQuote: "« Le ballon ne va jamais où l'on croit. Il va où il se sent compris. »",
    byline: "Sophie Carayon",
  },
  {
    name: "Federico Valverde", flag: "🇺🇾", nat: "Uruguay", club: "Real Madrid",
    age: 28, pos: "MIL", impact: 86,
    signature: "La course de 80 mètres sans rupture, balle au pied",
    paragraph:
      "Valverde est ce qu'on appelle, faute de mieux, un « milieu total ». À 28 ans, il a tout fait au Real, et n'a quasiment rien gagné avec l'Uruguay — qui, lui, l'aligne plus volontiers en relayeur qu'en sentinelle. La CdM 2026 sera l'occasion, pour la Celeste, d'arrêter de gaspiller.",
    pullQuote: "« Courir, ce n'est pas de la générosité. C'est du métier. »",
    byline: "Laurent Mercier",
  },
  {
    name: "Rodri", flag: "🇪🇸", nat: "Espagne", club: "Manchester City",
    age: 30, pos: "MIL", impact: 89,
    signature: "L'interception haute, presque sans bouger",
    paragraph:
      "Ballon d'Or 2024, et pourtant le moins commenté des grands milieux européens — comme si son jeu, fait de discrétion et d'évidence, refusait l'épilogue. L'Espagne s'appuie sur lui comme une maison s'appuie sur ses fondations : on ne les voit que quand elles manquent.",
    pullQuote: "« J'aime que mon nom soit toujours le deuxième dans l'article. »",
    byline: "Inès Halloul",
  },
  {
    name: "Mike Maignan", flag: "🇫🇷", nat: "France", club: "Milan AC",
    age: 30, pos: "GB", impact: 84,
    signature: "La sortie aérienne sur ballon haut, mains hautes, regard fixe",
    paragraph:
      "Maignan est ce qu'on aime appeler un « gardien moderne » sans toujours savoir ce que ça veut dire. Concrètement : il sort, il joue, il dirige, il rassure. La France, qui a longtemps cherché un successeur à Lloris, l'a trouvé sans le chercher.",
    pullQuote: "« Le gardien, c'est le seul à pouvoir voir toute l'équipe en même temps. C'est aussi le seul à devoir le dire. »",
    byline: "Théo Pradier",
  },
  {
    name: "Achraf Hakimi", flag: "🇲🇦", nat: "Maroc", club: "Paris SG",
    age: 27, pos: "DEF", impact: 85,
    signature: "Le débordement de 50 mètres conclus par un centre tendu",
    paragraph:
      "Le Maroc 2022 avait été un signal. Le Maroc 2026 doit être une preuve. Hakimi, capitaine, leader, latéral total, incarne mieux que personne cette ambition d'une équipe qui a appris à ne plus s'excuser d'exister. Sa CdM portera plus que ses statistiques.",
    pullQuote: "« On nous attend. Maintenant, on doit aussi nous regarder. »",
    byline: "Marie-Capucine Aubry",
  },
  {
    name: "Takefusa Kubo", flag: "🇯🇵", nat: "Japon", club: "Real Sociedad",
    age: 24, pos: "ATT", impact: 82,
    signature: "L'élimination en mouvement, à l'extérieur du pied gauche",
    paragraph:
      "Le Japon attend depuis vingt ans le joueur capable de transformer une ambition de tournoi en attente de demi-finale. Kubo, formé à La Masia avant l'âge de 12 ans, pourrait être celui-là. Il porte une équipe disciplinée et technique, qui n'a probablement jamais été aussi près d'un huitième crédible.",
    pullQuote: "« Au Japon, on n'a pas le droit d'être ordinaire. On est juste poli. »",
    byline: "Hugo Trintignant",
  },
  {
    name: "Désiré Doué", flag: "🇫🇷", nat: "France", club: "Paris SG",
    age: 20, pos: "MIL", impact: 82,
    signature: "Le contre-appui inversé, suivi d'une frappe pied non dominant",
    paragraph:
      "Pour beaucoup, Désiré Doué est le nom qui circule sans encore exister. En 2026, il pourrait passer du club des promesses à celui des présences. Si Deschamps le titularise, son tournoi sera l'un des récits les plus suivis du printemps.",
    pullQuote: "« On me dit que j'ai du temps. J'aimerais déjà ne plus en avoir besoin. »",
    byline: "Salma Belkacem",
  },
  {
    name: "Khvicha Kvaratskhelia", flag: "🇬🇪", nat: "Géorgie", club: "Paris SG",
    age: 25, pos: "ATT", impact: 83,
    signature: "Le crochet intérieur en bout de course, gauche-droit",
    paragraph:
      "Kvaratskhelia est cette catégorie rare : l'ailier dont le pays entier porte le maillot. La Géorgie, qualifiée pour la première fois de son histoire, devra beaucoup à son numéro 7. Et l'inverse aussi : il a là, peut-être, l'unique scène mondiale qui dira tout de lui.",
    pullQuote: "« Quand on joue pour la Géorgie, on ne joue jamais seul. »",
    byline: "Mathilde Verriest",
  },
];

/** Players sorted by descending impact — useful for the "Top du numéro" block. */
export const ROSTER_BY_IMPACT = [...ROSTER].sort((a, b) => b.impact - a.impact);

/** Look up by exact name (case-insensitive). */
export function findRosterPlayer(name: string): MagazinePlayer | undefined {
  const lower = name.toLowerCase();
  return ROSTER.find(p => p.name.toLowerCase() === lower);
}
