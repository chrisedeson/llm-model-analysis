import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { ComparisonTable } from "./components/ComparisonTable";
import { Navigation, PageHeader } from "./components/Navigation";
import { StatCard, StatCardGrid } from "./components/StatCard";

// Types for the comparison data (legacy format)
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
  p95_latency_ms?: number;
  avg_tokens?: number;
  cost_per_1k?: number;
  cost_per_10k?: number;
  avg_score: number;
  scores?: {
    on_topic: number;
    grounded: number;
    no_contradiction: number;
    understandability: number;
    overall: number;
  };
  successful_responses: number;
}

interface ComparisonData {
  metadata: {
    generated_at: string;
    num_questions: number;
    grader_model?: string;
    grader_reasoning_effort?: string;
  };
  model1: ModelSummary;
  model2: ModelSummary;
  comparisons: Comparison[];
}

// Unified JSON structure - flat format (new format support)
interface UnifiedModelData {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  successful_responses: number;
  avg_score: number;
  avg_latency_ms: number;
  p95_latency_ms?: number;
  scores?: {
    on_topic: number;
    grounded: number;
    no_contradiction: number;
    understandability: number;
    overall: number;
  };
  usage?: {
    total_input_tokens: number;
    total_output_tokens: number;
  };
  costs?: {
    total_cost: number;
  };
}

interface UnifiedEvaluationData {
  metadata: {
    generated_at: string;
    num_questions: number;
    num_models: number;
    model_keys: string[];
    grader_model?: string;
    grader_reasoning_effort?: string;
  };
  models: Record<string, UnifiedModelData>;
  questions: unknown[];
}

// Normalized model for display
interface NormalizedModel {
  key: string;
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  avg_score: number;
  avg_latency_ms: number;
  p95_latency_ms?: number;
  total_cost: number;
  successful_responses: number;
  scores?: {
    on_topic: number;
    grounded: number;
    no_contradiction: number;
    understandability: number;
    overall: number;
  };
}

interface OverviewData {
  models: NormalizedModel[];
  numQuestions: number;
  generatedAt: string;
  graderModel: string;
  graderReasoning: string;
  comparisons?: Comparison[];
}

