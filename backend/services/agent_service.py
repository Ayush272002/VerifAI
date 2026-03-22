"""Service layer for conversational agent interactions."""

import logging
import re

from langchain_ollama import ChatOllama

from backend.core.data_models import GigValidationRequest

from ..core.constants import GIG_CATEGORIES, OLLAMA_BASE_URL, OLLAMA_MODEL_NAME


class OllamaAgentService:
    """Service wrapper around Ollama chat model."""

    def __init__(self) -> None:
        """Initialise Ollama chat model."""
        self.model = ChatOllama(
            model=OLLAMA_MODEL_NAME,
            base_url=OLLAMA_BASE_URL,
            temperature=0,
        )

    def text_query(self, query: str) -> str:
        """Send text query to Ollama model.

        Args:
            query: Prompt text sent to model

        Returns:
            Model response text
        """
        logging.info("Processing Ollama query with model %s", OLLAMA_MODEL_NAME)
        response = self.model.invoke(query)
        if not response:
            return "No response from model"

        content = getattr(response, "content", "")
        if isinstance(content, str):
            return content

        return str(content)

    def classify_gig_category(self, title: str, description: str, tags: list[str] | None = None) -> str:
        """Classify gig content into one of the predefined categories using Ollama.

        Args:
            title: Gig title
            description: Gig description
            tags: Optional selected tags

        Returns:
            One of GIG_CATEGORIES values (default fallback if parsing fails)
        """
        tags_text = ", ".join(tags or []) or "(none)"
        prompt = f"""
You are an expert marketplace categorization assistant. Stick to exactly one category from this list (case-sensitive please):
{''.join([f'- {c}\n' for c in GIG_CATEGORIES])}

Gig title: {title}
Gig description: {description}
Gig tags: {tags_text}

Respond with a single line in the exact format:
CATEGORY: <one-of-the-above-categories>

No additional text.
""".strip()
        model_response = self.text_query(prompt)

        # Parse a clear category value and validate against known categories.
        match = re.search(r"CATEGORY\s*:\s*(.+)$", model_response, re.IGNORECASE | re.MULTILINE)
        if match:
            candidate = match.group(1).strip()
            for cat in GIG_CATEGORIES:
                if cat.lower() == candidate.lower():
                    return cat

        # Fallback: attempt a loose match by keyword.
        for cat in GIG_CATEGORIES:
            if cat.lower() in model_response.lower():
                return cat

        return "Unknown" # Failsafe if parsing fails

    def validate_gig_fields(self, gig: GigValidationRequest) -> str:
        """Validate gig title and description fields for content policy compliance.

        Args:
            gig: Gig validation request object

        Returns:
            Validation result message
        """
        tags_text = ", ".join(gig.tags or []) or "(none)"
        category_text = gig.category or "(none)"

        prompt = f"""
    You are a semantic consistency checker for marketplace listings.

    Task:
    Decide whether title, description, tags, and category all describe the same service and do not contradict each other.

    Core rule:
    If any field clearly conflicts with the others, flag that field as the outlier.

    Listing attributes:
    - title: {gig.title}
    - description: {gig.description}
    - tags: {tags_text}
    - category: {category_text}

    Evaluation policy:
    1. Use meaning, not exact word matching.
    2. Check title against all other fields first; title must not conflict with description, tags, or category.
    3. Title and description can be specific.
    4. Tags and category can be broader labels, as long as they are in the same service domain.
    5. Because categories are limited fixed options, allow near matches and adjacent creative domains.
    6. Do not flag broad tags/category as outliers if they are still reasonably related.
    7. Flag an outlier only for clear contradiction or major domain mismatch.
    8. If there is no contradiction, return complete.
    9. Example mismatch: sandwich-making vs car-repair category.
    10. Example acceptable relation: reciting movie scripts with video creation category.
    11. If more than one field is weak, choose the single most clearly unrelated field.

    Output format (exactly one line):
    - complete
    - Outlier field: <Attribute> - <short reason>

    Allowed <Attribute> values:
    title | description | tags | category
""".strip()

        return self.text_query(prompt)

def main() -> None:
    """Run local smoke test for chat query."""
    service = OllamaAgentService()
    print(service.text_query("Give a one-line greeting for the project"))


if __name__ == "__main__":
    main()
