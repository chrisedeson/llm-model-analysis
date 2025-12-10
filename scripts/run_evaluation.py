"""
Unified evaluation script that runs ALL models and outputs a single JSON file.

This allows the web app to compare ANY two models dynamically without 
needing separate comparison files.

Usage:
    # Run all 13 models and generate unified results
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100

    # Run specific models only
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 50 --models "GPT-4o-mini,GPT-5-mini (minimal, low)"

    # List available models
    python run_evaluation.py --list-models
"""

import argparse
import asyncio
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

from config import ALL_MODELS, MODELS_BY_NAME, ModelConfig, GRADER_MODEL, GRADER_REASONING_EFFORT
from grader import Grader, GradingResult
from model_runner import AsyncModelRunner, ModelResponse

# Load environment variables from .env file
load_dotenv()


def list_available_models():
    """Print all available models."""
    print("\n" + "=" * 60)
    print("Available Models (13 total)")
    print("=" * 60)
    
    print("\n📌 Baseline Model:")
    print("   • GPT-4o-mini")
    
    print("\n🔬 GPT-5-mini Variants (6):")
    for m in ALL_MODELS:
        if m.model_id == "gpt-5-mini":
            print(f"   • {m.name}")
    
    print("\n🔬 GPT-5-nano Variants (6):")
    for m in ALL_MODELS:
        if m.model_id == "gpt-5-nano":
            print(f"   • {m.name}")
    
    print("\n" + "=" * 60 + "\n")


def load_langfuse_data(csv_path: str, max_samples: int | None = None) -> list[dict]:
    """Load questions from Langfuse CSV export.
    
    Supports two formats:
    1. CSV with 'context' column directly
    2. Langfuse export with 'metadata' column containing 'retrieved_docs'
    """
    questions = []
    
    # Use utf-8-sig to handle BOM (Byte Order Mark) if present
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        
        # Validate that we have the expected columns
        fieldnames = reader.fieldnames or []
        input_col = next((c for c in ["input", "Input"] if c in fieldnames), None)
        context_col = next((c for c in ["context", "Context"] if c in fieldnames), None)
        metadata_col = next((c for c in ["metadata", "Metadata"] if c in fieldnames), None)
        id_col = next((c for c in ["trace_id", "id", "ID"] if c in fieldnames), None)
        
        if not input_col:
            print(f"Error: No 'input' or 'Input' column found in CSV.")
            print(f"Available columns: {fieldnames}")
            return []
        
        # Determine context source
        context_source = None
        if context_col:
            context_source = "context_column"
            print(f"Using 'context' column for retrieved documents.")
        elif metadata_col:
            context_source = "metadata"
            print(f"Extracting 'retrieved_docs' from 'metadata' column.")
        else:
            print(f"Warning: No 'context' or 'metadata' column found. Using empty context.")
        
        for row in reader:
            input_text = row.get(input_col, "") or ""
            
            # Skip bad rows
            if "args" in input_text.lower() or "kwargs" in input_text.lower():
                continue
            if not input_text.strip():
                continue
            
            # Extract context from appropriate source
            context = ""
            if context_source == "context_column":
                context = row.get(context_col, "") or ""
            elif context_source == "metadata":
                metadata_str = row.get(metadata_col, "") or ""
                if metadata_str:
                    try:
                        metadata = json.loads(metadata_str)
                        context = metadata.get("retrieved_docs", "") or ""
                    except json.JSONDecodeError:
                        # Try to extract retrieved_docs directly if it's not valid JSON
                        if "retrieved_docs" in metadata_str:
                            # Simple extraction for malformed JSON
                            pass
            
            trace_id = row.get(id_col, "") if id_col else ""
            
            questions.append({
                "question": input_text.strip(),
                "context": context.strip() if context else "",
                "trace_id": trace_id,
            })
            
            if max_samples and len(questions) >= max_samples:
                break
    
    # Report stats
    with_context = sum(1 for q in questions if q["context"])
    print(f"Loaded {len(questions)} valid questions from {csv_path}")
    print(f"  - {with_context}/{len(questions)} questions have context")
    
    return questions


