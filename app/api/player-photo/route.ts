import { NextResponse } from "next/server";

export const revalidate = 604800;

interface WikidataBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  image?: { value: string };
  dateOfBirth?: { value: string };
  height?: { value: string };
}

function cleanTerm(value: string | null): string {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function sparqlString(value: string): string {
  return JSON.stringify(value);
}

function commonsFilePath(url: string): string {
  if (!url) return "";
  if (url.includes("Special:FilePath")) return url.replace(/^http:/, "https:");
  const file = decodeURIComponent(url.split("/").pop() ?? "");
  return file
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=320`
    : url.replace(/^http:/, "https:");
}

function heightToCm(value: string | undefined): number | null {
  const parsed = parseFloat(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed > 3 ? parsed : parsed * 100);
}

async function queryWikidata(search: string): Promise<WikidataBinding[]> {
  const query = `
SELECT ?item ?itemLabel ?image ?dateOfBirth ?height WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org";
                    wikibase:api "EntitySearch";
                    mwapi:search ${sparqlString(search)};
                    mwapi:language "en".
    ?item wikibase:apiOutputItem mwapi:item.
  }
  ?item wdt:P31 wd:Q5.
  OPTIONAL { ?item wdt:P106/wdt:P279* wd:Q937857. BIND(true AS ?footballer) }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P569 ?dateOfBirth. }
  OPTIONAL { ?item wdt:P2048 ?height. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
LIMIT 8`;

  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");

  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "FootPredictom/1.0 (player-photo lookup)",
    },
    signal: AbortSignal.timeout(8000),
  } as RequestInit);

  if (!res.ok) return [];
  const data = await res.json();
  return data?.results?.bindings ?? [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = cleanTerm(searchParams.get("name"));
  const club = cleanTerm(searchParams.get("club"));

  if (!name) {
    return NextResponse.json({ imageUrl: null, source: "none", confidence: "low" }, { status: 400 });
  }

  const searches = [
    `${name} ${club} footballer`.trim(),
    `${name} footballer`,
    name,
  ];

  for (const search of searches) {
    try {
      const rows = await queryWikidata(search);
      const withImage = rows.find((row) => row.image?.value);
      const best = withImage ?? rows[0];
      if (best?.image?.value) {
        return NextResponse.json({
          imageUrl: commonsFilePath(best.image.value),
          source: "wikidata",
          confidence: search.includes("footballer") ? "medium" : "low",
          wikidataUrl: best.item?.value ?? null,
          label: best.itemLabel?.value ?? name,
          dateOfBirth: best.dateOfBirth?.value?.slice(0, 10) ?? null,
          height: heightToCm(best.height?.value),
        });
      }
    } catch {
      // Try the next search shape.
    }
  }

  return NextResponse.json({
    imageUrl: null,
    source: "fallback",
    confidence: "low",
    label: name,
  });
}
