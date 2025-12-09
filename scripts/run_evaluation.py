"""
Main evaluation script that runs comparisons and outputs JSON for the web app.

Usage:
    # List all available models
    python run_evaluation.py --list-models

    # Compare two specific models
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100 --models "GPT-4o-mini,GPT-5-mini (minimal, low)"

    # Run ALL comparisons (GPT-4o-mini vs each GPT-5 variant) - generates 12 JSON files
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100 --all

    # Default: compare GPT-4o-mini vs GPT-5-mini (minimal, low)
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100
"""

import argparse
import asyncio
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from openai import AsyncOpenAI, OpenAI

from config import ALL_MODELS, DEFAULT_COMPARISON, MODELS_BY_NAME, ModelConfig, GPT_4O_MINI
from grader import Grader, GradingResult
from model_runner import AsyncModelRunner, ModelResponse


def list_available_models():
    """Print all available models."""
    print("\n" + "=" * 60)
    print("Available Models")
    print("=" * 60)
    
    print("\n📌 Baseline Model (no reasoning_effort/verbosity):")
    print(f"   • GPT-4o-mini")
    
    print("\n🔬 GPT-5-mini Variants (reasoning_effort, verbosity):")
    for m in ALL_MODELS:
        if m.model_id == "gpt-5-mini":
            print(f"   • {m.name}")
    
    print("\n🔬 GPT-5-nano Variants (reasoning_effort, verbosity):")
    for m in ALL_MODELS:
        if m.model_id == "gpt-5-nano":
            print(f"   • {m.name}")
    
    print("\n" + "-" * 60)
    print("Usage Examples:")
    print("-" * 60)
    print('  # Compare specific models:')
    print('  python run_evaluation.py --data data.csv --models "GPT-4o-mini,GPT-5-mini (low, medium)"')
    print('')
    print('  # Run ALL comparisons (GPT-4o-mini vs each GPT-5 variant):')
    print('  python run_evaluation.py --data data.csv --samples 100 --all')
    print("=" * 60 + "\n")


def load_langfuse_data(csv_path: str, max_samples: int | None = None) -> list[dict]:
    """
    Load questions from Langfuse CSV export.
    
    Filters out bad rows containing 'args' or 'kwargs' (Langfuse errors).
    """
    questions = []
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Get the input/question field
            input_text = row.get("input", "") or row.get("Input", "") or ""
            
            # Skip bad rows (Langfuse errors, not real questions)
            if "args" in input_text.lower() or "kwargs" in input_text.lower():
                continue
            
            # Skip empty rows
            if not input_text.strip():
                continue
            
            # Get context if available
            context = row.get("context", "") or row.get("Context", "") or ""
            
            questions.append({
                "question": input_text.strip(),
                "context": context.strip() if context else "",
                "trace_id": row.get("trace_id", "") or row.get("id", ""),
            })
            
            if max_samples and len(questions) >= max_samples:
                break
    
    print(f"Loaded {len(questions)} valid questions from {csv_path}")
    return questions


async def run_model_evaluation(
    model: ModelConfig,
    questions: list[dict],
    max_concurrent: int = 10,
) -> list[ModelResponse]:
    """Run evaluation for a single model across all questions."""
    client = AsyncOpenAI()
    runner = AsyncModelRunner(model, client, max_concurrent)
    
    print(f"Running {model.name} on {len(questions)} questions...")
    
    question_context_pairs = [
        (q["question"], q.get("context", "")) for q in questions
    ]
    
    responses = await runner.run_batch(question_context_pairs)
    
    # Print summary
    successful = [r for r in responses if r.error is None]
    total_cost = sum(r.cost for r in successful)
    avg_latency = sum(r.latency_ms for r in successful) / len(successful) if successful else 0
    
    print(f"  ✓ {len(successful)}/{len(responses)} successful")
    print(f"  ⏱ Avg latency: {avg_latency:.0f}ms")
    print(f"  💰 Total cost: ${total_cost:.4f}")
    
    return responses


def grade_responses(
    questions: list[dict],
    responses: list[ModelResponse],
    grader: Grader,
) -> list[GradingResult]:
    """Grade all responses."""
    print(f"Grading {len(responses)} responses...")
    
    grades = []
    for i, (q, r) in enumerate(zip(questions, responses)):
        if r.error:
            grades.append(GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1, error=r.error
            ))
        else:
            grades.append(grader.grade(q["question"], q.get("context", ""), r.response))
        
        if (i + 1) % 10 == 0:
            print(f"  Graded {i + 1}/{len(responses)}")
    
    return grades


