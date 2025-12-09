"use client";

import { useState, useEffect, useMemo } from "react";
import { Navigation, PageHeader } from "../components/Navigation";

// Types for unified JSON structure
interface ModelScores {
  on_topic: number;
  grounded: number;
  no_contradiction: number;
  understandability: number;
  overall: number;
}

interface ModelUsage {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

interface ModelCosts {
  input_cost: number;
  output_cost: number;
  total_cost: number;
  cost_per_query: number;
  cost_per_1k: number;
  cost_per_10k: number;
}

interface ModelPricing {
  input_price_per_million: number;
  output_price_per_million: number;
}

interface ModelSummary {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  successful_responses: number;
  total_responses: number;
  avg_score: number;
  scores: ModelScores;
  avg_latency_ms: number;
  p95_latency_ms: number;
  usage: ModelUsage;
  costs: ModelCosts;
  pricing: ModelPricing;
}

interface ResponseGrade {
  on_topic: number;
  grounded: number;
  no_contradiction: number;
  understandability: number;
  overall: number;
  average: number;
}

interface QuestionResponse {
  response: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  grade: ResponseGrade;
  error: string | null;
}

interface Question {
  id: number;
  question: string;
  context: string;
  responses: Record<string, QuestionResponse>;
}

interface EvaluationData {
  metadata: {
    generated_at: string;
    num_questions: number;
    num_models: number;
    grader_model: string;
    grader_reasoning_effort: string;
    model_keys: string[];
  };
  models: Record<string, ModelSummary>;
  questions: Question[];
}

// Score dimension labels
const SCORE_DIMENSIONS = [
  { key: "on_topic", label: "On Topic" },
  { key: "grounded", label: "Grounded" },
  { key: "no_contradiction", label: "No Contradiction" },
  { key: "understandability", label: "Understandability" },
  { key: "overall", label: "Overall" },
] as const;

export default function ComparePage() {
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelAKey, setModelAKey] = useState<string>("");
  const [modelBKey, setModelBKey] = useState<string>("");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Load evaluation data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/data/evaluation_results.json");
        if (!res.ok) throw new Error("Failed to load evaluation data");
        const json: EvaluationData = await res.json();
        setData(json);
        
