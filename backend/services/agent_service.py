"""Service layer for Gemini text query operations."""

import logging
import os

from langchain.chat_models import init_chat_model

from ..core.constants import GOOGLE_API_KEY


class GoogleGenAIService:
    """Service wrapper around the Gemini chat model."""

    def __init__(self) -> None:
        """Initialise chat model and API key configuration."""
        if GOOGLE_API_KEY:
            os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
        self.model = init_chat_model("google_genai:gemini-2.5-flash")

    def text_query(self, query: str) -> str:
        """Send text query to Gemini model.

        Args:
            query: Prompt text sent to the model

        Returns:
            Model response text
        """
        logging.info("Processing Gemini query")
        response = self.model.invoke(query)
        if not response:
            return "No response from model"

        content = getattr(response, "content", "")
        if isinstance(content, str):
            return content

        return str(content)
