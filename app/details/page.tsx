import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";

// Types (shared with main page)
interface Grade {
  on_topic: number;
  grounded: number;
  no_contradiction: number;
  understandability: number;
  overall: number;
  average: number;
}

interface ModelResult {
  response: string;
  latency_ms: number;
  cost: number;
  grade: Grade;
  error: string | null;
}

interface Comparison {
  id: number;
  question: string;
  context: string;
  model1: ModelResult;
  model2: ModelResult;
}

interface ModelSummary {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  total_cost: number;
  avg_latency_ms: number;
  avg_score: number;
  successful_responses: number;
}

interface ComparisonData {
  metadata: {
    generated_at: string;
    num_questions: number;
  };
  model1: ModelSummary;
  model2: ModelSummary;
  comparisons: Comparison[];
}

async function getComparisonData(): Promise<ComparisonData> {
  const filePath = path.join(
    process.cwd(),
    "public/data/comparison_gpt-4o-mini_vs_gpt-5-mini.json"
  );
  const fileContents = await fs.readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

export default async function DetailsPage() {
  const data = await getComparisonData();

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0C0C0D]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 text-white font-semibold">
                <svg className="w-5 h-5 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                LLM Analysis
              </Link>
              <div className="flex items-center gap-1">
                <Link href="/" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
                  Overview
                </Link>
                <Link href="/models" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
                  All Models
                </Link>
                <Link href="/compare" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
                  Compare
                </Link>
                <Link href="/details" className="px-3 py-1.5 text-sm text-white bg-white/[0.08] rounded-md">
                  Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Detailed Results
          </h1>
          <p className="text-gray-500 text-sm">
            Full responses and grading breakdown for each question
          </p>
        </div>

        {/* Per-question cards */}
        <div className="space-y-4">
          {data.comparisons.map((comp) => (
            <div
              key={comp.id}
              className="bg-[#141517] rounded-lg border border-white/[0.08] overflow-hidden"
            >
              {/* Question header */}
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <span className="bg-[#5E6AD2]/15 text-[#5E6AD2] text-xs font-medium px-2.5 py-1 rounded-full">
                    Q{comp.id}
                  </span>
                  <h2 className="text-sm font-medium text-white">
                    {comp.question}
                  </h2>
                </div>
                {comp.context && (
                  <details className="mt-3 group">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                      Show context
                    </summary>
                    <p className="mt-2 text-xs text-gray-400 bg-[#0C0C0D] p-3 rounded-md border border-white/[0.06]">
                      {comp.context}
                    </p>
                  </details>
                )}
              </div>

              {/* Model responses side by side */}
              <div className="grid md:grid-cols-2 divide-x divide-white/[0.08]">
                {/* Model 1 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#5E6AD2]">{data.model1.name}</h3>
                    <div className="flex gap-2">
                      <span className="bg-[#5E6AD2]/15 text-[#5E6AD2] text-xs px-2 py-1 rounded-md">
                        {Math.round(comp.model1.latency_ms)}ms
                      </span>
                      <span className="bg-white/[0.06] text-gray-400 text-xs px-2 py-1 rounded-md">
                        ${comp.model1.cost.toFixed(5)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {comp.model1.response || (
                      <span className="text-red-400 italic">
                        Error: {comp.model1.error}
                      </span>
                    )}
                  </p>
                  <GradeDisplay grade={comp.model1.grade} color="blue" />
                </div>

                {/* Model 2 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#4CAF79]">{data.model2.name}</h3>
                    <div className="flex gap-2">
                      <span className="bg-[#4CAF79]/15 text-[#4CAF79] text-xs px-2 py-1 rounded-md">
                        {Math.round(comp.model2.latency_ms)}ms
                      </span>
                      <span className="bg-white/[0.06] text-gray-400 text-xs px-2 py-1 rounded-md">
                        ${comp.model2.cost.toFixed(5)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {comp.model2.response || (
                      <span className="text-red-400 italic">
                        Error: {comp.model2.error}
                      </span>
                    )}
                  </p>
                  <GradeDisplay grade={comp.model2.grade} color="green" />
                </div>
              </div>

              {/* Winner indicator */}
              <div className="px-6 py-3 text-center text-sm border-t border-white/[0.08] bg-[#0C0C0D]/50">
                {comp.model1.grade.average > comp.model2.grade.average ? (
                  <span className="text-[#5E6AD2] text-xs font-medium">
                    ✓ {data.model1.name} scored higher (
                    {comp.model1.grade.average.toFixed(2)} vs{" "}
                    {comp.model2.grade.average.toFixed(2)})
                  </span>
                ) : comp.model2.grade.average > comp.model1.grade.average ? (
                  <span className="text-[#4CAF79] text-xs font-medium">
                    ✓ {data.model2.name} scored higher (
                    {comp.model2.grade.average.toFixed(2)} vs{" "}
                    {comp.model1.grade.average.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs font-medium">
                    Tie ({comp.model1.grade.average.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function GradeDisplay({ grade, color }: { grade: Grade; color: "blue" | "green" }) {
  const dimensions = [
    { key: "on_topic", label: "On Topic", value: grade.on_topic },
    { key: "grounded", label: "Grounded", value: grade.grounded },
    { key: "no_contradiction", label: "No Contradiction", value: grade.no_contradiction },
    { key: "understandability", label: "Understandable", value: grade.understandability },
    { key: "overall", label: "Overall", value: grade.overall },
  ];

  const accentColor = color === "blue" ? "#5E6AD2" : "#4CAF79";

  return (
    <div className="border-t border-white/[0.08] pt-4">
      <div className="text-xs font-medium text-gray-500 mb-3">
        Grading (1-5 scale)
      </div>
      <div className="grid grid-cols-5 gap-2 text-center">
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-1">
            <div className="text-[10px] text-gray-500 truncate">{dim.label}</div>
            <div
              className={`text-base font-semibold ${
                dim.value >= 4
                  ? "text-[#4CAF79]"
                  : dim.value >= 3
                  ? "text-[#E5A913]"
                  : "text-[#E5484D]"
              }`}
            >
              {dim.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-center">
        <span 
          className="text-xs font-medium px-2.5 py-1 rounded-md"
          style={{ 
            backgroundColor: `${accentColor}15`,
            color: accentColor 
          }}
        >
          Average: {grade.average.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