def build_comparison_json(
    model1: ModelConfig,
    model2: ModelConfig,
    questions: list[dict],
    responses1: list[ModelResponse],
    responses2: list[ModelResponse],
    grades1: list[GradingResult],
    grades2: list[GradingResult],
) -> dict:
    """Build JSON structure for the comparison page."""
    from config import GRADER_MODEL, GRADER_REASONING_EFFORT
    
    # Calculate totals
    total_cost1 = sum(r.cost for r in responses1 if r.error is None)
    total_cost2 = sum(r.cost for r in responses2 if r.error is None)
    
    successful1 = [r for r in responses1 if r.error is None]
    successful2 = [r for r in responses2 if r.error is None]
    
    # Latency stats
    latencies1 = sorted([r.latency_ms for r in successful1])
    latencies2 = sorted([r.latency_ms for r in successful2])
    
    avg_latency1 = sum(latencies1) / len(latencies1) if latencies1 else 0
    avg_latency2 = sum(latencies2) / len(latencies2) if latencies2 else 0
    
    # P95 latency
    p95_idx1 = int(len(latencies1) * 0.95) if latencies1 else 0
    p95_idx2 = int(len(latencies2) * 0.95) if latencies2 else 0
    p95_latency1 = latencies1[min(p95_idx1, len(latencies1) - 1)] if latencies1 else 0
    p95_latency2 = latencies2[min(p95_idx2, len(latencies2) - 1)] if latencies2 else 0
    
    # Token stats
    tokens1 = [r.tokens for r in successful1 if hasattr(r, 'tokens') and r.tokens]
    tokens2 = [r.tokens for r in successful2 if hasattr(r, 'tokens') and r.tokens]
    avg_tokens1 = sum(tokens1) / len(tokens1) if tokens1 else 0
    avg_tokens2 = sum(tokens2) / len(tokens2) if tokens2 else 0
    
    # Cost per query and projections
    cost_per_query1 = total_cost1 / len(successful1) if successful1 else 0
    cost_per_query2 = total_cost2 / len(successful2) if successful2 else 0
    
    valid_grades1 = [g for g in grades1 if g.error is None]
    valid_grades2 = [g for g in grades2 if g.error is None]
    
    avg_score1 = sum(g.average for g in valid_grades1) / len(valid_grades1) if valid_grades1 else 0
    avg_score2 = sum(g.average for g in valid_grades2) / len(valid_grades2) if valid_grades2 else 0
    
    # Average scores by dimension
    def avg_dimension(grades, attr):
        vals = [getattr(g, attr) for g in grades if g.error is None]
        return sum(vals) / len(vals) if vals else 0
    
    scores1 = {
        "on_topic": avg_dimension(grades1, "on_topic"),
        "grounded": avg_dimension(grades1, "grounded"),
        "no_contradiction": avg_dimension(grades1, "no_contradiction"),
        "understandability": avg_dimension(grades1, "understandability"),
        "overall": avg_dimension(grades1, "overall"),
    }
    scores2 = {
        "on_topic": avg_dimension(grades2, "on_topic"),
        "grounded": avg_dimension(grades2, "grounded"),
        "no_contradiction": avg_dimension(grades2, "no_contradiction"),
        "understandability": avg_dimension(grades2, "understandability"),
        "overall": avg_dimension(grades2, "overall"),
    }
    
    # Build per-question comparison
    comparisons = []
    for i, q in enumerate(questions):
        r1 = responses1[i]
        r2 = responses2[i]
        g1 = grades1[i]
        g2 = grades2[i]
        
        comparisons.append({
            "id": i + 1,
            "question": q["question"],
            "context": q.get("context", ""),
            "model1": {
                "response": r1.response,
                "latency_ms": r1.latency_ms,
                "cost": r1.cost,
                "grade": {
                    "on_topic": g1.on_topic,
                    "grounded": g1.grounded,
                    "no_contradiction": g1.no_contradiction,
                    "understandability": g1.understandability,
                    "overall": g1.overall,
                    "average": g1.average,
                },
                "error": r1.error,
            },
            "model2": {
                "response": r2.response,
                "latency_ms": r2.latency_ms,
                "cost": r2.cost,
                "grade": {
                    "on_topic": g2.on_topic,
                    "grounded": g2.grounded,
                    "no_contradiction": g2.no_contradiction,
                    "understandability": g2.understandability,
                    "overall": g2.overall,
                    "average": g2.average,
                },
                "error": r2.error,
            },
        })
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "num_questions": len(questions),
            "grader_model": GRADER_MODEL,
            "grader_reasoning_effort": GRADER_REASONING_EFFORT,
        },
        "model1": {
            "name": model1.name,
            "model_id": model1.model_id,
            "api_type": model1.api_type,
            "reasoning_effort": model1.reasoning_effort,
            "verbosity": model1.verbosity,
            "total_cost": total_cost1,
            "avg_latency_ms": avg_latency1,
            "p95_latency_ms": p95_latency1,
            "avg_tokens": avg_tokens1,
            "cost_per_1k": cost_per_query1 * 1000,
            "cost_per_10k": cost_per_query1 * 10000,
            "avg_score": avg_score1,
            "scores": scores1,
            "successful_responses": len(successful1),
        },
        "model2": {
            "name": model2.name,
            "model_id": model2.model_id,
            "api_type": model2.api_type,
            "reasoning_effort": model2.reasoning_effort,
            "verbosity": model2.verbosity,
            "total_cost": total_cost2,
            "avg_latency_ms": avg_latency2,
            "p95_latency_ms": p95_latency2,
            "avg_tokens": avg_tokens2,
            "cost_per_1k": cost_per_query2 * 1000,
            "cost_per_10k": cost_per_query2 * 10000,
            "avg_score": avg_score2,
            "scores": scores2,
            "successful_responses": len(successful2),
        },
        "comparisons": comparisons,
    }


