# LLM Model Analysis - Python Scripts

This folder contains Python scripts for running LLM evaluations.

## Setup

```bash
cd scripts
python -m venv .venv
source .venv/bin/activate
pip install openai
```

## Usage

```bash
# Run default comparison (GPT-4o-mini vs GPT-5-mini minimal low)
python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100

# Run with specific models
python run_evaluation.py --data ../data/langfuse_traces.csv --samples 100 \
    --models "GPT-4o-mini,GPT-5-nano (minimal, low)"

# Custom output directory
python run_evaluation.py --data ../data/langfuse_traces.csv --output ../public/data
```

## Environment

Requires `OPENAI_API_KEY` environment variable.

## Output

Generates JSON files in `../public/data/` for the Next.js app to read.
