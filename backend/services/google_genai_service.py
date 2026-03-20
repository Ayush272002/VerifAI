from langchain.chat_models import init_chat_model
from ..core.constants import GOOGLE_API_KEY

class GoogleGenAIService():
    def __init__(self) -> None:
        self.model = init_chat_model("google_genai:gemini-2.5-flash")

    def textQuery(self, query: str) -> str:
        """Send a text query to the Gemini model and return the response."""

        print(f"Received query: {query}")
        response = self.model.invoke(query)
        content = response.content if response else "No response from model."
        print(f"Model response: {content}")
        return content