def get_model_key(model: ModelConfig) -> str:
    """Generate a unique key for a model."""
    if model.reasoning_effort and model.verbosity:
        return f"{model.model_id}_{model.reasoning_effort}_{model.verbosity}"
    return model.model_id


async def run_model_evaluation(
    model: ModelConfig,
    questions: list[dict],
    max_concurrent: int = 10,
) -> list[ModelResponse]:
    """Run evaluation for a single model across all questions."""
    client = AsyncOpenAI()
    runner = AsyncModelRunner(model, client, max_concurrent)
    
    print(f"\n🔄 Running {model.name} on {len(questions)} questions...")
    
    question_context_pairs = [
        (q["question"], q.get("context", "")) for q in questions
    ]
    
    responses = await runner.run_batch(question_context_pairs)
    
    # Print summary
    successful = [r for r in responses if r.error is None]
    failed = [r for r in responses if r.error is not None]
    
    if successful:
        total_cost = sum(r.cost for r in successful)
        avg_latency = sum(r.latency_ms for r in successful) / len(successful)
        print(f"   ✓ {len(successful)}/{len(responses)} successful")
        print(f"   ⏱ Avg latency: {avg_latency:.0f}ms")
        print(f"   💰 Total cost: ${total_cost:.4f}")
    else:
        print(f"   ✗ All {len(responses)} requests failed")
    
    if failed:
        # Show first unique error for debugging
        unique_errors = set(r.error for r in failed if r.error)
        for error in list(unique_errors)[:3]:  # Show up to 3 unique errors
            print(f"   ⚠ Error: {error[:100]}...")
    
    return responses


def grade_responses(
    questions: list[dict],
    responses: list[ModelResponse],
    grader: Grader,
    model_name: str,
) -> list[GradingResult]:
    """Grade all responses for a model."""
    print(f"   📝 Grading {model_name} responses...")
    
    grades = []
    error_count = 0
    
    for i, (q, r) in enumerate(zip(questions, responses)):
        if r.error:
            grades.append(GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1, error=r.error
            ))
            error_count += 1
        else:
            grade = grader.grade(q["question"], q.get("context", ""), r.response)
            grades.append(grade)
            if grade.error:
                error_count += 1
        
        if (i + 1) % 25 == 0:
            print(f"      Graded {i + 1}/{len(responses)}")
    
    if error_count > 0:
        print(f"      ⚠ {error_count} grading errors")
    
    return grades


