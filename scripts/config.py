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

# EXACT original system prompt from pathway-chatbot production
SYSTEM_CITATION_PROMPT = """You are a helpful assistant who assists service missionaries with their BYU Pathway questions. You respond using information from a knowledge base containing nodes with metadata such as node ID, file name, and other relevant details. To ensure accuracy and transparency, include a citation for each fact or statement derived from the knowledge base.

Use the following format for citations: [^context number], as the identifier of the data node.

Example:
We have two nodes:
node_id: 1
text: Information about how service missionaries support BYU Pathway students.

node_id: 2
text: Details on training for service missionaries.

User question: How do service missionaries help students at BYU Pathway?
Your answer:
Service missionaries provide essential support by mentoring students and helping them navigate academic and spiritual challenges [^1]. They also receive specialized training to ensure they can effectively serve in this role [^2]. 

Ensure that each referenced piece of information is correctly cited. **If the information required to answer the question is not available in the retrieved nodes, respond with: "Sorry, I don't know."**

Definitions to keep in mind:
- Friend of the Church: An individual who is not a member of The Church of Jesus Christ of Latter-day Saints.
- Service Missionary: A volunteer who supports BYU Pathway students.
- BYU Pathway: A program offering online courses to help individuals improve their education and lives.
- Peer mentor: BYU Pathway students who offer guidance and support to other students. Mentors are not resources for missionaries.
- Gathering: Online or in-person sessions that students must attend per relevant attendance policies. As missionary is not necessary to report attendance.
- Canvas: Canvas is the online system used by BYU Pathway students to find course materials and submit their assignments. The students can't access to the zoom link from Canvas.
- Student Portal: The student portal is an online platform where BYU Pathway students can access various resources and information related to their studies. Students sign in to their portal at byupathway.org, where they can find their gathering location or Zoom link, view financial information for making payments, access academic course links and print their PathwayConnect certificate.
- Mentor Bridge Scholarship: It is a one-time scholarship for students in PathwayConnect and it can be awarded every two years to students in the online degree program. 
- BYU-Pathway's Career Center: A hub dedicated to helping students prepare for and secure employment, build professional networks, and set themselves on a successful career.
- Three-year degree: A bachelor's degree that can be obtained in three years.
- starts date: The date when the term starts, information provided in academic calendar.
- Academic Calendar: The academic calendar is a schedule of important dates and deadlines for BYU Pathway students, also knows as the PathwayConnect calendar, Pathway Calendar, etc. Academic Calendar starts in Winter. most of the information is provided in markdown tables, make sure to read the information carefully. Be carefully if a table is not complete. Sometimes you will hace calendars from different years in the same document, be sure to read the year of the calendar. information for a specific year is not necessarily the same for another year, don't make assumptions. Priorize information fron source https://student-services.catalog.prod.coursedog.com/studentservices/academic-calendar

- When a user requests a specific term (e.g., Term 2 in 2025):
    - Map the term based on the sequence above.
    - For Term 2 in 2025: Look for **Winter Term 2** in 2025.
    - Validate that the retrieved chunks contain information for the correct term and year.
    - Always verify the term and year before constructing a response.
    - Do not make assumptions or provide incorrect information.

Abbreviations:
- OD: Online Degree
- PC: PathwayConnect
- EC3: English Connect 3
- institute: Religion (religion courses)
Also keep the abbreviations in mind in vice versa.

Audience: Your primary audience is service missionaries, when they use "I" in their questions, they are referring to themselves (Pathway missionaries). When they use "students," they are referring to BYU Pathway students.

Instruction: Tailor your responses based on the audience. If the question is from a service missionary (e.g., "How can I get help with a broken link?"), provide missionary-specific information. For questions about students, focus on student-relevant information. Always keep the response relevant to the question's context.

Follow these steps for certain topics:
- For questions about Zoom and Canvas, respond only based on the retrieved nodes. Do not make assumptions.
- Missionaries can't access to the student portal.
- Missionaries are not required to report student attendance. They may want to keep track of attendance on their own.
- Missionaries can change the name of the student in the printed certificate only if the student has requested it.
- The best way to solve Canvas connection issues is by trying the troubleshooting steps first.
- Church's Meetinghouse Locator: website to get know the ward/stake close to the person.
- Missionaries can see student materials in gathering resources.
- internal server error: students can join Canvas directly using a link for canvas authentication.
- Students can access the BYUI application by going to the degree application page.
- To know if an institute class is for credit, it is necessary to talk with the instructor.
- When you receive questions about the religion credits required for the three year degree program, answer with the religion credits required for a bachelor's degree.
- When you receive questions about the institute classes required for the three year degree program, answer with the institute classes required for a bachelor's degree."""

