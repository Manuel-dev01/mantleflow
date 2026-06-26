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
    <div className="flex w-fit max-w-full flex-wrap border-2 border-paper">
      {assets.map((sym) => {
        const isActive = sym.toLowerCase() === active.toLowerCase();
        return (
          <button
            key={sym}
            onClick={() => onPick(sym)}
            className={`border-r-2 border-paper font-mono font-semibold transition-colors last:border-r-0 ${pad} ${
              isActive ? "bg-acid text-ink" : "bg-transparent text-paper hover:bg-paper/10"
            }`}
          >
            {sym}
          </button>
        );
      })}
    </div>
  );
}
