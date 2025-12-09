import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { Navigation, PageHeader } from "../components/Navigation";

// Unified JSON structure - flat format from sample
interface UnifiedModelData {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  successful_responses: number;
  total_responses?: number;
  avg_score: number;
  avg_latency_ms: number;
  usage?: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens?: number;
    avg_input_tokens?: number;
    avg_output_tokens?: number;
  };
  costs?: {
    input_cost?: number;
    output_cost?: number;
    total_cost: number;
    cost_per_query?: number;
  };
}

interface UnifiedEvaluationData {
  metadata: {
    generated_at: string;
    num_questions: number;
    num_models: number;
    model_keys: string[];
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
  usage?: {
    total_input_tokens: number;
    total_output_tokens: number;
  };
  costs?: {
    total_cost: number;
  };
}

interface LegacyComparisonData {
  metadata: {
    generated_at: string;
    num_questions: number;
  };
  model1: LegacyModelSummary;
  model2: LegacyModelSummary;
}

// Normalized model interface for display
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
  total_input_tokens: number;
  total_output_tokens: number;
  successful_responses: number;
}

async function getAllModels(): Promise<NormalizedModel[]> {
  const dataDir = path.join(process.cwd(), "public/data");
  const files = await fs.readdir(dataDir);
  
  // First, try to load the unified evaluation_results.json
  if (files.includes("evaluation_results.json")) {
    const filePath = path.join(dataDir, "evaluation_results.json");
    const content = await fs.readFile(filePath, "utf8");
    const data: UnifiedEvaluationData = JSON.parse(content);
    
    // Convert unified format to normalized models (handles flat structure)
    return Object.entries(data.models).map(([key, model]) => ({
      key,
      name: model.name,
      model_id: model.model_id,
      api_type: model.api_type,
      reasoning_effort: model.reasoning_effort,
      verbosity: model.verbosity,
      avg_score: model.avg_score,
      avg_latency_ms: model.avg_latency_ms,
      total_cost: model.costs?.total_cost ?? 0,
      total_input_tokens: model.usage?.total_input_tokens ?? 0,
      total_output_tokens: model.usage?.total_output_tokens ?? 0,
      successful_responses: model.successful_responses,
    }));
  }
  
  // Fallback to legacy format: multiple comparison JSON files
  const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "evaluation_results.json");
  const modelsMap = new Map<string, NormalizedModel>();

  for (const file of jsonFiles) {
    const filePath = path.join(dataDir, file);
    const content = await fs.readFile(filePath, "utf8");
    const data: LegacyComparisonData = JSON.parse(content);

    // Add both models from each comparison file
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
          total_input_tokens: model.usage?.total_input_tokens ?? 0,
          total_output_tokens: model.usage?.total_output_tokens ?? 0,
          successful_responses: model.successful_responses,
        });
      }
    }
  }

  return Array.from(modelsMap.values());
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return "text-[#4CAF79]";
  if (score >= 4.0) return "text-[#5E6AD2]";
  if (score >= 3.5) return "text-[#E5A913]";
  return "text-[#E5484D]";
}

function getScoreBg(score: number): string {
  if (score >= 4.5) return "bg-[#4CAF79]/15";
  if (score >= 4.0) return "bg-[#5E6AD2]/15";
  if (score >= 3.5) return "bg-[#E5A913]/15";
  return "bg-[#E5484D]/15";
}

function getRank(index: number): React.ReactNode {
  if (index === 0) {
    return (
      <div className="w-6 h-6 rounded-full bg-[#E5A913]/20 flex items-center justify-center">
        <span className="text-[#E5A913] text-xs font-bold">1</span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-400/20 flex items-center justify-center">
        <span className="text-gray-400 text-xs font-bold">2</span>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
        <span className="text-[#CD7F32] text-xs font-bold">3</span>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center">
      <span className="text-gray-500 text-xs">{index + 1}</span>
    </div>
  );
}

export default async function ModelsPage() {
  const models = await getAllModels();

  // Sort by score (highest first)
  const sortedModels = [...models].sort((a, b) => b.avg_score - a.avg_score);

  // Calculate cost-effectiveness (score per dollar * 1000)
  const modelsWithEfficiency = sortedModels.map((m) => ({
    ...m,
    costEfficiency: m.total_cost > 0 ? (m.avg_score / m.total_cost) * 1000 : 0,
  }));

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/models" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title="Model Leaderboard"
          description="All evaluated models ranked by average quality score"
          badge="Rankings"
        />

        {models.length === 0 ? (
          <div className="text-center py-12 bg-[#141517] rounded-lg border border-white/[0.08]">
            <p className="text-gray-400">No model data available.</p>
            <p className="text-gray-500 text-sm mt-2">
              Run the evaluation script to generate comparison data.
            </p>
          </div>
        ) : (
        <>
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="text-xs text-gray-500 mb-1">Total Models</div>
            <div className="text-2xl font-semibold text-white">{models.length}</div>
          </div>
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="text-xs text-gray-500 mb-1">Highest Score</div>
            <div className="text-2xl font-semibold text-[#4CAF79]">
              {Math.max(...models.map((m) => m.avg_score)).toFixed(1)}
            </div>
          </div>
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="text-xs text-gray-500 mb-1">Fastest Avg</div>
            <div className="text-2xl font-semibold text-[#5E6AD2]">
              {Math.min(...models.map((m) => m.avg_latency_ms)).toFixed(0)}ms
            </div>
          </div>
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="text-xs text-gray-500 mb-1">Lowest Cost</div>
            <div className="text-2xl font-semibold text-[#9D5BD2]">
              ${Math.min(...models.map((m) => m.total_cost)).toFixed(4)}
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#141517] rounded-lg border border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 w-12">Rank</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Model</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">API Type</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Config</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Score</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Latency</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Cost</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {modelsWithEfficiency.map((model, index) => (
                <tr
                  key={model.key}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    {getRank(index)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{model.name}</span>
                      <span className="text-xs text-gray-500">{model.model_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-white/[0.06] text-gray-400 px-2 py-1 rounded-md">
                      {model.api_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {model.reasoning_effort && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 w-16">reasoning:</span>
                          <span className="text-xs bg-[#9D5BD2]/15 text-[#9D5BD2] px-2 py-0.5 rounded-md">
                            {model.reasoning_effort}
                          </span>
                        </div>
                      )}
                      {model.verbosity && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 w-16">verbosity:</span>
                          <span className="text-xs bg-[#5E6AD2]/15 text-[#5E6AD2] px-2 py-0.5 rounded-md">
                            {model.verbosity}
                          </span>
                        </div>
                      )}
                      {!model.reasoning_effort && !model.verbosity && (
                        <span className="text-xs text-gray-600">default</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-semibold px-2 py-1 rounded-md ${getScoreBg(model.avg_score)} ${getScoreColor(model.avg_score)}`}>
                      {model.avg_score.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-300">
                      {model.avg_latency_ms.toFixed(0)}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-300">
                      ${model.total_cost.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-gray-400" title="Score points per $1000 spent">
                      {model.costEfficiency.toFixed(0)} pts/$1k
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4CAF79]"></span>
              <span>Excellent (≥4.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5E6AD2]"></span>
              <span>Good (≥4.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E5A913]"></span>
              <span>Fair (≥3.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E5484D]"></span>
              <span>Poor (&lt;3.5)</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Efficiency = Score per $1000 spent</span>
            <a 
              href="https://platform.openai.com/docs/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#5E6AD2] hover:text-[#7C85E0] transition-colors flex items-center gap-1"
            >
              OpenAI Pricing
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