def build_model_summary(
    model: ModelConfig,
    responses: list[ModelResponse],
    grades: list[GradingResult],
) -> dict:
    """Build summary stats for a single model."""
    successful = [r for r in responses if r.error is None]
    valid_grades = [g for g in grades if g.error is None]
    
    # Handle case where all responses failed
    if not successful:
        return {
            "name": model.name,
            "model_id": model.model_id,
            "api_type": model.api_type,
            "reasoning_effort": model.reasoning_effort,
            "verbosity": model.verbosity,
            "successful_responses": 0,
            "total_responses": len(responses),
            "avg_score": 0,
            "scores": {
                "on_topic": 0,
                "grounded": 0,
                "no_contradiction": 0,
                "understandability": 0,
                "overall": 0,
            },
            "avg_latency_ms": 0,
            "p95_latency_ms": 0,
            "usage": {
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_tokens": 0,
                "avg_input_tokens": 0,
                "avg_output_tokens": 0,
            },
            "costs": {
                "input_cost": 0,
                "output_cost": 0,
                "total_cost": 0,
                "cost_per_query": 0,
                "cost_per_1k": 0,
                "cost_per_10k": 0,
            },
            "pricing": {
                "input_price_per_million": model.input_price_per_million,
                "output_price_per_million": model.output_price_per_million,
            },
        }
    
    # Token usage
    total_input_tokens = sum(r.input_tokens for r in successful)
    total_output_tokens = sum(r.output_tokens for r in successful)
    total_cost = sum(r.cost for r in successful)
    
    # Latency stats
    latencies = sorted([r.latency_ms for r in successful])
    avg_latency = sum(latencies) / len(latencies)
    p95_idx = int(len(latencies) * 0.95)
    p95_latency = latencies[min(p95_idx, len(latencies) - 1)]
    
    # Score stats
    avg_score = sum(g.average for g in valid_grades) / len(valid_grades) if valid_grades else 0
    
    def avg_dimension(attr: str) -> float:
        vals = [getattr(g, attr) for g in valid_grades]
        return sum(vals) / len(vals) if vals else 0
    
    num_queries = len(successful)
    
    return {
        "name": model.name,
        "model_id": model.model_id,
        "api_type": model.api_type,
        "reasoning_effort": model.reasoning_effort,
        "verbosity": model.verbosity,
        "successful_responses": len(successful),
        "total_responses": len(responses),
        # Scores
        "avg_score": round(avg_score, 3),
        "scores": {
            "on_topic": round(avg_dimension("on_topic"), 3),
            "grounded": round(avg_dimension("grounded"), 3),
            "no_contradiction": round(avg_dimension("no_contradiction"), 3),
            "understandability": round(avg_dimension("understandability"), 3),
            "overall": round(avg_dimension("overall"), 3),
        },
        # Latency
        "avg_latency_ms": round(avg_latency, 1),
        "p95_latency_ms": round(p95_latency, 1),
        # Token usage
        "usage": {
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_input_tokens + total_output_tokens,
            "avg_input_tokens": round(total_input_tokens / num_queries, 1),
            "avg_output_tokens": round(total_output_tokens / num_queries, 1),
        },
        # Costs
        "costs": {
            "input_cost": round((total_input_tokens / 1_000_000) * model.input_price_per_million, 6),
            "output_cost": round((total_output_tokens / 1_000_000) * model.output_price_per_million, 6),
            "total_cost": round(total_cost, 6),
            "cost_per_query": round(total_cost / num_queries, 8),
            "cost_per_1k": round((total_cost / num_queries) * 1000, 4),
            "cost_per_10k": round((total_cost / num_queries) * 10000, 4),
        },
        # Pricing info
        "pricing": {
            "input_price_per_million": model.input_price_per_million,
            "output_price_per_million": model.output_price_per_million,
        },
    }


def build_unified_json(
    questions: list[dict],
    models: list[ModelConfig],
    all_responses: dict[str, list[ModelResponse]],
    all_grades: dict[str, list[GradingResult]],
) -> dict:
    """Build the unified JSON with all models and responses."""
    
    # Build model summaries
    model_summaries = {}
    for model in models:
        key = get_model_key(model)
        model_summaries[key] = build_model_summary(
            model, all_responses[key], all_grades[key]
        )
    
    # Build questions with all model responses
    questions_data = []
    for i, q in enumerate(questions):
        question_entry = {
            "id": i + 1,
            "question": q["question"],
            "context": q.get("context", ""),
            "responses": {}
        }
        
        for model in models:
            key = get_model_key(model)
            r = all_responses[key][i]
            g = all_grades[key][i]
            
            question_entry["responses"][key] = {
                "response": r.response,
                "latency_ms": r.latency_ms,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "cost": r.cost,
                "grade": {
                    "on_topic": g.on_topic,
                    "grounded": g.grounded,
                    "no_contradiction": g.no_contradiction,
                    "understandability": g.understandability,
                    "overall": g.overall,
                    "average": g.average,
                },
                "error": r.error,
            }
        
        questions_data.append(question_entry)
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "num_questions": len(questions),
            "num_models": len(models),
            "grader_model": GRADER_MODEL,
            "grader_reasoning_effort": GRADER_REASONING_EFFORT,
            "model_keys": [get_model_key(m) for m in models],
        },
        "models": model_summaries,
        "questions": questions_data,
    }