async def main():
    parser = argparse.ArgumentParser(description="Run LLM model evaluation")
    parser.add_argument("--data", help="Path to Langfuse CSV file")
    parser.add_argument("--samples", type=int, default=100, help="Number of samples to evaluate")
    parser.add_argument("--models", help="Comma-separated model names to compare (exactly 2 models)")
    parser.add_argument("--all", action="store_true", help="Run ALL comparisons: GPT-4o-mini vs each GPT-5 variant")
    parser.add_argument("--list-models", action="store_true", help="List all available models and exit")
    parser.add_argument("--output", default="../public/data", help="Output directory for JSON files")
    parser.add_argument("--concurrent", type=int, default=10, help="Max concurrent API calls")
    args = parser.parse_args()
    
    # Handle --list-models
    if args.list_models:
        list_available_models()
        return
    
    # Data is required for evaluation
    if not args.data:
        print("Error: --data is required (or use --list-models to see available models)")
        sys.exit(1)
    
    # Load data once
    questions = load_langfuse_data(args.data, args.samples)
    if not questions:
        print("Error: No valid questions found in CSV")
        sys.exit(1)
    
    # Determine which comparisons to run
    if args.all:
        # Run GPT-4o-mini vs ALL GPT-5 variants
        comparisons_to_run = [
            (GPT_4O_MINI, m) for m in ALL_MODELS if m.model_id != "gpt-4o-mini"
        ]
        print(f"\n{'='*60}")
        print(f"Running ALL {len(comparisons_to_run)} comparisons")
        print(f"{'='*60}\n")
    elif args.models:
        model_names = [m.strip() for m in args.models.split(",")]
        if len(model_names) != 2:
            print("Error: Must specify exactly 2 models to compare")
            print("Use --list-models to see available models")
            sys.exit(1)
        model1 = MODELS_BY_NAME.get(model_names[0])
        model2 = MODELS_BY_NAME.get(model_names[1])
        if not model1 or not model2:
            print(f"Error: Unknown model. Use --list-models to see available models")
            sys.exit(1)
        comparisons_to_run = [(model1, model2)]
    else:
        comparisons_to_run = [DEFAULT_COMPARISON]
    
    # Initialize grader once
    grader = Grader()
    
    # Run each comparison
    for i, (model1, model2) in enumerate(comparisons_to_run):
        if len(comparisons_to_run) > 1:
            print(f"\n{'='*60}")
            print(f"Comparison {i+1}/{len(comparisons_to_run)}: {model1.name} vs {model2.name}")
            print(f"{'='*60}\n")
        else:
            print(f"\n{'='*60}")
            print(f"LLM Model Comparison: {model1.name} vs {model2.name}")
            print(f"{'='*60}\n")
        
        # Run both models
        responses1 = await run_model_evaluation(model1, questions, args.concurrent)
        responses2 = await run_model_evaluation(model2, questions, args.concurrent)
        
        # Grade responses
        grades1 = grade_responses(questions, responses1, grader)
        grades2 = grade_responses(questions, responses2, grader)
        
        # Build comparison JSON
        comparison = build_comparison_json(
            model1, model2, questions,
            responses1, responses2, grades1, grades2
        )
        
        # Ensure output directory exists
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename - sanitize model names for filenames
        m1_safe = model1.model_id
        m2_safe = model2.model_id
        if model2.reasoning_effort and model2.verbosity:
            m2_safe = f"{model2.model_id}_{model2.reasoning_effort}_{model2.verbosity}"
        
        output_file = output_dir / f"comparison_{m1_safe}_vs_{m2_safe}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(comparison, f, indent=2)
        
        print(f"\n✅ Saved: {output_file}")
        print(f"   {model1.name}: Score={comparison['model1']['avg_score']:.2f}, Latency={comparison['model1']['avg_latency_ms']:.0f}ms, Cost=${comparison['model1']['total_cost']:.4f}")
        print(f"   {model2.name}: Score={comparison['model2']['avg_score']:.2f}, Latency={comparison['model2']['avg_latency_ms']:.0f}ms, Cost=${comparison['model2']['total_cost']:.4f}")
    
    if len(comparisons_to_run) > 1:
        print(f"\n{'='*60}")
        print(f"✅ All {len(comparisons_to_run)} comparisons complete!")
        print(f"   JSON files saved to: {args.output}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
