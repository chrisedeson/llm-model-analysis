"""
Main evaluation script that runs comparisons and outputs JSON for the web app.

Usage:
    python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100
    python run_evaluation.py --data ../data/langfuse_traces.csv --models "GPT-4o-mini,GPT-5-mini (minimal, low)"
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

from config import ALL_MODELS, DEFAULT_COMPARISON, MODELS_BY_NAME, ModelConfig
from grader import Grader, GradingResult
from model_runner import AsyncModelRunner, ModelResponse


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
    
    # Calculate totals
    total_cost1 = sum(r.cost for r in responses1 if r.error is None)
    total_cost2 = sum(r.cost for r in responses2 if r.error is None)
    
    successful1 = [r for r in responses1 if r.error is None]
    successful2 = [r for r in responses2 if r.error is None]
    
    avg_latency1 = sum(r.latency_ms for r in successful1) / len(successful1) if successful1 else 0
    avg_latency2 = sum(r.latency_ms for r in successful2) / len(successful2) if successful2 else 0
    
    valid_grades1 = [g for g in grades1 if g.error is None]
    valid_grades2 = [g for g in grades2 if g.error is None]
    
    avg_score1 = sum(g.average for g in valid_grades1) / len(valid_grades1) if valid_grades1 else 0
    avg_score2 = sum(g.average for g in valid_grades2) / len(valid_grades2) if valid_grades2 else 0
    
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
        },
        "model1": {
            "name": model1.name,
            "model_id": model1.model_id,
            "api_type": model1.api_type,
            "reasoning_effort": model1.reasoning_effort,
            "verbosity": model1.verbosity,
            "total_cost": total_cost1,
            "avg_latency_ms": avg_latency1,
            "avg_score": avg_score1,
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
            "avg_score": avg_score2,
            "successful_responses": len(successful2),
        },
        "comparisons": comparisons,
    }


async def main():
    parser = argparse.ArgumentParser(description="Run LLM model evaluation")
    parser.add_argument("--data", required=True, help="Path to Langfuse CSV file")
    parser.add_argument("--samples", type=int, default=100, help="Number of samples to evaluate")
    parser.add_argument("--models", help="Comma-separated model names to compare (default: GPT-4o-mini vs GPT-5-mini minimal low)")
    parser.add_argument("--output", default="../public/data", help="Output directory for JSON files")
    parser.add_argument("--concurrent", type=int, default=10, help="Max concurrent API calls")
    args = parser.parse_args()
    
    # Determine models to compare
    if args.models:
        model_names = [m.strip() for m in args.models.split(",")]
        if len(model_names) != 2:
            print("Error: Must specify exactly 2 models to compare")
            sys.exit(1)
        model1 = MODELS_BY_NAME.get(model_names[0])
        model2 = MODELS_BY_NAME.get(model_names[1])
        if not model1 or not model2:
            print(f"Error: Unknown model. Available: {list(MODELS_BY_NAME.keys())}")
            sys.exit(1)
    else:
        model1, model2 = DEFAULT_COMPARISON
    
    print(f"\n{'='*60}")
    print(f"LLM Model Comparison: {model1.name} vs {model2.name}")
    print(f"{'='*60}\n")
    
    # Load data
    questions = load_langfuse_data(args.data, args.samples)
    
    if not questions:
        print("Error: No valid questions found in CSV")
        sys.exit(1)
    
    # Run both models
    responses1 = await run_model_evaluation(model1, questions, args.concurrent)
    responses2 = await run_model_evaluation(model2, questions, args.concurrent)
    
    # Grade responses
    grader = Grader()
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
    
    # Save JSON
    output_file = output_dir / f"comparison_{model1.model_id}_vs_{model2.model_id}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"Results saved to {output_file}")
    print(f"{'='*60}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  {model1.name}:")
    print(f"    - Avg Score: {comparison['model1']['avg_score']:.2f}/5")
    print(f"    - Avg Latency: {comparison['model1']['avg_latency_ms']:.0f}ms")
    print(f"    - Total Cost: ${comparison['model1']['total_cost']:.4f}")
    print(f"  {model2.name}:")
    print(f"    - Avg Score: {comparison['model2']['avg_score']:.2f}/5")
    print(f"    - Avg Latency: {comparison['model2']['avg_latency_ms']:.0f}ms")
    print(f"    - Total Cost: ${comparison['model2']['total_cost']:.4f}")


if __name__ == "__main__":
    asyncio.run(main())
