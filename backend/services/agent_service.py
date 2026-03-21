"""Service layer for conversational agent interactions."""

import logging
import re

from langchain_ollama import ChatOllama

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

    def validate_gig_fields(self, title: str, description: str, tags: list[str] | None = None) -> str:
        """Validate gig title and description fields for content policy compliance.

        Args:
            title: Gig title
            description: Gig description
            tags: Optional selected tags

        Returns:
            Validation result message
        """
        tags_text = ", ".join(tags or []) or "(none)"

        prompt = f"""
You are a marketplace listing consistency reviewer.

Evaluate whether the submitted listing data describes one coherent service.
Use semantic reasoning, not exact keyword matching.

Submitted data:
- Item A: {title}
- Item B: {description}
- Item C: {tags_text}

Instructions:
1. Infer the core service intent from all items together.
2. Treat terms as relevant if they belong to the same practical domain, output type, or workflow.
3. If one item belongs to a clearly different domain with no obvious connection, mark it as an outlier.
4. Cross-domain mismatch rule:
   - Physical capture/content terms (photo, camera, product shoot, portrait, image editing)
   - Software/automation terms (bot, discord bot, API bot, script automation)
   If mixed without an explicit bridge in the listing, treat as inconsistent.
5. Prefer leniency for broad but related terms; be strict only on clear mismatch.
6. Tags should be relevant to the core service described by title and description; irrelevant tags can be outliers.
7. Return exactly one line:
   - complete
   - or Outlier field: <Item A|Item B|Item C> - <short reason>

No extra text.
""".strip()
        
        return self.text_query(prompt)

def main() -> None:
    """Run local smoke test for chat query."""
    service = OllamaAgentService()
    print(service.text_query("Give a one-line greeting for the project"))


if __name__ == "__main__":
    main()
