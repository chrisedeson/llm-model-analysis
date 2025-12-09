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
            response_text = ""
            for item in grader_response.output:
                if item.type == "message":
                    for content in item.content:
                        if content.type == "output_text":
                            response_text = content.text
                            break
            
            return self._parse_grading_response(response_text)
            
        except Exception as e:
            return GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1,
                error=str(e)
            )
    
    def _parse_grading_response(self, response_text: str) -> GradingResult:
        """Parse the JSON grading response."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{[^}]+\}', response_text)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(response_text)
            
            return GradingResult(
                on_topic=int(data.get("on_topic", 1)),
                grounded=int(data.get("grounded", 1)),
                no_contradiction=int(data.get("no_contradiction", 1)),
                understandability=int(data.get("understandability", 1)),
                overall=int(data.get("overall", 1)),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            return GradingResult(
                on_topic=1, grounded=1, no_contradiction=1,
                understandability=1, overall=1,
                error=f"Failed to parse grading response: {e}"
            )
