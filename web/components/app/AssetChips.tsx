/** Shared asset selector — a bordered row of brutalist chips, active one filled acid. */
export function AssetChips({
  assets,
  active,
  onPick,
  size = "md",
}: {
  assets: string[];
  active: string;
  onPick: (sym: string) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3.5 py-2 text-xs" : "px-5 py-3 text-[13px]";
  return (
    <div className="grid w-fit max-w-full grid-cols-3 gap-0.5 border-2 border-paper bg-paper sm:grid-cols-6">
      {assets.map((sym) => {
        const isActive = sym.toLowerCase() === active.toLowerCase();
        return (
          <button
            key={sym}
            onClick={() => onPick(sym)}
            className={`font-mono font-semibold transition-colors ${pad} ${
              isActive ? "bg-acid text-ink" : "bg-ink text-paper hover:bg-paper/10"
            }`}
          >
            {sym}
          </button>
        );
      })}
    </div>
  );
}