        // Set default selections (first two models)
        const keys = json.metadata.model_keys;
        if (keys.length >= 2) {
          setModelAKey(keys[0]);
          setModelBKey(keys[1]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Get selected models
  const modelA = data?.models[modelAKey];
  const modelB = data?.models[modelBKey];

  // Calculate comparison stats dynamically
  const comparison = useMemo(() => {
    if (!modelA || !modelB || !data) return null;

    const scoreDiff = modelA.avg_score - modelB.avg_score;
    const latencyDiff = modelA.avg_latency_ms - modelB.avg_latency_ms;
    const costDiff = modelA.costs.total_cost - modelB.costs.total_cost;

    // Count wins per question
    let modelAWins = 0;
    let modelBWins = 0;
    let ties = 0;

    data.questions.forEach((q) => {
      const respA = q.responses[modelAKey];
      const respB = q.responses[modelBKey];
      if (respA && respB) {
        if (respA.grade.average > respB.grade.average) modelAWins++;
        else if (respB.grade.average > respA.grade.average) modelBWins++;
        else ties++;
      }
    });

    return {
      scoreDiff,
      latencyDiff,
      costDiff,
      modelAWins,
      modelBWins,
      ties,
    };
  }, [modelA, modelB, modelAKey, modelBKey, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0D] flex items-center justify-center">
        <div className="text-gray-400">Loading evaluation data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0C0C0D]">
        <Navigation currentPath="/compare" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-[#E5484D]/10 border border-[#E5484D]/20 rounded-lg p-6 text-center">
            <p className="text-[#E5484D]">{error || "Failed to load data"}</p>
          </div>
        </main>
      </div>
    );
  }

  const modelKeys = data.metadata.model_keys;

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/compare" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title="Compare Models"
          description="Select any two models to compare side-by-side"
        />

        {/* Model Selectors */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">Model A</label>
            <select
              value={modelAKey}
              onChange={(e) => setModelAKey(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2E] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#5E6AD2] transition-colors"
            >
              {modelKeys.map((key) => (
                <option key={key} value={key} disabled={key === modelBKey}>
                  {data.models[key]?.name || key}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end justify-center pb-3">
            <span className="text-gray-500 text-lg font-medium">vs</span>
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">Model B</label>
            <select
              value={modelBKey}
              onChange={(e) => setModelBKey(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2E] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#4CAF79] transition-colors"
            >
              {modelKeys.map((key) => (
                <option key={key} value={key} disabled={key === modelAKey}>
                  {data.models[key]?.name || key}
                </option>
              ))}
            </select>
          </div>
        </div>

        {modelA && modelB && comparison && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Model A Card */}
              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-[#5E6AD2] rounded-full"></div>
                  <h2 className="text-lg font-medium text-white">{modelA.name}</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Score</span>
                    <span className="text-white font-medium">{modelA.avg_score.toFixed(2)}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Latency</span>
                    <span className="text-white font-medium">{modelA.avg_latency_ms.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Cost</span>
                    <span className="text-white font-medium">${modelA.costs.total_cost.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens (In/Out)</span>
                    <span className="text-white font-medium">
                      {modelA.usage.total_input_tokens.toLocaleString()} / {modelA.usage.total_output_tokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white font-medium">
                      {modelA.successful_responses}/{modelA.total_responses}
                    </span>
                  </div>
                  {modelA.reasoning_effort && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reasoning</span>
                      <span className="text-[#5E6AD2]">{modelA.reasoning_effort}</span>
                    </div>
                  )}
                  {modelA.verbosity && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verbosity</span>
                      <span className="text-[#5E6AD2]">{modelA.verbosity}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model B Card */}
              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-[#4CAF79] rounded-full"></div>
                  <h2 className="text-lg font-medium text-white">{modelB.name}</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Score</span>
                    <span className="text-white font-medium">{modelB.avg_score.toFixed(2)}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Latency</span>
                    <span className="text-white font-medium">{modelB.avg_latency_ms.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Cost</span>
                    <span className="text-white font-medium">${modelB.costs.total_cost.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens (In/Out)</span>
                    <span className="text-white font-medium">
                      {modelB.usage.total_input_tokens.toLocaleString()} / {modelB.usage.total_output_tokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white font-medium">
                      {modelB.successful_responses}/{modelB.total_responses}
                    </span>
                  </div>
                  {modelB.reasoning_effort && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reasoning</span>
                      <span className="text-[#4CAF79]">{modelB.reasoning_effort}</span>
                    </div>
                  )}
                  {modelB.verbosity && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verbosity</span>
                      <span className="text-[#4CAF79]">{modelB.verbosity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Score Difference</div>
                <div className={`text-xl font-semibold ${comparison.scoreDiff > 0 ? "text-[#5E6AD2]" : comparison.scoreDiff < 0 ? "text-[#4CAF79]" : "text-gray-400"}`}>
                  {comparison.scoreDiff > 0 ? "+" : ""}{comparison.scoreDiff.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparison.scoreDiff > 0 ? "Model A higher" : comparison.scoreDiff < 0 ? "Model B higher" : "Equal"}
                </div>
              </div>

              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Latency Difference</div>
                <div className={`text-xl font-semibold ${comparison.latencyDiff < 0 ? "text-[#5E6AD2]" : comparison.latencyDiff > 0 ? "text-[#4CAF79]" : "text-gray-400"}`}>
                  {comparison.latencyDiff > 0 ? "+" : ""}{comparison.latencyDiff.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparison.latencyDiff < 0 ? "Model A faster" : comparison.latencyDiff > 0 ? "Model B faster" : "Equal"}
                </div>
              </div>

              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Cost Difference</div>
                <div className={`text-xl font-semibold ${comparison.costDiff < 0 ? "text-[#5E6AD2]" : comparison.costDiff > 0 ? "text-[#4CAF79]" : "text-gray-400"}`}>
                  {comparison.costDiff > 0 ? "+" : ""}${comparison.costDiff.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparison.costDiff < 0 ? "Model A cheaper" : comparison.costDiff > 0 ? "Model B cheaper" : "Equal"}
                </div>
              </div>

              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E6AD2] font-semibold">{comparison.modelAWins}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-400">{comparison.ties}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-[#4CAF79] font-semibold">{comparison.modelBWins}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">A wins - ties - B wins</div>
              </div>
            </div>

            {/* Score Dimensions Chart */}
            <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-white mb-4">Score Breakdown by Dimension</h3>
              <div className="space-y-4">
                {SCORE_DIMENSIONS.map(({ key, label }) => {
                  const scoreA = modelA.scores[key as keyof ModelScores];
                  const scoreB = modelB.scores[key as keyof ModelScores];
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{label}</span>
                        <div className="flex gap-4">
                          <span className="text-[#5E6AD2]">{scoreA.toFixed(1)}</span>
                          <span className="text-[#4CAF79]">{scoreB.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 h-2 bg-[#0C0C0D] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5E6AD2] rounded-full"
                            style={{ width: `${(scoreA / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex-1 h-2 bg-[#0C0C0D] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#4CAF79] rounded-full"
                            style={{ width: `${(scoreB / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Question Comparison */}
            <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2A2A2E]">
                <h3 className="text-lg font-medium text-white">Question-by-Question Comparison</h3>
                <p className="text-sm text-gray-500 mt-1">Click to expand and see full responses</p>
              </div>
              <div className="divide-y divide-[#2A2A2E]">
                {data.questions.map((q) => {
                  const respA = q.responses[modelAKey];
                  const respB = q.responses[modelBKey];
                  if (!respA || !respB) return null;

                  const isExpanded = expandedQuestion === q.id;
                  const winner = respA.grade.average > respB.grade.average ? "A" : 
                                 respB.grade.average > respA.grade.average ? "B" : "tie";

                  return (
                    <div key={q.id} className="hover:bg-white/[0.02]">
                      <button
                        onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                        className="w-full px-6 py-4 text-left flex items-center gap-4"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-sm text-gray-400">
                          {q.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{q.question}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            winner === "A" ? "bg-[#5E6AD2]/15 text-[#5E6AD2]" :
                            winner === "B" ? "bg-[#4CAF79]/15 text-[#4CAF79]" :
                            "bg-gray-500/15 text-gray-400"
                          }`}>
                            {winner === "A" ? `A +${(respA.grade.average - respB.grade.average).toFixed(1)}` :
                             winner === "B" ? `B +${(respB.grade.average - respA.grade.average).toFixed(1)}` :
                             "Tie"}
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6">
                          <div className="bg-[#0C0C0D] rounded-lg p-4 mb-4">
                            <div className="text-xs text-gray-500 mb-2">Context</div>
                            <p className="text-sm text-gray-300">{q.context || "No context provided"}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Model A Response */}
                            <div className="bg-[#5E6AD2]/5 border border-[#5E6AD2]/20 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-[#5E6AD2]">{modelA.name}</span>
                                <span className="text-sm text-[#5E6AD2]">{respA.grade.average.toFixed(1)}/5</span>
                              </div>
                              <p className="text-sm text-gray-300 mb-3">{respA.response}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span>{respA.latency_ms}ms</span>
                                <span>•</span>
                                <span>{respA.input_tokens} in / {respA.output_tokens} out</span>
                                <span>•</span>
                                <span>${respA.cost.toFixed(6)}</span>
                              </div>
                            </div>

                            {/* Model B Response */}
                            <div className="bg-[#4CAF79]/5 border border-[#4CAF79]/20 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-[#4CAF79]">{modelB.name}</span>
                                <span className="text-sm text-[#4CAF79]">{respB.grade.average.toFixed(1)}/5</span>
                              </div>
                              <p className="text-sm text-gray-300 mb-3">{respB.response}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span>{respB.latency_ms}ms</span>
                                <span>•</span>
                                <span>{respB.input_tokens} in / {respB.output_tokens} out</span>
                                <span>•</span>
                                <span>${respB.cost.toFixed(6)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
