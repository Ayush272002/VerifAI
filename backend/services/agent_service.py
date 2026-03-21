"""Service layer for conversational agent interactions."""

import logging

from langchain_ollama import ChatOllama

from ..core.constants import OLLAMA_BASE_URL, OLLAMA_MODEL_NAME


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


def main() -> None:
    """Run local smoke test for chat query."""
    service = OllamaAgentService()
    print(service.text_query("Give a one-line greeting for the project"))


if __name__ == "__main__":
    main()
