# LLM Model Evaluation - Makefile
# ================================

.PHONY: help install list run run-quick run-all clean lint check

# Default target
help:
	@echo ""
	@echo "LLM Model Evaluation Commands"
	@echo "=============================="
	@echo ""
	@echo "Setup:"
	@echo "  make install        Install Python dependencies"
	@echo ""
	@echo "Run Evaluation:"
	@echo "  make list           List all available models"
	@echo "  make run            Run full evaluation (100 samples, all 13 models)"
	@echo "  make run-quick      Quick test run (10 samples, 2 models)"
	@echo "  make run-custom     Run with custom args (use ARGS='...')"
	@echo ""
	@echo "Examples:"
	@echo "  make run DATA=../data/langfuse.csv"
	@echo "  make run-quick DATA=../data/langfuse.csv"
	@echo "  make run-custom ARGS='--data ../data/langfuse.csv --samples 50 --models \"GPT-4o-mini\"'"
	@echo ""
	@echo "Code Quality:"
	@echo "  make check          Check Python syntax"
	@echo "  make lint           Run linter (if installed)"
	@echo "  make clean          Remove cache files"
	@echo ""

# Configuration
DATA ?= ../data/langfuse_traces.csv
SAMPLES ?= 100
CONCURRENT ?= 10
OUTPUT ?= ../public/data

# Setup
install:
	pip install -r requirements.txt

# List models
list:
	python run_evaluation.py --list-models

# Full evaluation (all 13 models, 100 samples)
run:
	python run_evaluation.py \
		--data $(DATA) \
		--samples $(SAMPLES) \
		--concurrent $(CONCURRENT) \
		--output $(OUTPUT)

# Quick test (2 models, 10 samples)
run-quick:
	python run_evaluation.py \
		--data $(DATA) \
		--samples 10 \
		--concurrent 5 \
		--models "GPT-4o-mini,GPT-5-mini (minimal, low)" \
		--output $(OUTPUT)

# Custom run with ARGS
run-custom:
	python run_evaluation.py $(ARGS)

# Run specific model families
run-mini:
	python run_evaluation.py \
		--data $(DATA) \
		--samples $(SAMPLES) \
		--models "GPT-4o-mini,GPT-5-mini (minimal, low),GPT-5-mini (minimal, medium),GPT-5-mini (minimal, high),GPT-5-mini (low, low),GPT-5-mini (low, medium),GPT-5-mini (low, high)" \
		--output $(OUTPUT)

run-nano:
	python run_evaluation.py \
		--data $(DATA) \
		--samples $(SAMPLES) \
		--models "GPT-4o-mini,GPT-5-nano (minimal, low),GPT-5-nano (minimal, medium),GPT-5-nano (minimal, high),GPT-5-nano (low, low),GPT-5-nano (low, medium),GPT-5-nano (low, high)" \
		--output $(OUTPUT)

# Code quality
check:
	python -m py_compile config.py grader.py model_runner.py run_evaluation.py
	@echo "✅ All scripts have valid syntax"

lint:
	@command -v ruff >/dev/null 2>&1 && ruff check . || echo "ruff not installed, skipping lint"

# Cleanup
clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete
