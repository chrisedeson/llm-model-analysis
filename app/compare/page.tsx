"use client";

import { useState } from "react";
import Link from "next/link";

// Sample model options (in real app, fetch from API)
const availableModels = [
  { id: "gpt-4o-mini", name: "GPT-4o-mini", api_type: "chat_completions" },
  { id: "gpt-5-mini", name: "GPT-5-mini", api_type: "responses" },
  { id: "gpt-4o", name: "GPT-4o", api_type: "chat_completions" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", api_type: "chat_completions" },
];

const reasoningOptions = ["none", "low", "medium", "high"];
const verbosityOptions = ["none", "low", "medium", "high"];

export default function ComparePage() {
  const [model1, setModel1] = useState(availableModels[0].id);
  const [model2, setModel2] = useState(availableModels[1].id);
  const [reasoning1, setReasoning1] = useState("none");
  const [reasoning2, setReasoning2] = useState("low");
  const [verbosity1, setVerbosity1] = useState("none");
  const [verbosity2, setVerbosity2] = useState("low");
  const [isRunning, setIsRunning] = useState(false);

  const handleRunComparison = () => {
    setIsRunning(true);
    // Simulate running comparison
    setTimeout(() => {
      setIsRunning(false);
      // In real app, this would navigate to results or show inline
      alert("Comparison complete! View results in Overview.");
    }, 2000);
  };

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
                <Link href="/compare" className="px-3 py-1.5 text-sm text-white bg-white/[0.08] rounded-md">
                  Compare
                </Link>
                <Link href="/details" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
                  Details
                </Link>
              </div>
            </div>
            <a 
              href="https://platform.openai.com/docs/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-[#5E6AD2] transition-colors flex items-center gap-1"
            >
              OpenAI Pricing
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Compare Models
          </h1>
          <p className="text-gray-500 text-sm">
            Configure and run a head-to-head comparison between two models
          </p>
        </div>

        {/* Comparison Setup */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Model 1 */}
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/15 flex items-center justify-center">
                <span className="text-[#5E6AD2] text-sm font-bold">1</span>
              </div>
              <h2 className="text-lg font-medium text-white">Model A</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Model</label>
                <select
                  value={model1}
                  onChange={(e) => setModel1(e.target.value)}
                  className="w-full bg-[#0C0C0D] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2]/50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Reasoning Effort</label>
                <div className="flex gap-2">
                  {reasoningOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setReasoning1(opt)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        reasoning1 === opt
                          ? "bg-[#9D5BD2]/20 text-[#9D5BD2] border border-[#9D5BD2]/30"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Verbosity</label>
                <div className="flex gap-2">
                  {verbosityOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setVerbosity1(opt)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        verbosity1 === opt
                          ? "bg-[#5E6AD2]/20 text-[#5E6AD2] border border-[#5E6AD2]/30"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Model 2 */}
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#4CAF79]/15 flex items-center justify-center">
                <span className="text-[#4CAF79] text-sm font-bold">2</span>
              </div>
              <h2 className="text-lg font-medium text-white">Model B</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Model</label>
                <select
                  value={model2}
                  onChange={(e) => setModel2(e.target.value)}
                  className="w-full bg-[#0C0C0D] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4CAF79]/50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Reasoning Effort</label>
                <div className="flex gap-2">
                  {reasoningOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setReasoning2(opt)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        reasoning2 === opt
                          ? "bg-[#9D5BD2]/20 text-[#9D5BD2] border border-[#9D5BD2]/30"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Verbosity</label>
                <div className="flex gap-2">
                  {verbosityOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setVerbosity2(opt)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        verbosity2 === opt
                          ? "bg-[#5E6AD2]/20 text-[#5E6AD2] border border-[#5E6AD2]/30"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#141517] border border-white/[0.08] rounded-full px-6 py-2">
            <span className="text-gray-500 text-sm">
              <span className="text-[#5E6AD2] font-medium">{availableModels.find(m => m.id === model1)?.name}</span>
              {" "}vs{" "}
              <span className="text-[#4CAF79] font-medium">{availableModels.find(m => m.id === model2)?.name}</span>
            </span>
          </div>
        </div>

        {/* Run Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleRunComparison}
            disabled={isRunning || model1 === model2}
            className={`px-8 py-3 rounded-lg font-medium text-sm transition-all ${
              isRunning || model1 === model2
                ? "bg-white/[0.06] text-gray-500 cursor-not-allowed"
                : "bg-[#5E6AD2] text-white hover:bg-[#4F5BC4] shadow-lg shadow-[#5E6AD2]/20"
            }`}
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running Comparison...
              </span>
            ) : model1 === model2 ? (
              "Select different models"
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Comparison
              </span>
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-white">Reasoning Effort</span>
            </div>
            <p className="text-xs text-gray-500">
              Controls how much &quot;thinking&quot; the model does. Higher = better quality but slower & more expensive.
            </p>
          </div>
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#9D5BD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs font-medium text-white">Verbosity</span>
            </div>
            <p className="text-xs text-gray-500">
              Controls response length. Lower = concise answers suitable for chatbot use cases.
            </p>
          </div>
          <div className="bg-[#141517] rounded-lg border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#4CAF79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-white">Evaluation</span>
            </div>
            <p className="text-xs text-gray-500">
              Models are graded on: on-topic, grounded, no contradiction, understandability, and overall quality.
            </p>
          </div>
        </div>

        {/* Pricing Link */}
        <div className="mt-8 text-center">
          <a 
            href="https://platform.openai.com/docs/pricing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#5E6AD2] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View OpenAI Pricing Documentation
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  );
}
