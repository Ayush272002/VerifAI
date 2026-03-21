"""Enterprise-grade dynamic verification using LangGraph MoA architecture."""

import logging
import operator
from typing import Annotated, Any, Generator, TypedDict

from langchain_ollama import ChatOllama
from langgraph.constants import Send
from langgraph.graph import END, START, StateGraph

from ..core.constants import OLLAMA_BASE_URL, OLLAMA_MODEL_CHOICES
from ..core import hierarchical_prompts
from .verification_service import VerificationService


class SubAgentTask(TypedDict):
    """Definition of a dynamically spawned sub-agent."""

    agent_name: str
    focus_area: str
    assigned_requirements: list[str]


class SubAgentOutput(TypedDict):
    """Output from a specialized sub-agent."""

    agent_name: str
    requirement_checks: list[dict[str, Any]]


class VerificationGraphState(TypedDict):
    """Master state for the verification graph."""

    requirements_list: list[str]
    seller_profile: str
    what_they_offer: str
    files: list[dict[str, Any]]

    # Managed sequentially / via edges
    file_analyses: list[dict[str, Any]]
    sub_tasks: list[SubAgentTask]
    sub_agent_outputs: Annotated[list[SubAgentOutput], operator.add]
    final_report: dict[str, Any]


class SpecializedAgentState(TypedDict):
    """State mapped to an individual specialized agent node."""

    task: SubAgentTask
    file_analyses: list[dict[str, Any]]
    seller_profile: str
    what_they_offer: str


