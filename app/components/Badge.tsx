export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  let variant: "success" | "warning" | "error" = "error";
  if (score >= 0.8) variant = "success";
  else if (score >= 0.5) variant = "warning";

  return (
    <Badge variant={variant}>
      {(score * 100).toFixed(0)}%
    </Badge>
  );
}

export function TimingBadge({ ms }: { ms: number }) {
  let variant: "success" | "warning" | "error" = "success";
  if (ms > 5000) variant = "error";
  else if (ms > 2000) variant = "warning";

  return (
    <Badge variant={variant}>
      {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`}
    </Badge>
  );
}

export function CostBadge({ cost }: { cost: number }) {
  let variant: "success" | "warning" | "error" = "success";
  if (cost > 0.01) variant = "error";
  else if (cost > 0.001) variant = "warning";

  return (
    <Badge variant={variant}>
      ${cost.toFixed(4)}
    </Badge>
  );
}

export function TruncatedText({
  text,
  maxLength = 80,
}: {
  text: string;
  maxLength?: number;
}) {
  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  return (
    <span title={text} className="cursor-help">
      {text.slice(0, maxLength)}
      <span className="text-gray-400">...</span>
    </span>
  );
}

export function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

export function ModelBadge({ model }: { model: string }) {
  const isGPT5 = model.includes("gpt-5");
  const isGPT4o = model.includes("gpt-4o");
  
  let color = "bg-gray-100 text-gray-700";
  if (isGPT5) color = "bg-purple-100 text-purple-700";
  else if (isGPT4o) color = "bg-blue-100 text-blue-700";

  // Clean up model name for display
  const displayName = model
    .replace("gpt-5-mini_", "GPT-5 Mini ")
    .replace("gpt-5-nano_", "GPT-5 Nano ")
    .replace("gpt-4o-mini", "GPT-4o Mini")
    .replace("_", " ")
    .replace("minimal", "Min")
    .replace("medium", "Med")
    .replace("low", "Low")
    .replace("high", "High");

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${color}`}>
      {displayName}
    </span>
  );
}

export function ComparisonIndicator({
  value1,
  value2,
  higherIsBetter = true,
}: {
  value1: number;
  value2: number;
  higherIsBetter?: boolean;
}) {
  const diff = value1 - value2;
  const percentDiff = value2 !== 0 ? ((diff / value2) * 100).toFixed(1) : "N/A";
  
  const isBetter = higherIsBetter ? diff > 0 : diff < 0;
  const isWorse = higherIsBetter ? diff < 0 : diff > 0;

  if (Math.abs(diff) < 0.001) {
    return <span className="text-gray-400 text-xs">≈ same</span>;
  }

  return (
    <span
      className={`text-xs font-medium ${
        isBetter ? "text-emerald-600" : isWorse ? "text-red-600" : "text-gray-500"
      }`}
    >
      {isBetter ? "↑" : "↓"} {Math.abs(Number(percentDiff))}%
    </span>
  );
}
