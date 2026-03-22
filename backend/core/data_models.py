"""Pydantic data models for agent and verification workflows."""

from pydantic import BaseModel
from pydantic import Field


class RequirementItem(BaseModel):
    """Requirement checklist item."""

    requirement: str = Field(..., min_length=1)


class RequirementCheck(BaseModel):
    """Verification result for one requirement."""

    requirement: str
    checked: bool
    evidence: str


class PythonFileInput(BaseModel):
    """Python file payload for checklist-based review."""

    file_name: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class PythonFilesReviewRequest(BaseModel):
    """Request payload for Python file checklist review."""

    requirements_list: list[RequirementItem] = Field(..., min_length=1)
    seller_profile: str = Field(..., min_length=1)
    what_they_offer: str = Field(..., min_length=1)
    seller_description: str = Field(..., min_length=1)
    python_files: list[PythonFileInput] = Field(..., min_length=1)


class ImageReviewRequest(BaseModel):
    """Request payload for image verification."""

    requirements_list: list[RequirementItem] = Field(..., min_length=1)
    seller_profile: str = Field(..., min_length=1)
    what_they_offer: str = Field(..., min_length=1)
    seller_description: str = Field(..., min_length=1)
    image_base64: str | None = None
    image_description: str | None = None


class FilePayload(BaseModel):
    """Single file payload for unified verification."""

    file_name: str = Field(..., min_length=1)
    content: str = Field(
        ...,
        description=(
            "File content: plain text for code/text files, "
            "base64-encoded string for images"
        ),
    )
    content_type: str = Field(
        ...,
        description="MIME type (eg: text/x-python, image/jpeg, text/plain)",
    )


class UnifiedVerifyRequest(BaseModel):
    """Request payload for unified multi-file verification."""

    requirements_list: list[RequirementItem] = Field(default_factory=list)
    raw_job_description: str = Field(default="")
    seller_profile: str = Field(..., min_length=1)
    what_they_offer: str = Field(..., min_length=1)
    seller_description: str = Field(..., min_length=1)
    files: list[FilePayload] = Field(..., min_length=1)

    def model_post_init(self, __context):
        """Validate that either requirements_list or raw_job_description is provided."""
        if not self.requirements_list and not self.raw_job_description.strip():
            raise ValueError(
                "Either requirements_list or raw_job_description must be provided"
            )


class GigCategorizationRequest(BaseModel):
    """Request payload for gig category classification."""

    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    tags: list[str] = Field(default_factory=list)

class GigValidationRequest(BaseModel):
    """Request payload for gig category classification."""

    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    tags: list[str] = Field(default_factory=list)
    category: str = Field(...)