class HierarchicalVerificationService:
    """Implement LangGraph dynamic agent spawning for verification."""

    def __init__(self) -> None:
        """Initialise models and compile the graph state machine."""
        self.code_model = ChatOllama(
            model=OLLAMA_MODEL_CHOICES["code"],
            base_url=OLLAMA_BASE_URL,
            temperature=0,
        )
        self.base_service = VerificationService()
        self.graph = self._build_graph()

    def _build_graph(self) -> Any:
        """Construct the LangGraph state machine workflow."""
        builder = StateGraph(VerificationGraphState)

        # Add nodes
        builder.add_node("content_analysis", self._node_content_analysis)
        builder.add_node("orchestrator", self._node_orchestrator)
        builder.add_node("specialized_agent", self._node_specialized_agent)
        builder.add_node("aggregator", self._node_aggregator)

        # Define edges
        builder.add_edge(START, "content_analysis")
        builder.add_edge("content_analysis", "orchestrator")
        builder.add_conditional_edges(
            "orchestrator", self._route_to_agents, ["specialized_agent"]
        )
        builder.add_edge("specialized_agent", "aggregator")
        builder.add_edge("aggregator", END)

        return builder.compile()

    # --- Node Logic ---

    def _node_content_analysis(self, state: VerificationGraphState) -> dict[str, Any]:
        """Analyse content iteratively using the base VerificationService."""
        analyses = []
        for file_payload in state["files"]:
            file_name = file_payload.get("file_name", "unknown")
            content = file_payload.get("content", "")
            content_type = file_payload.get("content_type", "")
            try:
                gen = self.base_service._analyse_file(
                    file_name=file_name,
                    content=content,
                    content_type=content_type,
                )
                analysis = None
                try:
                    while True:
                        next(gen)
                except StopIteration as exc:
                    analysis = exc.value
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logging.warning("Analysis failed for sum: %s", exc)
                analysis = {
                    "file_name": file_name,
                    "media_type": "unknown",
                    "summary": f"Analysis failed: {exc}",
                    "key_elements": [],
                }
            if analysis:
                analysis["file_name"] = file_name
                analyses.append(analysis)

        return {"file_analyses": analyses}

    def _node_orchestrator(self, state: VerificationGraphState) -> dict[str, Any]:
        """Spawn dynamic sub-agents for requirement clusters."""
        prompt = hierarchical_prompts.build_orchestrator_prompt(
            requirements_list=state["requirements_list"],
            file_analyses=state["file_analyses"],
        )
        parsed = self.base_service._invoke_json(self.code_model, prompt)

        raw_tasks = parsed.get("tasks", [])
        tasks = []
        for t in raw_tasks:
            if isinstance(t, dict):
                tasks.append(
                    SubAgentTask(
                        agent_name=str(t.get("agent_name", "ReviewAgent")),
                        focus_area=str(t.get("focus_area", "General Criteria")),
                        assigned_requirements=[
                            str(r) for r in t.get("assigned_requirements", [])
                        ],
                    )
                )

        # Fallback if orchestrator fails
        if not tasks:
            tasks.append(
                SubAgentTask(
                    agent_name="FallbackAgent",
                    focus_area="All User Requirements",
                    assigned_requirements=state["requirements_list"],
                )
            )

        return {"sub_tasks": tasks}

    def _route_to_agents(self, state: VerificationGraphState) -> list[Send]:
        """Fan out to multiple dynamically spawned agents."""
        sends = []
        for task in state["sub_tasks"]:
            agent_state = SpecializedAgentState(
                task=task,
                file_analyses=state["file_analyses"],
                seller_profile=state["seller_profile"],
                what_they_offer=state["what_they_offer"],
            )
            sends.append(Send("specialized_agent", agent_state))
        return sends

    def _node_specialized_agent(self, state: SpecializedAgentState) -> dict[str, Any]:
        """Execute a specialized sub-agent."""
        task = state["task"]
        prompt = hierarchical_prompts.build_specialized_agent_prompt(
            agent_name=task["agent_name"],
            focus_area=task["focus_area"],
            assigned_requirements=task["assigned_requirements"],
            file_analyses=state["file_analyses"],
            seller_profile=state["seller_profile"],
            what_they_offer=state["what_they_offer"],
        )
        parsed = self.base_service._invoke_json(self.code_model, prompt)
        checks = parsed.get("requirement_checks", [])
        if not isinstance(checks, list):
            checks = []

        output = SubAgentOutput(
            agent_name=task["agent_name"],
            requirement_checks=checks,
        )
        return {"sub_agent_outputs": [output]}

    def _node_aggregator(self, state: VerificationGraphState) -> dict[str, Any]:
        """Merge specialized agent outputs into a unified report."""
        merged_checks = []
        for output in state["sub_agent_outputs"]:
            for check in output["requirement_checks"]:
                if isinstance(check, dict):
                    # Annotate the evidence with the agent that produced it
                    check["evidence"] = (
                        f"[{output['agent_name']}] {check.get('evidence', '')}"
                    )
                    merged_checks.append(check)

        # Build a pseudo-parsed dict to run through the normaliser
        pseudo_parsed = {
            "requirement_checks": merged_checks,
            "summary": f"Verification completed by {len(state['sub_tasks'])} specialised MoA agents.",
            # Let the normaliser calculate status/score based on true/false ratios
        }

        report = self.base_service._normalise_checklist_report(
            requirements_list=state["requirements_list"],
            parsed=pseudo_parsed,
            modality="hierarchical_moa",
        )
        return {"final_report": report}

    # --- Streaming Generator for the Frontend ---

    def stream_hierarchical_verify(
        self, payload_dict: dict[str, Any]
    ) -> Generator[str, None, None]:
        """Run the LangGraph MoA pipeline and yield SSE events."""
        reqs = payload_dict.get("requirements_list", [])
        initial_state = VerificationGraphState(
            requirements_list=[
                r["requirement"] if isinstance(r, dict) else r for r in reqs
            ],
            seller_profile=payload_dict.get("seller_profile", ""),
            what_they_offer=payload_dict.get("what_they_offer", ""),
            files=payload_dict.get("files", []),
            file_analyses=[],
            sub_tasks=[],
            sub_agent_outputs=[],
            final_report={},
        )

        yield self.base_service._format_sse(
            "stage",
            {"stage": "init", "message": "Initialising LangGraph MoA workflow..."},
        )

        try:
            # stream_mode="updates" yields State changes after each Node completes
            for event in self.graph.stream(initial_state, stream_mode="updates"):
                if "content_analysis" in event:
                    analyses = event["content_analysis"].get("file_analyses", [])
                    yield self.base_service._format_sse(
                        "stage",
                        {
                            "stage": "content_analysis_complete",
                            "message": f"Summarised {len(analyses)} file(s).",
                        },
                    )
                    for analysis in analyses:
                        yield self.base_service._format_sse("analysis", analysis)

                elif "orchestrator" in event:
                    tasks = event["orchestrator"].get("sub_tasks", [])
                    agent_names = ", ".join(t["agent_name"] for t in tasks)
                    yield self.base_service._format_sse(
                        "stage",
                        {
                            "stage": "orchestration_complete",
                            "message": f"Orchestrator deployed {len(tasks)} agents: [{agent_names}]",
                        },
                    )

                elif "specialized_agent" in event:
                    outputs = event["specialized_agent"].get("sub_agent_outputs", [])
                    for out in outputs:
                        agent_name = out["agent_name"]
                        yield self.base_service._format_sse(
                            "stage",
                            {
                                "stage": "sub_agent_evaluating",
                                "message": f"Agent verified branch: {agent_name}",
                            },
                        )

                elif "aggregator" in event:
                    report = event["aggregator"].get("final_report", {})
                    yield self.base_service._format_sse(
                        "stage",
                        {
                            "stage": "aggregation_complete",
                            "message": "Aggregating MoA Sub-Agent findings...",
                        },
                    )
                    yield self.base_service._format_sse("report", report)

        except Exception as exc:  # pylint: disable=broad-exception-caught
            logging.error("LangGraph crashed: %s", exc)
            error_report = {
                "modality": "hierarchical_moa",
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": f"LangGraph execution crashed: {exc}",
                "requirement_checks": [],
                "totals": {"completed": 0, "total": 1},
            }
            yield self.base_service._format_sse("report", error_report)
