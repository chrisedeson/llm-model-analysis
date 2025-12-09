import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { Navigation, PageHeader } from "./components/Navigation";
import { StatCard, StatCardGrid } from "./components/StatCard";

// Unified JSON structure - flat format
interface UnifiedModelData {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  successful_responses: number;
  avg_score: number;
  avg_latency_ms: number;
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

// Legacy format for backward compatibility
interface LegacyModelSummary {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  total_cost?: number;
  avg_latency_ms: number;
  avg_score: number;
  successful_responses: number;
  costs?: { total_cost: number };
}

interface LegacyComparisonData {
  metadata: {
    generated_at: string;
    num_questions: number;
    grader_model?: string;
    grader_reasoning_effort?: string;
  };
  model1: LegacyModelSummary;
  model2: LegacyModelSummary;
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
  total_cost: number;
  successful_responses: number;
}

interface OverviewData {
  models: NormalizedModel[];
  numQuestions: number;
  generatedAt: string;
  graderModel: string;
  graderReasoning: string;
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
        total_cost: model.costs?.total_cost ?? 0,
        successful_responses: model.successful_responses,
      }));
      
      return {
        models,
        numQuestions: data.metadata.num_questions,
        generatedAt: data.metadata.generated_at,
        graderModel: data.metadata.grader_model || "GPT-5.1",
        graderReasoning: data.metadata.grader_reasoning_effort || "high",
      };
    }
    
    // Fallback to legacy format
    const jsonFiles = files.filter(f => f.startsWith("comparison_") && f.endsWith(".json"));
    if (jsonFiles.length === 0) return null;
    
    const modelsMap = new Map<string, NormalizedModel>();
    let numQuestions = 0;
    let generatedAt = "";
    let graderModel = "GPT-5.1";
    let graderReasoning = "high";
    
    for (const file of jsonFiles) {
      const filePath = path.join(dataDir, file);
      const content = await fs.readFile(filePath, "utf8");
      const data: LegacyComparisonData = JSON.parse(content);
      
      numQuestions = data.metadata.num_questions;
      generatedAt = data.metadata.generated_at;
      graderModel = data.metadata.grader_model || graderModel;
      graderReasoning = data.metadata.grader_reasoning_effort || graderReasoning;
      
      for (const model of [data.model1, data.model2]) {
        if (!modelsMap.has(model.model_id)) {
          modelsMap.set(model.model_id, {
            key: model.model_id,
            name: model.name,
            model_id: model.model_id,
            api_type: model.api_type,
            reasoning_effort: model.reasoning_effort,
            verbosity: model.verbosity,
            avg_score: model.avg_score,
            avg_latency_ms: model.avg_latency_ms,
            total_cost: model.costs?.total_cost ?? model.total_cost ?? 0,
            successful_responses: model.successful_responses,
          });
        }
      }
    }
    
    return {
      models: Array.from(modelsMap.values()),
      numQuestions,
      generatedAt,
      graderModel,
      graderReasoning,
    };
  } catch {
    return null;
  }
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return "text-[#4CAF79]";
  if (score >= 4.0) return "text-[#5E6AD2]";
  if (score >= 3.5) return "text-[#E5A913]";
  return "text-[#E5484D]";
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
python scripts/run_unified_evaluation.py --samples 100 --all`}
            </pre>
          </div>
        </main>
      </div>
    );
  }

  // Sort models by score
  const sortedModels = [...data.models].sort((a, b) => b.avg_score - a.avg_score);
  const bestModel = sortedModels[0];
  const fastestModel = [...data.models].sort((a, b) => a.avg_latency_ms - b.avg_latency_ms)[0];
  const cheapestModel = [...data.models].sort((a, b) => a.total_cost - b.total_cost)[0];
  
  // Calculate totals
  const totalCost = data.models.reduce((sum, m) => sum + m.total_cost, 0);
  const avgScore = data.models.reduce((sum, m) => sum + m.avg_score, 0) / data.models.length;

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="LLM Model Evaluation Dashboard"
          description={`Comprehensive evaluation of ${data.models.length} models on ${data.numQuestions} questions. Compare response quality, speed, and cost.`}
          badge="Overview"
        />

        {/* Summary Stats */}
        <StatCardGrid>
          <StatCard
            title="Models Evaluated"
            value={data.models.length}
            subtitle={`Run: ${new Date(data.generatedAt).toLocaleDateString()}`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
          <StatCard
            title="Best Quality"
            value={bestModel.name}
            subtitle={`Score: ${bestModel.avg_score.toFixed(2)} / 5`}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />
          <StatCard
            title="Fastest Model"
            value={fastestModel.name}
            subtitle={`${Math.round(fastestModel.avg_latency_ms)}ms avg response`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Most Cost-Effective"
            value={cheapestModel.name}
            subtitle={`$${cheapestModel.total_cost.toFixed(4)} total`}
            color="purple"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </StatCardGrid>

        {/* Model Rankings */}
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
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 w-12">#</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Model</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Config</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Score</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Latency</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Cost</th>
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
                        "bg-white/[0.06] text-gray-500"
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.model_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {model.reasoning_effort && (
                          <span className="text-xs bg-[#9D5BD2]/15 text-[#9D5BD2] px-2 py-0.5 rounded-md">
                            {model.reasoning_effort}
                          </span>
                        )}
                        {model.verbosity && (
                          <span className="text-xs bg-[#5E6AD2]/15 text-[#5E6AD2] px-2 py-0.5 rounded-md">
                            {model.verbosity}
                          </span>
                        )}
                        {!model.reasoning_effort && !model.verbosity && (
                          <span className="text-xs text-gray-600">default</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${getScoreColor(model.avg_score)}`}>
                        {model.avg_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {Math.round(model.avg_latency_ms)}ms
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      ${model.total_cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
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
                <p className="text-sm text-gray-500 mt-1">
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
                <p className="text-sm text-gray-500 mt-1">
                  Explore individual responses and quality scores
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-[#141517] rounded-xl border border-white/[0.08] p-6">
          <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Evaluation Summary
          </h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Questions</div>
              <div className="text-xl font-semibold text-white">{data.numQuestions}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Avg Score (All Models)</div>
              <div className="text-xl font-semibold text-white">{avgScore.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Evaluation Cost</div>
              <div className="text-xl font-semibold text-white">${totalCost.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Grader</div>
              <div className="text-xl font-semibold text-white">{data.graderModel}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[13px] text-white/30">
          Responses graded by {data.graderModel} with {data.graderReasoning} reasoning effort on 5 dimensions (1-5 scale)
        </p>
      </main>
    </div>
  );
}
