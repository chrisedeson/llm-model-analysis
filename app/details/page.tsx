import { promises as fs } from "fs";
import path from "path";
import { Navigation, PageHeader } from "../components/Navigation";

// Types for unified JSON structure
interface Grade {
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
  grade: Grade;
  error: string | null;
}

interface Question {
  id: number;
  question: string;
  context: string;
  responses: Record<string, QuestionResponse>;
}

interface ModelSummary {
  name: string;
  model_id: string;
  api_type: string;
  reasoning_effort: string | null;
  verbosity: string | null;
  avg_score: number;
  avg_latency_ms: number;
  successful_responses: number;
  total_responses: number;
  scores: {
    on_topic: number;
    grounded: number;
    no_contradiction: number;
    understandability: number;
    overall: number;
  };
  costs: {
    total_cost: number;
    cost_per_query: number;
  };
  usage: {
    total_input_tokens: number;
    total_output_tokens: number;
  };
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

async function getEvaluationData(): Promise<EvaluationData | null> {
  try {
    const dataDir = path.join(process.cwd(), "public/data");
    const filePath = path.join(dataDir, "evaluation_results.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch {
    return null;
  }
}

export default async function DetailsPage() {
  const data = await getEvaluationData();

  // Get first two models for default display
  const modelKeys = data?.metadata.model_keys.slice(0, 2) || [];
  const model1Key = modelKeys[0];
  const model2Key = modelKeys[1];
  const model1 = model1Key ? data?.models[model1Key] : null;
  const model2 = model2Key ? data?.models[model2Key] : null;

  return (
    <div className="min-h-screen bg-[#0C0C0D]">
      <Navigation currentPath="/details" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title={data && model1 && model2 ? `${model1.name} vs ${model2.name}` : "Detailed Results"}
          description={data 
            ? `Full responses and grading breakdown for ${data.metadata.num_questions} questions. Graded by ${data.metadata.grader_model}.`
            : "Run the evaluation script to generate comparison data"
          }
          badge="Details"
        />

        {!data || !model1 || !model2 ? (
          <div className="text-center py-12 bg-[#141517] rounded-lg border border-white/[0.08]">
            <p className="text-gray-400">No comparison data available.</p>
            <p className="text-gray-500 text-sm mt-2">
              Run the evaluation script to generate data.
            </p>
          </div>
        ) : (
        /* Per-question cards */
        <div className="space-y-4">
          {data.questions.map((q) => {
            const resp1 = q.responses[model1Key];
            const resp2 = q.responses[model2Key];
            if (!resp1 || !resp2) return null;

            return (
            <div
              key={q.id}
              className="bg-[#141517] rounded-lg border border-white/[0.08] overflow-hidden"
            >
              {/* Question header */}
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <span className="bg-[#5E6AD2]/15 text-[#5E6AD2] text-xs font-medium px-2.5 py-1 rounded-full">
                    Q{q.id}
                  </span>
                  <h2 className="text-sm font-medium text-white">
                    {q.question}
                  </h2>
                </div>
                {q.context && (
                  <details className="mt-3 group">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                      Show context
                    </summary>
                    <p className="mt-2 text-xs text-gray-400 bg-[#0C0C0D] p-3 rounded-md border border-white/[0.06]">
                      {q.context}
                    </p>
                  </details>
                )}
              </div>

              {/* Model responses side by side */}
              <div className="grid md:grid-cols-2 divide-x divide-white/[0.08]">
                {/* Model 1 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#5E6AD2]">{model1.name}</h3>
                    <div className="flex gap-2">
                      <span className="bg-[#5E6AD2]/15 text-[#5E6AD2] text-xs px-2 py-1 rounded-md">
                        {Math.round(resp1.latency_ms)}ms
                      </span>
                      <span className="bg-white/[0.06] text-gray-400 text-xs px-2 py-1 rounded-md">
                        ${resp1.cost.toFixed(5)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {resp1.response || (
                      <span className="text-red-400 italic">
                        Error: {resp1.error}
                      </span>
                    )}
                  </p>
                  <GradeDisplay grade={resp1.grade} color="blue" />
                </div>

                {/* Model 2 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#4CAF79]">{model2.name}</h3>
                    <div className="flex gap-2">
                      <span className="bg-[#4CAF79]/15 text-[#4CAF79] text-xs px-2 py-1 rounded-md">
                        {Math.round(resp2.latency_ms)}ms
                      </span>
                      <span className="bg-white/[0.06] text-gray-400 text-xs px-2 py-1 rounded-md">
                        ${resp2.cost.toFixed(5)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {resp2.response || (
                      <span className="text-red-400 italic">
                        Error: {resp2.error}
                      </span>
                    )}
                  </p>
                  <GradeDisplay grade={resp2.grade} color="green" />
                </div>
              </div>

              {/* Winner indicator */}
              <div className="px-6 py-3 text-center text-sm border-t border-white/[0.08] bg-[#0C0C0D]/50">
                {resp1.grade.average > resp2.grade.average ? (
                  <span className="text-[#5E6AD2] text-xs font-medium">
                    ✓ {model1.name} scored higher (
                    {resp1.grade.average.toFixed(2)} vs{" "}
                    {resp2.grade.average.toFixed(2)})
                  </span>
                ) : resp2.grade.average > resp1.grade.average ? (
                  <span className="text-[#4CAF79] text-xs font-medium">
                    ✓ {model2.name} scored higher (
                    {resp2.grade.average.toFixed(2)} vs{" "}
                    {resp1.grade.average.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs font-medium">
                    Tie ({resp1.grade.average.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          )})}
        </div>
        )}

        {/* Info about viewing more comparisons */}
        {data && (
          <div className="mt-6 p-4 bg-[#141517] rounded-lg border border-white/[0.08]">
            <p className="text-sm text-gray-400">
              <span className="text-[#5E6AD2]">Tip:</span> Use the{" "}
              <a href="/compare" className="text-[#5E6AD2] hover:underline">Compare</a>{" "}
              page to dynamically select any two models from the {data.metadata.num_models} evaluated models.
            </p>
          </div>
        )}
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