async def main():
    parser = argparse.ArgumentParser(description="Run unified LLM evaluation")
    parser.add_argument("--data", type=str, help="Path to Langfuse CSV export")
    parser.add_argument("--samples", type=int, default=100, help="Number of samples to evaluate")
    parser.add_argument("--models", type=str, help="Comma-separated model names (default: all)")
    parser.add_argument("--concurrent", type=int, default=10, help="Max concurrent requests")
    parser.add_argument("--output", type=str, default="../public/data", help="Output directory")
    parser.add_argument("--list-models", action="store_true", help="List available models")
    
    args = parser.parse_args()
    
    if args.list_models:
        list_available_models()
        return
    
    if not args.data:
        print("Error: --data is required")
        print("Usage: python run_evaluation.py --data path/to/langfuse.csv --samples 100")
        sys.exit(1)
    
    # Check if data file exists
    if not os.path.exists(args.data):
        print(f"Error: Data file not found: {args.data}")
        sys.exit(1)
    
    # Load questions
    questions = load_langfuse_data(args.data, args.samples)
    if not questions:
        print("Error: No valid questions found in CSV")
        sys.exit(1)
    
    # Determine which models to run
    if args.models:
        model_names = [m.strip() for m in args.models.split(",")]
        models_to_run = []
        for name in model_names:
            if name in MODELS_BY_NAME:
                models_to_run.append(MODELS_BY_NAME[name])
            else:
                print(f"Warning: Unknown model '{name}', skipping")
                print(f"  Available models: {list(MODELS_BY_NAME.keys())[:5]}...")
        if not models_to_run:
            print("Error: No valid models specified")
            print("Use --list-models to see available models")
            sys.exit(1)
    else:
        models_to_run = ALL_MODELS
    
    print(f"\n{'='*60}")
    print("Unified LLM Evaluation")
    print(f"{'='*60}")
    print(f"Questions: {len(questions)}")
    print(f"Models: {len(models_to_run)}")
    print(f"Output: {args.output}")
    print(f"{'='*60}")
    
    # Initialize grader
    grader = Grader()
    
    # Run all models
    all_responses: dict[str, list[ModelResponse]] = {}
    all_grades: dict[str, list[GradingResult]] = {}
    
    for i, model in enumerate(models_to_run):
        print(f"\n[{i+1}/{len(models_to_run)}] {model.name}")
        print("-" * 40)
        
        key = get_model_key(model)
        
        # Run model
        responses = await run_model_evaluation(model, questions, args.concurrent)
        all_responses[key] = responses
        
        # Grade responses
        grades = grade_responses(questions, responses, grader, model.name)
        all_grades[key] = grades
    
    # Build unified JSON
    print(f"\n{'='*60}")
    print("Building unified JSON...")
    
    unified_data = build_unified_json(questions, models_to_run, all_responses, all_grades)
    
    # Save output
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / "evaluation_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(unified_data, f, indent=2)
    
    print(f"\n✅ Saved: {output_file}")
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    
    # Print summary table
    print(f"\n{'Model':<35} {'Score':>8} {'Latency':>10} {'Cost':>10}")
    print("-" * 65)
    for model in models_to_run:
        key = get_model_key(model)
        summary = unified_data["models"][key]
        print(f"{model.name:<35} {summary['avg_score']:>8.2f} {summary['avg_latency_ms']:>8.0f}ms ${summary['costs']['total_cost']:>8.4f}")
    
    # Print totals
    total_cost = sum(unified_data["models"][get_model_key(m)]["costs"]["total_cost"] for m in models_to_run)
    avg_score = sum(unified_data["models"][get_model_key(m)]["avg_score"] for m in models_to_run) / len(models_to_run)
    print("-" * 65)
    print(f"{'AVERAGE':<35} {avg_score:>8.2f} {'':>10} ${total_cost:>8.4f}")
    
    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())