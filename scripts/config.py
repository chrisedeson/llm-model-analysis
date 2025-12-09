"""
Configuration for LLM Model Evaluation.

Contains model configurations, prompts, and pricing for:
- GPT-4o-mini (current production model)
- GPT-5-mini, GPT-5-nano variations (reasoning_effort × verbosity)
"""

from dataclasses import dataclass
from typing import Literal

# =============================================================================
# Model Configuration
# =============================================================================

@dataclass
class ModelConfig:
    """Configuration for a single model."""
    name: str  # Display name
    model_id: str  # OpenAI model identifier
    api_type: Literal["chat_completions", "responses"]  # Which API to use
    reasoning_effort: str | None = None  # For responses API: low, medium, high
    verbosity: str | None = None  # For responses API: low, medium, high
    input_price_per_million: float = 0.0  # $ per 1M input tokens
    output_price_per_million: float = 0.0  # $ per 1M output tokens


# GPT-4o-mini - Current production model (Chat Completions API)
GPT_4O_MINI = ModelConfig(
    name="GPT-4o-mini",
    model_id="gpt-4o-mini",
    api_type="chat_completions",
    input_price_per_million=0.15,
    output_price_per_million=0.60,
)

# =============================================================================
# GPT-5 Models - All combinations of reasoning_effort × verbosity
# =============================================================================

# GPT-5-mini variations
GPT_5_MINI_MINIMAL_LOW = ModelConfig(
    name="GPT-5-mini (minimal, low)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="low",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

GPT_5_MINI_MINIMAL_MEDIUM = ModelConfig(
    name="GPT-5-mini (minimal, medium)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="medium",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

GPT_5_MINI_MINIMAL_HIGH = ModelConfig(
    name="GPT-5-mini (minimal, high)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="high",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

GPT_5_MINI_LOW_LOW = ModelConfig(
    name="GPT-5-mini (low, low)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="low",
    verbosity="low",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

GPT_5_MINI_LOW_MEDIUM = ModelConfig(
    name="GPT-5-mini (low, medium)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="low",
    verbosity="medium",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

GPT_5_MINI_LOW_HIGH = ModelConfig(
    name="GPT-5-mini (low, high)",
    model_id="gpt-5-mini",
    api_type="responses",
    reasoning_effort="low",
    verbosity="high",
    input_price_per_million=0.25,
    output_price_per_million=2.0,
)

# GPT-5-nano variations
GPT_5_NANO_MINIMAL_LOW = ModelConfig(
    name="GPT-5-nano (minimal, low)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="low",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

GPT_5_NANO_MINIMAL_MEDIUM = ModelConfig(
    name="GPT-5-nano (minimal, medium)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="medium",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

GPT_5_NANO_MINIMAL_HIGH = ModelConfig(
    name="GPT-5-nano (minimal, high)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="minimal",
    verbosity="high",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

GPT_5_NANO_LOW_LOW = ModelConfig(
    name="GPT-5-nano (low, low)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="low",
    verbosity="low",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

GPT_5_NANO_LOW_MEDIUM = ModelConfig(
    name="GPT-5-nano (low, medium)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="low",
    verbosity="medium",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

GPT_5_NANO_LOW_HIGH = ModelConfig(
    name="GPT-5-nano (low, high)",
    model_id="gpt-5-nano",
    api_type="responses",
    reasoning_effort="low",
    verbosity="high",
    input_price_per_million=0.10,
    output_price_per_million=0.40,
)

# =============================================================================
# Model Collections
# =============================================================================

# All 13 models for evaluation
ALL_MODELS = [
    GPT_4O_MINI,
    GPT_5_MINI_MINIMAL_LOW,
    GPT_5_MINI_MINIMAL_MEDIUM,
    GPT_5_MINI_MINIMAL_HIGH,
    GPT_5_MINI_LOW_LOW,
    GPT_5_MINI_LOW_MEDIUM,
    GPT_5_MINI_LOW_HIGH,
    GPT_5_NANO_MINIMAL_LOW,
    GPT_5_NANO_MINIMAL_MEDIUM,
    GPT_5_NANO_MINIMAL_HIGH,
    GPT_5_NANO_LOW_LOW,
    GPT_5_NANO_LOW_MEDIUM,
    GPT_5_NANO_LOW_HIGH,
]

# Default comparison pair (Dallan's request)
DEFAULT_COMPARISON = (GPT_4O_MINI, GPT_5_MINI_MINIMAL_LOW)

# Model lookup by name
MODELS_BY_NAME = {m.name: m for m in ALL_MODELS}

# =============================================================================
# Grader Configuration
# =============================================================================

GRADER_MODEL = "gpt-5.1"
GRADER_REASONING_EFFORT = "high"

# =============================================================================
# Prompts
# =============================================================================

SYSTEM_CITATION_PROMPT = """You are a helpful assistant for BYU-Pathway Worldwide students. 
Answer questions based on the provided context. Be concise and helpful.
If you don't know the answer from the context, say so honestly."""

GRADING_PROMPT = """You are an expert evaluator. Grade the following AI assistant response based on these criteria:

**Question:** {question}

**Context Provided:** {context}

**AI Response:** {response}

Rate each dimension from 1-5:
1. **on_topic** (1-5): Does the response address the question asked?
2. **grounded** (1-5): Is the response grounded in the provided context?
3. **no_contradiction** (1-5): Does the response avoid contradicting the context?
4. **understandability** (1-5): Is the response clear and easy to understand?
5. **overall** (1-5): Overall quality of the response.

Respond with ONLY a JSON object in this exact format:
{{"on_topic": X, "grounded": X, "no_contradiction": X, "understandability": X, "overall": X}}
"""
