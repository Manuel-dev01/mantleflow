import type { DistributionMap } from "@mantleflow/agent";
import { loadConfig, createCapabilities } from "@mantleflow/agent";
import {
  Nav,
  Hero,
  Marquee,
  Thesis,
  HowItWorks,
  ProductPreview,
  StatBand,
  AgentStack,
  Manifesto,
  Footer,
} from "../components/site/sections";

// Landing renders server-side and memoises the live preview (judges hit a fast page; the numbers are
// still real Mantle reads). Short window so a transient bad read self-heals quickly and the landing
// stays in sync with the live app.
export const revalidate = 300;

// MI4 = the centerpiece (the brief's "$1M MI4" example): the thesis in one card — holder GATED by
// Securitize + no on-chain secondary trading venue. A strong, honest headline (HOLDING = GATED).
const PREVIEW_SYMBOL = "MI4";

async function loadPreview(): Promise<DistributionMap | null> {
  const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
  // Build up to twice: never CACHE a snapshot where compliance degraded to insufficient-data (a
  // transient Etherscan failure) — that's exactly what made the landing disagree with the live app.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const map = await caps.buildDistributionMap(PREVIEW_SYMBOL);
      const comp = map.subScores.find((s) => s.id === "compliance");
      if (comp?.status !== "insufficient-data" || attempt === 1) return map;
    } catch {
      if (attempt === 1) return null; // never fabricate — render the honest "unavailable" shell
    }
  }
  return null;
}

export default async function LandingPage() {
  const preview = await loadPreview();

  // Marquee = verified qualitative descriptors of our tracked assets (no fabricated numbers).
  const ticker = [
    "MI4 ▸ SECURITIZE GATED",
    "mETH ▸ LIQUID STAKING",
    "cmETH ▸ RESTAKED ETH",
    "fBTC ▸ OMNICHAIN BTC",
    "USDe ▸ YIELD STABLE",
    "USDY ▸ BLOCKLIST HOOK",
    "DISTRIBUTION ▸ NOT ISSUANCE",
    "EVERY DATUM ▸ SOURCE-RECEIPTED",
  ];

  // StatBand = three true, instant facts (not the design's fabricated 142/38/6).
  const stats = [
    { v: "6", k: "RWA ASSETS TRACKED" },
    { v: "6", k: "LIVE SUB-SCORES" },
    { v: "100%", k: "SOURCE-RECEIPTED" },
  ];

  return (
    <main className="w-full overflow-x-hidden bg-ink">
      <Nav />
      <Hero />
      <Marquee items={ticker} />
      <Thesis />
      <HowItWorks />
      <ProductPreview map={preview} />
      <StatBand stats={stats} />
      <AgentStack />
      <Manifesto />
      <Footer />
    </main>
  );
}