// Load data at build time - supports both unified and legacy formats
async function getOverviewData(): Promise<OverviewData | null> {
  try {
    const dataDir = path.join(process.cwd(), "public/data");
    const files = await fs.readdir(dataDir);
    
    // First, try unified format
    if (files.includes("evaluation_results.json")) {
      const filePath = path.join(dataDir, "evaluation_results.json");
      const content = await fs.readFile(filePath, "utf8");
      const data: UnifiedEvaluationData = JSON.parse(content);
      
      const models = Object.entries(data.models).map(([key, model]) => ({
        key,
        name: model.name,
        model_id: model.model_id,
        api_type: model.api_type,
        reasoning_effort: model.reasoning_effort,
        verbosity: model.verbosity,
        avg_score: model.avg_score,
        avg_latency_ms: model.avg_latency_ms,
        p95_latency_ms: model.p95_latency_ms,
        total_cost: model.costs?.total_cost ?? 0,
        successful_responses: model.successful_responses,
        scores: model.scores,
      }));
      
      return {
        models,
        numQuestions: data.metadata.num_questions,
        generatedAt: data.metadata.generated_at,
        graderModel: data.metadata.grader_model || "GPT-5.1",
        graderReasoning: data.metadata.grader_reasoning_effort || "high",
      };
    }
    
    // Fallback to legacy comparison format
    const comparisonFile = files.find(f => f.startsWith("comparison_") && f.endsWith(".json"));
    if (!comparisonFile) return null;
    
    const filePath = path.join(dataDir, comparisonFile);
    const content = await fs.readFile(filePath, "utf8");
    const data: ComparisonData = JSON.parse(content);
    
    const models: NormalizedModel[] = [
      {
        key: data.model1.model_id,
        name: data.model1.name,
        model_id: data.model1.model_id,
        api_type: data.model1.api_type,
        reasoning_effort: data.model1.reasoning_effort,
        verbosity: data.model1.verbosity,
        avg_score: data.model1.avg_score,
        avg_latency_ms: data.model1.avg_latency_ms,
        p95_latency_ms: data.model1.p95_latency_ms,
        total_cost: data.model1.total_cost,
        successful_responses: data.model1.successful_responses,
        scores: data.model1.scores,
      },
      {
        key: data.model2.model_id,
        name: data.model2.name,
        model_id: data.model2.model_id,
        api_type: data.model2.api_type,
        reasoning_effort: data.model2.reasoning_effort,
        verbosity: data.model2.verbosity,
        avg_score: data.model2.avg_score,
        avg_latency_ms: data.model2.avg_latency_ms,
        p95_latency_ms: data.model2.p95_latency_ms,
        total_cost: data.model2.total_cost,
        successful_responses: data.model2.successful_responses,
        scores: data.model2.scores,
      },
    ];
    
    return {
      models,
      numQuestions: data.metadata.num_questions,
      generatedAt: data.metadata.generated_at,
      graderModel: data.metadata.grader_model || "GPT-5.1",
      graderReasoning: data.metadata.grader_reasoning_effort || "high",
      comparisons: data.comparisons,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await getOverviewData();

  // Show demo data if no real data yet
  if (!data || data.models.length === 0) {
    return (
      <div className="min-h-screen bg-[#0C0C0D]">
        <Navigation currentPath="/" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="LLM Model Comparison"
            description="Head-to-head comparison for BYU-Pathway chatbot. Run the evaluation script to generate data."
            badge="No Data"
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

  // Sort models and get stats
  const sortedModels = [...data.models].sort((a, b) => b.avg_score - a.avg_score);
  const model1 = sortedModels[0];
  const model2 = sortedModels[1] || sortedModels[0];
  
  const model1Better = model1.avg_score > model2.avg_score;
  const scoreDiff = Math.abs(model1.avg_score - model2.avg_score);
  const timeDiff = Math.abs(model1.avg_latency_ms - model2.avg_latency_ms);
  const model1Faster = model1.avg_latency_ms < model2.avg_latency_ms;
  const costDiff = model1.total_cost > 0 
    ? ((model2.total_cost - model1.total_cost) / model1.total_cost) * 100 
    : 0;

  // For unified format with many models
  const isMultiModel = data.models.length > 2;
  const fastestModel = [...data.models].sort((a, b) => a.avg_latency_ms - b.avg_latency_ms)[0];
  const cheapestModel = [...data.models].sort((a, b) => a.total_cost - b.total_cost)[0];

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={isMultiModel ? "LLM Model Evaluation Dashboard" : `${model1.name} vs ${model2.name}`}
          description={isMultiModel 
            ? `Comprehensive evaluation of ${data.models.length} models on ${data.numQuestions} questions. Compare response quality, speed, and cost.`
            : `Head-to-head comparison evaluating ${data.numQuestions} questions. Comparing response quality, speed, and cost.`
          }
          badge={isMultiModel ? "Overview" : "Primary Comparison"}
        />

        {/* Summary Stats */}
        <StatCardGrid>
          <StatCard
            title={isMultiModel ? "Models Evaluated" : "Questions Evaluated"}
            value={isMultiModel ? data.models.length : data.numQuestions}
            subtitle={`Run date: ${new Date(data.generatedAt).toLocaleDateString()}`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Quality Winner"
            value={model1.name}
            subtitle={`+${scoreDiff.toFixed(2)} higher avg score`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />
          <StatCard
            title="Speed Winner"
            value={isMultiModel ? fastestModel.name : (model1Faster ? model1.name : model2.name)}
            subtitle={`${Math.round(isMultiModel ? fastestModel.avg_latency_ms : timeDiff)}ms ${isMultiModel ? "avg response" : "faster avg response"}`}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title={isMultiModel ? "Most Cost-Effective" : "Cost Difference"}
            value={isMultiModel ? cheapestModel.name : `${costDiff > 0 ? "+" : ""}${costDiff.toFixed(1)}%`}
            subtitle={isMultiModel 
              ? `$${cheapestModel.total_cost.toFixed(4)} total`
              : `M1: $${model1.total_cost.toFixed(4)} | M2: $${model2.total_cost.toFixed(4)}`
            }
            color={isMultiModel ? "purple" : (costDiff > 0 ? "orange" : "green")}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </StatCardGrid>

        {/* Model Cards - Featured Comparison */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <ModelCard 
            model={model1} 
            label={isMultiModel ? "Best Quality" : "Model 1 (Current)"} 
            color="blue" 
            numQuestions={data.numQuestions} 
          />
          <ModelCard 
            model={model2} 
            label={isMultiModel ? "Runner Up" : "Model 2 (Candidate)"} 
            color="purple" 
            numQuestions={data.numQuestions} 
          />
        </div>

        {/* Model Rankings (for multi-model) */}
        {isMultiModel && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Model Rankings</h2>
              <Link 
                href="/models" 
                className="text-sm text-[#5E6AD2] hover:text-[#7C85E0] transition-colors flex items-center gap-1"
              >
                View Full Leaderboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="bg-[#141517] rounded-xl border border-white/[0.08] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3 w-12">#</th>
                    <th className="text-left text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3">Model</th>
                    <th className="text-left text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3">Config</th>
                    <th className="text-right text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3">Score</th>
                    <th className="text-right text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3">Latency</th>
                    <th className="text-right text-[10px] font-medium text-white/40 uppercase tracking-wider px-6 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModels.slice(0, 5).map((model, index) => (
                    <tr key={model.key} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? "bg-[#E5A913]/20 text-[#E5A913]" :
                          index === 1 ? "bg-gray-400/20 text-gray-400" :
                          index === 2 ? "bg-[#CD7F32]/20 text-[#CD7F32]" :
                          "bg-white/[0.06] text-white/50"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{model.name}</div>
                        <div className="text-[11px] text-white/30">{model.model_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {model.reasoning_effort && (
                            <span className="text-[11px] bg-[#9D5BD2]/15 text-[#9D5BD2] px-2 py-0.5 rounded border border-white/[0.06]">
                              {model.reasoning_effort}
                            </span>
                          )}
                          {model.verbosity && (
                            <span className="text-[11px] bg-[#5E6AD2]/15 text-[#5E6AD2] px-2 py-0.5 rounded border border-white/[0.06]">
                              {model.verbosity}
                            </span>
                          )}
                          {!model.reasoning_effort && !model.verbosity && (
                            <span className="text-[11px] text-white/30">default</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${
                          model.avg_score >= 4.5 ? "text-[#4CAF79]" :
                          model.avg_score >= 4.0 ? "text-[#5E6AD2]" :
                          model.avg_score >= 3.5 ? "text-[#F59E0B]" :
                          "text-[#EF4444]"
                        }`}>
                          {model.avg_score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white/60">
                        {Math.round(model.avg_latency_ms)}ms
                      </td>
                      <td className="px-6 py-4 text-right text-white/60">
                        ${model.total_cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions (for multi-model) */}
        {isMultiModel && (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <Link href="/compare" className="group bg-[#141517] rounded-xl border border-white/[0.08] p-6 hover:border-[#5E6AD2]/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#5E6AD2]/15">
                  <svg className="w-6 h-6 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#5E6AD2] transition-colors">
                    Compare Models
                  </h3>
                  <p className="text-sm text-white/40 mt-1">
                    Select any two models to compare head-to-head
                  </p>
                </div>
              </div>
            </Link>
            
            <Link href="/details" className="group bg-[#141517] rounded-xl border border-white/[0.08] p-6 hover:border-[#9D5BD2]/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#9D5BD2]/15">
                  <svg className="w-6 h-6 text-[#9D5BD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#9D5BD2] transition-colors">
                    View Details
                  </h3>
                  <p className="text-sm text-white/40 mt-1">
                    Explore individual responses and quality scores
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Comparison Table (for legacy 2-model format with comparisons) */}
        {data.comparisons && data.comparisons.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">
              Question-by-Question Comparison
            </h2>
            <ComparisonTable 
              comparisons={data.comparisons} 
              model1Name={model1.name}
              model2Name={model2.name}
            />
          </div>
        )}

        {/* Recommendation Box */}
        <div className="mt-8 bg-[#141517] rounded-xl p-6 border border-white/[0.08]">
          <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Summary
          </h3>
          <p className="mt-2 text-[14px] text-white/60 leading-relaxed">
            Based on this evaluation, <span className="text-white font-medium">{model1.name}</span> shows
            {" "}<span className="text-white font-medium">{scoreDiff.toFixed(2)}</span> points higher quality scores (out of 5).
            {" "}{model1Faster ? model1.name : model2.name} is <span className="text-white font-medium">{Math.round(timeDiff)}ms faster</span> on average.
            {" "}Cost-wise, {model2.name} is <span className="text-white font-medium">{Math.abs(costDiff).toFixed(1)}%</span>
            {" "}{costDiff > 0 ? "more expensive" : "cheaper"} than {model1.name}.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[13px] text-white/30">
          Responses graded by {data.graderModel.toUpperCase()} with {data.graderReasoning} reasoning effort on 5 dimensions (1-5 scale)
        </p>
      </main>
    </div>
  );
}

function ModelCard({
  model,
  label,
  color,
  numQuestions,
}: {
  model: NormalizedModel;
  label: string;
  color: "blue" | "purple";
  numQuestions: number;
}) {
  const accentColors = {
    blue: "#5E6AD2",
    purple: "#9D5BD2",
  };
  const accent = accentColors[color];

  // Calculate cost projections if not in data
  const costPer1k = (model.total_cost / numQuestions) * 1000;
  const costPer10k = (model.total_cost / numQuestions) * 10000;

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
          {model.p95_latency_ms && (
            <div className="text-[11px] text-white/30">p95: {Math.round(model.p95_latency_ms)}ms</div>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Cost / 1K Queries</div>
          <div className="text-base font-medium text-white/80 mt-0.5">${costPer1k.toFixed(2)}</div>
          <div className="text-[11px] text-white/30">10K: ${costPer10k.toFixed(2)}</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Success Rate</div>
          <div className="text-base font-medium text-[#4CAF79] mt-0.5">{((model.successful_responses / numQuestions) * 100).toFixed(0)}%</div>
          <div className="text-[11px] text-white/30">{model.successful_responses}/{numQuestions} queries</div>
        </div>
      </div>

      {/* Quality Scores Breakdown */}
      {model.scores && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Quality Dimensions</div>
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <div className="text-[10px] text-white/40">Topic</div>
              <div className="text-sm font-medium" style={{ color: model.scores.on_topic >= 4 ? "#4CAF79" : model.scores.on_topic >= 3 ? "#F59E0B" : "#EF4444" }}>
                {model.scores.on_topic.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">Ground</div>
              <div className="text-sm font-medium" style={{ color: model.scores.grounded >= 4 ? "#4CAF79" : model.scores.grounded >= 3 ? "#F59E0B" : "#EF4444" }}>
                {model.scores.grounded.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">NoCont</div>
              <div className="text-sm font-medium" style={{ color: model.scores.no_contradiction >= 4 ? "#4CAF79" : model.scores.no_contradiction >= 3 ? "#F59E0B" : "#EF4444" }}>
                {model.scores.no_contradiction.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">Clear</div>
              <div className="text-sm font-medium" style={{ color: model.scores.understandability >= 4 ? "#4CAF79" : model.scores.understandability >= 3 ? "#F59E0B" : "#EF4444" }}>
                {model.scores.understandability.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">Overall</div>
              <div className="text-sm font-medium" style={{ color: model.scores.overall >= 4 ? "#4CAF79" : model.scores.overall >= 3 ? "#F59E0B" : "#EF4444" }}>
                {model.scores.overall.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

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