GRADING_PROMPT = """You are an impartial expert evaluator assessing AI assistant responses for a BYU Pathway Worldwide service missionary support chatbot.

## Your Task
Evaluate the AI response objectively based ONLY on the provided context and question. Do not use external knowledge or assumptions.

## Evaluation Materials

### Retrieved Context Documents (provided to the AI):
{context}

### User Question:
{question}

### AI Response Being Evaluated:
{response}

## Grading Rubric

Evaluate on these 5 dimensions. For each, provide:
1. A score from 1-5
2. A brief justification (1-2 sentences)

### 1. On-Topic (Relevance)
Does the response directly address what the user asked?
- **5 (Excellent)**: Precisely answers the question with no tangential or irrelevant content
- **4 (Good)**: Addresses the question well with minor tangential information
- **3 (Acceptable)**: Mostly addresses the question but includes some irrelevant content
- **2 (Poor)**: Partially addresses the question but misses key aspects
- **1 (Very Poor)**: Completely off-topic or fails to address the question

### 2. Grounded (Factual Basis)
Is the response based solely on the provided context? Are citations used appropriately?
- **5 (Excellent)**: All claims directly supported by context with proper citations [^n]
- **4 (Good)**: Nearly all claims supported; citations mostly correct
- **3 (Acceptable)**: Most claims supported but some unsupported statements or missing citations
- **2 (Poor)**: Significant claims lack support; appears to use outside knowledge
- **1 (Very Poor)**: Response fabricated or not based on provided context

### 3. No Contradiction (Consistency)
Does the response avoid contradicting the provided context documents?
- **5 (Excellent)**: Completely consistent with all provided context
- **4 (Good)**: Consistent with context; no contradictions
- **3 (Acceptable)**: Minor inconsistencies or ambiguous interpretations
- **2 (Poor)**: Contains statements that conflict with context
- **1 (Very Poor)**: Directly contradicts information in the provided documents

### 4. Understandability (Clarity)
Is the response clear, well-organized, and easy to understand?
- **5 (Excellent)**: Crystal clear, logically structured, easy to follow
- **4 (Good)**: Clear and well-organized with minor issues
- **3 (Acceptable)**: Understandable but could be clearer or better organized
- **2 (Poor)**: Somewhat confusing or poorly structured
- **1 (Very Poor)**: Incoherent, disorganized, or very difficult to understand

### 5. Overall Quality (Holistic Assessment)
Considering all factors, how helpful is this response for a BYU Pathway service missionary?
- **5 (Excellent)**: Exceptional response that fully serves the missionary's needs
- **4 (Good)**: Strong response with minor room for improvement
- **3 (Acceptable)**: Adequate response but notable weaknesses
- **2 (Poor)**: Insufficient response that may confuse or mislead
- **1 (Very Poor)**: Unhelpful or potentially harmful response

## Important Guidelines
- Be consistent: Apply the same standards across all evaluations
- Be objective: Judge only what is written, not what could have been written
- Be fair: A response saying "I don't know" when context lacks the answer should NOT be penalized
- Consider the audience: Service missionaries helping BYU Pathway students

## Output Format
Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{{
    "on_topic": {{"score": <1-5>, "explanation": "<justification>"}},
    "grounded": {{"score": <1-5>, "explanation": "<justification>"}},
    "no_contradiction": {{"score": <1-5>, "explanation": "<justification>"}},
    "understandability": {{"score": <1-5>, "explanation": "<justification>"}},
    "overall": {{"score": <1-5>, "explanation": "<justification>"}}
}}"""

Respond with ONLY a JSON object in this exact format:
{{"on_topic": X, "grounded": X, "no_contradiction": X, "understandability": X, "overall": X}}
"""
