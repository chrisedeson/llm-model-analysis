import { promises as fs } from "fs";
import path from "path";
import { ComparisonTable } from "./components/ComparisonTable";
import { Navigation, PageHeader } from "./components/Navigation";
import { StatCard, StatCardGrid } from "./components/StatCard";

// Types for the comparison data
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

// Load data at build time
async function getComparisonData(): Promise<ComparisonData | null> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public/data/comparison_gpt-4o-mini_vs_gpt-5-mini.json"
    );
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await getComparisonData();

  // Show demo data if no real data yet
  if (!data) {
    return (
      <div className="min-h-screen bg-[#0C0C0D]">
        <Navigation currentPath="/" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="GPT-4o-mini vs GPT-5-mini"
            description="Head-to-head comparison for BYU-Pathway chatbot. Run the evaluation script to generate data."
            badge="Primary Comparison"
          />
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-6 mt-8">
            <h3 className="text-base font-medium text-[#F59E0B] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              No Evaluation Data Found
            </h3>
            <p className="mt-2 text-white/60 text-[14px]">
              Run the evaluation script to generate comparison data:
            </p>
            <pre className="mt-3 bg-black/40 p-4 rounded-lg text-[13px] font-mono text-white/80 overflow-x-auto border border-white/[0.06]">
{`cd llm-model-analysis
cp your_langfuse_data.csv data/langfuse_traces.csv
python scripts/run_evaluation.py --samples 100 --models gpt-4o-mini gpt-5-mini_minimal_low`}
            </pre>
          </div>
        </main>
      </div>
    );
  }

  const model1Better = data.model1.avg_score > data.model2.avg_score;
  const scoreDiff = Math.abs(data.model1.avg_score - data.model2.avg_score);
  const timeDiff = Math.abs(data.model1.avg_latency_ms - data.model2.avg_latency_ms);
  const model1Faster = data.model1.avg_latency_ms < data.model2.avg_latency_ms;
  const costDiff = ((data.model2.total_cost - data.model1.total_cost) / data.model1.total_cost) * 100;

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="GPT-4o-mini vs GPT-5-mini"
          description="Head-to-head comparison for BYU-Pathway chatbot. This analysis compares response quality, speed, and cost between our current production model (GPT-4o-mini) and the new GPT-5-mini with minimal reasoning."
          badge="Primary Comparison"
        />

        {/* Summary Stats */}
        <StatCardGrid>
          <StatCard
            title="Questions Evaluated"
            value={data.metadata.num_questions}
            subtitle={`Run date: ${new Date(data.metadata.generated_at).toLocaleDateString()}`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Quality Winner"
            value={model1Better ? data.model1.name : data.model2.name}
            subtitle={`+${scoreDiff.toFixed(2)} higher avg score`}
            color={model1Better ? "blue" : "purple"}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />
          <StatCard
            title="Speed Winner"
            value={model1Faster ? data.model1.name : data.model2.name}
            subtitle={`${Math.round(timeDiff)}ms faster avg response`}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Cost Difference"
            value={`${costDiff > 0 ? "+" : ""}${costDiff.toFixed(1)}%`}
            subtitle={`M1: $${data.model1.total_cost.toFixed(4)} | M2: $${data.model2.total_cost.toFixed(4)}`}
            color={costDiff > 0 ? "orange" : "green"}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </StatCardGrid>

        {/* Model Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <ModelCard model={data.model1} label="Model 1 (Current)" color="blue" />
          <ModelCard model={data.model2} label="Model 2 (Candidate)" color="purple" />
        </div>

        {/* Comparison Table */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-white mb-4">
            Question-by-Question Comparison
          </h2>
          <ComparisonTable 
            comparisons={data.comparisons} 
            model1Name={data.model1.name}
            model2Name={data.model2.name}
          />
        </div>

        {/* Recommendation Box */}
        <div className="mt-8 bg-[#141517] rounded-xl p-6 border border-white/[0.08]">
          <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Summary
          </h3>
          <p className="mt-2 text-[14px] text-white/60 leading-relaxed">
            Based on this evaluation, <span className="text-white font-medium">{model1Better ? data.model1.name : data.model2.name}</span> shows
            {" "}<span className="text-white font-medium">{scoreDiff.toFixed(2)}</span> points higher quality scores (out of 5).
            {" "}{model1Faster ? data.model1.name : data.model2.name} is <span className="text-white font-medium">{Math.round(timeDiff)}ms faster</span> on average.
            {" "}Cost-wise, {data.model2.name} is <span className="text-white font-medium">{Math.abs(costDiff).toFixed(1)}%</span>
            {" "}{costDiff > 0 ? "more expensive" : "cheaper"} than {data.model1.name}.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[13px] text-white/30">
          Responses graded by GPT-5.1 with high reasoning effort on 5 dimensions (1-5 scale)
        </p>
      </main>
    </div>
  );
}

function ModelCard({
  model,
  label,
  color,
}: {
  model: ModelSummary;
  label: string;
  color: "blue" | "purple";
}) {
  const accentColors = {
    blue: "#5E6AD2",
    purple: "#9D5BD2",
  };
  const accent = accentColors[color];

  return (
    <div className="bg-[#141517] rounded-xl border border-white/[0.08] p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] text-white/40 uppercase tracking-wider">{label}</div>
          <h3 className="text-lg font-semibold text-white mt-0.5" style={{ color: accent }}>{model.name}</h3>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}15` }}>
          {model.api_type === "responses" ? (
            <svg className="w-5 h-5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Score</div>
          <div className="text-xl font-semibold mt-0.5" style={{ color: accent }}>{model.avg_score.toFixed(2)}</div>
          <div className="text-[11px] text-white/30">out of 5</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Latency</div>
          <div className="text-xl font-semibold mt-0.5" style={{ color: accent }}>{Math.round(model.avg_latency_ms)}<span className="text-sm text-white/40">ms</span></div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Cost</div>
          <div className="text-base font-medium text-white/80 mt-0.5">${model.total_cost.toFixed(4)}</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Success Rate</div>
          <div className="text-base font-medium text-[#4CAF79] mt-0.5">100%</div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
        {model.api_type === "responses" ? (
          <>
            <span className="px-2 py-1 text-[11px] bg-white/[0.04] text-white/50 rounded border border-white/[0.06]">Reasoning: {model.reasoning_effort}</span>
            <span className="px-2 py-1 text-[11px] bg-white/[0.04] text-white/50 rounded border border-white/[0.06]">Verbosity: {model.verbosity}</span>
          </>
        ) : (
          <span className="px-2 py-1 text-[11px] bg-white/[0.04] text-white/50 rounded border border-white/[0.06]">Chat Completions API</span>
        )}
      </div>
    </div>
  );
}
