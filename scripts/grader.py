"""
Grader for LLM Response Evaluation.

Uses GPT-5.1 with high reasoning effort to grade responses
on 5 dimensions: on_topic, grounded, no_contradiction, understandability, overall.
"""

import json
import re
from dataclasses import dataclass

from openai import OpenAI

from config import GRADER_MODEL, GRADER_REASONING_EFFORT, GRADING_PROMPT


@dataclass
class GradingResult:
    """Result from grading a response."""
    on_topic: int  # 1-5
    grounded: int  # 1-5
    no_contradiction: int  # 1-5
    understandability: int  # 1-5
    overall: int  # 1-5
    error: str | None = None
    
    @property
    def average(self) -> float:
        """Calculate average score across all dimensions."""
        return (self.on_topic + self.grounded + self.no_contradiction + 
                self.understandability + self.overall) / 5


class Grader:
    """Grades LLM responses using GPT-5.1."""
    
    def __init__(self, client: OpenAI | None = None):
        self.client = client or OpenAI()
        self.model = GRADER_MODEL
        self.reasoning_effort = GRADER_REASONING_EFFORT
    
    def grade(self, question: str, context: str, response: str) -> GradingResult:
        """Grade a single response."""
        if not response or response.strip() == "":
            return GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1,
                error="Empty response"
            )
        
        try:
            prompt = GRADING_PROMPT.format(
                question=question,
                context=context,
                response=response
            )
            
            grader_response = self.client.responses.create(
                model=self.model,
                instructions="You are an expert evaluator. Respond with only a JSON object.",
                input=prompt,
                reasoning={"effort": self.reasoning_effort},
                text={"format": {"type": "text"}},
            )
            
            # Extract text from response
            response_text = self._extract_response_text(grader_response)
            
            if not response_text:
                return GradingResult(
                    on_topic=1, grounded=1, no_contradiction=1,
                    understandability=1, overall=1,
                    error="No output_text found in grader response"
                )
            
            return self._parse_grading_response(response_text)
            
        except Exception as e:
            return GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1,
                error=str(e)
            )
    
    def _extract_response_text(self, grader_response) -> str:
        """Extract text content from the API response."""
        for item in grader_response.output:
            if item.type == "message":
                for content in item.content:
                    if content.type == "output_text":
                        return content.text
        return ""
    
    def _parse_grading_response(self, response_text: str) -> GradingResult:
        """Parse the JSON grading response with robust handling."""
        try:
            # Strip markdown code fences if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)
            
            # Try direct parse first
            data = None
            try:
                data = json.loads(cleaned)
            except json.JSONDecodeError:
                # Find the outermost braces (handles nested objects)
                start = cleaned.find('{')
                end = cleaned.rfind('}')
                if start != -1 and end != -1 and end > start:
                    data = json.loads(cleaned[start:end + 1])
                else:
                    raise ValueError("No JSON object found in response")
            
            if data is None:
                raise ValueError("Failed to parse JSON from response")
            
            # Validate and extract scores (handles both nested and flat formats)
            def get_score(key: str) -> int:
                """Extract and validate a score, handling both nested and flat formats."""
                raw_val = data.get(key)
                if raw_val is None:
                    return 1
                    
                # Handle nested format: {"score": 5, "explanation": "..."}
                if isinstance(raw_val, dict):
                    raw_val = raw_val.get("score", 1)
                
                try:
                    val = int(raw_val)
                    return max(1, min(5, val))
                except (ValueError, TypeError):
                    return 1
            
            return GradingResult(
                on_topic=get_score("on_topic"),
                grounded=get_score("grounded"),
                no_contradiction=get_score("no_contradiction"),
                understandability=get_score("understandability"),
                overall=get_score("overall"),
            )
            
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            return GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1,
                error=f"Failed to parse grading response: {e}"
            )