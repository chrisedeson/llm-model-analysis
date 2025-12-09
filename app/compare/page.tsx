"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation, PageHeader } from "../components/Navigation";

interface ModelInfo {
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
  model1: ModelInfo;
  model2: ModelInfo;
  comparisons: Array<{
    id: number;
    question: string;
    context: string;
    model1: {
      response: string;
      latency_ms: number;
      cost: number;
      grade: {
        on_topic: number;
        grounded: number;
        no_contradiction: number;
        understandability: number;
        overall: number;
        average: number;
      };
      error: string | null;
    };
    model2: {
      response: string;
      latency_ms: number;
      cost: number;
      grade: {
        on_topic: number;
        grounded: number;
        no_contradiction: number;
        understandability: number;
        overall: number;
        average: number;
      };
      error: string | null;
    };
  }>;
}

interface ComparisonFile {
  filename: string;
  displayName: string;
}

export default function ComparePage() {
  const [availableFiles, setAvailableFiles] = useState<ComparisonFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available comparison files
  useEffect(() => {
    async function loadAvailableFiles() {
      try {
        const res = await fetch("/api/comparisons");
        if (!res.ok) throw new Error("Failed to load comparisons");
        const files: string[] = await res.json();
        
        const parsed = files.map((f) => {
          // Parse filename like "comparison_gpt-4o-mini_vs_gpt-5-mini_low_medium.json"
          const match = f.match(/comparison_(.+)_vs_(.+)\.json/);
          if (match) {
            const model1 = match[1].replace(/-/g, "-");
            const model2 = match[2].replace(/_/g, " ").replace(/-/g, "-");
            return {
              filename: f,
              displayName: `${model1} vs ${model2}`,
            };
          }
          return { filename: f, displayName: f };
        });
        
        setAvailableFiles(parsed);
        if (parsed.length > 0) {
          setSelectedFile(parsed[0].filename);
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to load available comparisons");
        setLoading(false);
      }
    }
    loadAvailableFiles();
  }, []);

  // Load selected comparison data
  useEffect(() => {
    if (!selectedFile) return;
    
    async function loadComparison() {
      try {
        const res = await fetch(`/data/${selectedFile}`);
        if (!res.ok) throw new Error("Failed to load comparison data");
        const data = await res.json();
        setComparisonData(data);
      } catch (err) {
        setError("Failed to load comparison data");
      }
    }
    loadComparison();
  }, [selectedFile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0D]">
        <Navigation currentPath="/compare" />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Loading comparisons...</div>
        </div>
      </div>
    );
  }

  if (error || availableFiles.length === 0) {
    return (
      <div className="min-h-screen bg-[#0C0C0D]">
        <Navigation currentPath="/compare" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Model Comparison"
            description="Select and compare different model evaluation results"
            badge="Compare"
          />
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-6 mt-8">
            <h3 className="text-base font-medium text-[#F59E0B] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error || "No Comparison Data Available"}
            </h3>
            <p className="mt-2 text-white/60 text-[14px]">
              Run the evaluation script to generate comparison data:
            </p>
            <pre className="mt-3 bg-black/40 p-4 rounded-lg text-[13px] font-mono text-white/80 overflow-x-auto border border-white/[0.06]">
              python run_evaluation.py --data langfuse.csv --all
            </pre>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/compare" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with dropdown */}
        <div className="flex items-center justify-between mb-8">
          <PageHeader
            title="Model Comparison"
            description="Select a comparison to view detailed results"
            badge="Compare"
          />
          
          <div className="flex items-center gap-4">
            <label className="text-gray-400 text-sm">Comparison:</label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="bg-[#1A1A1C] border border-[#2A2A2E] text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#5E6AD2] min-w-[300px]"
            >
              {availableFiles.map((f) => (
                <option key={f.filename} value={f.filename}>
                  {f.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {comparisonData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Model 1 Card */}
              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-[#5E6AD2] rounded-full"></div>
                  <h2 className="text-lg font-medium text-white">{comparisonData.model1.name}</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Score</span>
                    <span className="text-white font-medium">{comparisonData.model1.avg_score.toFixed(2)}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Latency</span>
                    <span className="text-white font-medium">{comparisonData.model1.avg_latency_ms.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Cost</span>
                    <span className="text-white font-medium">${comparisonData.model1.total_cost.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Successful</span>
                    <span className="text-white font-medium">{comparisonData.model1.successful_responses}/{comparisonData.metadata.num_questions}</span>
                  </div>
                  {comparisonData.model1.reasoning_effort && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reasoning</span>
                      <span className="text-[#5E6AD2]">{comparisonData.model1.reasoning_effort}</span>
                    </div>
                  )}
                  {comparisonData.model1.verbosity && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verbosity</span>
                      <span className="text-[#5E6AD2]">{comparisonData.model1.verbosity}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model 2 Card */}
              <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-[#4CAF79] rounded-full"></div>
                  <h2 className="text-lg font-medium text-white">{comparisonData.model2.name}</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Score</span>
                    <span className="text-white font-medium">{comparisonData.model2.avg_score.toFixed(2)}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Latency</span>
                    <span className="text-white font-medium">{comparisonData.model2.avg_latency_ms.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Cost</span>
                    <span className="text-white font-medium">${comparisonData.model2.total_cost.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Successful</span>
                    <span className="text-white font-medium">{comparisonData.model2.successful_responses}/{comparisonData.metadata.num_questions}</span>
                  </div>
                  {comparisonData.model2.reasoning_effort && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reasoning</span>
                      <span className="text-[#4CAF79]">{comparisonData.model2.reasoning_effort}</span>
                    </div>
                  )}
                  {comparisonData.model2.verbosity && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verbosity</span>
                      <span className="text-[#4CAF79]">{comparisonData.model2.verbosity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2A2A2E]">
                <h2 className="text-lg font-medium text-white">Question-by-Question Comparison</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {comparisonData.metadata.num_questions} questions evaluated • Generated {new Date(comparisonData.metadata.generated_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2E]">
                      <th className="text-left px-6 py-3 text-gray-400 font-medium text-sm">#</th>
                      <th className="text-left px-6 py-3 text-gray-400 font-medium text-sm">Question</th>
                      <th className="text-center px-6 py-3 text-gray-400 font-medium text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#5E6AD2] rounded-full"></span>
                          Score
                        </span>
                      </th>
                      <th className="text-center px-6 py-3 text-gray-400 font-medium text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#4CAF79] rounded-full"></span>
                          Score
                        </span>
                      </th>
                      <th className="text-center px-6 py-3 text-gray-400 font-medium text-sm">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.comparisons.map((c) => {
                      const score1 = c.model1.grade.average;
                      const score2 = c.model2.grade.average;
                      const winner = score1 > score2 ? "model1" : score2 > score1 ? "model2" : "tie";
                      
                      return (
                        <tr key={c.id} className="border-b border-[#2A2A2E] hover:bg-[#141517]">
                          <td className="px-6 py-4 text-gray-500 text-sm">{c.id}</td>
                          <td className="px-6 py-4 text-white text-sm max-w-md truncate">
                            {c.question}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-medium ${winner === "model1" ? "text-[#5E6AD2]" : "text-gray-400"}`}>
                              {score1.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-medium ${winner === "model2" ? "text-[#4CAF79]" : "text-gray-400"}`}>
                              {score2.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {winner === "model1" && (
                              <span className="inline-flex items-center gap-1 text-[#5E6AD2] text-sm">
                                <span className="w-2 h-2 bg-[#5E6AD2] rounded-full"></span>
                                Model 1
                              </span>
                            )}
                            {winner === "model2" && (
                              <span className="inline-flex items-center gap-1 text-[#4CAF79] text-sm">
                                <span className="w-2 h-2 bg-[#4CAF79] rounded-full"></span>
                                Model 2
                              </span>
                            )}
                            {winner === "tie" && (
                              <span className="text-gray-500 text-sm">Tie</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-[#1A1A1C] border border-[#2A2A2E] text-white rounded-lg hover:bg-[#242428] transition-colors"
              >
                ← Overview
              </Link>
              <Link
                href="/details"
                className="px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4F5ABF] transition-colors"
              >
                View Full Details →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
