"""
Model Runner for LLM Evaluation.

Supports both synchronous and asynchronous execution with:
- OpenAI Chat Completions API (GPT-4o-mini)
- OpenAI Responses API (GPT-5 models)
"""

import asyncio
import time
from dataclasses import dataclass

from openai import AsyncOpenAI, OpenAI

from config import ModelConfig, SYSTEM_CITATION_PROMPT


@dataclass
class ModelResponse:
    """Response from a model run."""
    model_name: str
    question: str
    context: str
    response: str
    latency_ms: float
    input_tokens: int
    output_tokens: int
    cost: float  # Calculated cost in USD
    error: str | None = None


class ModelRunner:
    """Synchronous model runner."""
    
    def __init__(self, config: ModelConfig, client: OpenAI | None = None):
        self.config = config
        self.client = client or OpenAI()
        self.max_retries = 3
        self.retry_delay = 5
    
    def run(self, question: str, context: str) -> ModelResponse:
        """Run a single question through the model."""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                # Reset start time for each attempt so latency reflects only the successful call
                start_time = time.time()
                
                if self.config.api_type == "chat_completions":
                    return self._run_chat_completions(question, context, start_time)
                else:
                    return self._run_responses(question, context, start_time)
                    
            except Exception as e:
                last_error = str(e)
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
        
        return self._error_response(question, context, last_error or "Max retries exceeded")
    
    def _run_chat_completions(self, question: str, context: str, start_time: float) -> ModelResponse:
        """Run using Chat Completions API (GPT-4o-mini)."""
        messages = [
            {"role": "system", "content": SYSTEM_CITATION_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
        
        response = self.client.chat.completions.create(
            model=self.config.model_id,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        
        latency_ms = (time.time() - start_time) * 1000
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        
        response_text = response.choices[0].message.content or ""
        
        if not response_text.strip():
            return self._error_response(
                question, context, "Empty response from chat completions API"
            )
        
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response=response_text,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=self._calculate_cost(input_tokens, output_tokens),
        )
    
    def _run_responses(self, question: str, context: str, start_time: float) -> ModelResponse:
        """Run using Responses API (GPT-5 models)."""
        user_message = f"Context:\n{context}\n\nQuestion: {question}"
        
        response = self.client.responses.create(
            model=self.config.model_id,
            instructions=SYSTEM_CITATION_PROMPT,
            input=user_message,
            reasoning={"effort": self.config.reasoning_effort},
            text={"format": {"type": "text"}},
        )
        
        latency_ms = (time.time() - start_time) * 1000
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        
        # Extract text from response
        response_text = self._extract_response_text(response)
        
        if not response_text.strip():
            return self._error_response(
                question, context, "No output_text found in responses API response"
            )
        
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response=response_text,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=self._calculate_cost(input_tokens, output_tokens),
        )
    
    def _extract_response_text(self, response) -> str:
        """Extract text content from the Responses API response."""
        for item in response.output:
            if item.type == "message":
                for content in item.content:
                    if content.type == "output_text":
                        return content.text
        return ""
    
    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost in USD."""
        input_cost = (input_tokens / 1_000_000) * self.config.input_price_per_million
        output_cost = (output_tokens / 1_000_000) * self.config.output_price_per_million
        return input_cost + output_cost
    
    def _error_response(self, question: str, context: str, error: str) -> ModelResponse:
        """Create an error response."""
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response="",
            latency_ms=0,
            input_tokens=0,
            output_tokens=0,
            cost=0,
            error=error,
        )


class AsyncModelRunner:
    """Asynchronous model runner with bounded concurrency."""
    
    def __init__(
        self,
        config: ModelConfig,
        client: AsyncOpenAI | None = None,
        max_concurrent: int = 10,
    ):
        self.config = config
        self.client = client or AsyncOpenAI()
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.max_retries = 3
        self.retry_delay = 5
    
    async def run(self, question: str, context: str) -> ModelResponse:
        """Run a single question through the model with bounded concurrency."""
        async with self.semaphore:
            last_error = None
            
            for attempt in range(self.max_retries):
                try:
                    # Reset start time for each attempt so latency reflects only the successful call
                    start_time = time.time()
                    
                    if self.config.api_type == "chat_completions":
                        return await self._run_chat_completions(question, context, start_time)
                    else:
                        return await self._run_responses(question, context, start_time)
                        
                except Exception as e:
                    last_error = str(e)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay)
            
            return self._error_response(question, context, last_error or "Max retries exceeded")
    
    async def _run_chat_completions(self, question: str, context: str, start_time: float) -> ModelResponse:
        """Run using Chat Completions API (GPT-4o-mini)."""
        messages = [
            {"role": "system", "content": SYSTEM_CITATION_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
        
        response = await self.client.chat.completions.create(
            model=self.config.model_id,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        
        latency_ms = (time.time() - start_time) * 1000
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        
        response_text = response.choices[0].message.content or ""
        
        if not response_text.strip():
            return self._error_response(
                question, context, "Empty response from chat completions API"
            )
        
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response=response_text,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=self._calculate_cost(input_tokens, output_tokens),
        )
    
    async def _run_responses(self, question: str, context: str, start_time: float) -> ModelResponse:
        """Run using Responses API (GPT-5 models)."""
        user_message = f"Context:\n{context}\n\nQuestion: {question}"
        
        response = await self.client.responses.create(
            model=self.config.model_id,
            instructions=SYSTEM_CITATION_PROMPT,
            input=user_message,
            reasoning={"effort": self.config.reasoning_effort},
            text={"format": {"type": "text"}},
        )
        
        latency_ms = (time.time() - start_time) * 1000
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        
        # Extract text from response
        response_text = self._extract_response_text(response)
        
        if not response_text.strip():
            return self._error_response(
                question, context, "No output_text found in responses API response"
            )
        
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response=response_text,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=self._calculate_cost(input_tokens, output_tokens),
        )
    
    def _extract_response_text(self, response) -> str:
        """Extract text content from the Responses API response."""
        for item in response.output:
            if item.type == "message":
                for content in item.content:
                    if content.type == "output_text":
                        return content.text
        return ""
    
    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost in USD."""
        input_cost = (input_tokens / 1_000_000) * self.config.input_price_per_million
        output_cost = (output_tokens / 1_000_000) * self.config.output_price_per_million
        return input_cost + output_cost
    
    def _error_response(self, question: str, context: str, error: str) -> ModelResponse:
        """Create an error response."""
        return ModelResponse(
            model_name=self.config.name,
            question=question,
            context=context,
            response="",
            latency_ms=0,
            input_tokens=0,
            output_tokens=0,
            cost=0,
            error=error,
        )
    
    async def run_batch(self, questions: list[tuple[str, str]]) -> list[ModelResponse]:
        """Run a batch of questions concurrently."""
        tasks = [self.run(q, c) for q, c in questions]
        return await asyncio.gather(*tasks)