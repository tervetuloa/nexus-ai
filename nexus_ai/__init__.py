"""nexus-ai - Testing framework for multi-agent LLM systems."""

__version__ = "0.1.0"

from nexus_ai.assertions.coordination import assert_handoff, assert_parallel_execution
from nexus_ai.assertions.system import assert_cost_under, assert_no_loop
from nexus_ai.assertions.tools import assert_no_tool_called, assert_tool_called
from nexus_ai.interceptors.langgraph import LangGraphInterceptor
from nexus_ai.trace.models import AgentMessage, AgentTrace, ToolCall
from nexus_ai.trace.pretty import format_trace, print_trace
from nexus_ai.trace.storage import get_current_trace

__all__ = [
	"assert_handoff",
	"assert_parallel_execution",
	"assert_tool_called",
	"assert_no_tool_called",
	"assert_no_loop",
	"assert_cost_under",
	"LangGraphInterceptor",
	"AgentTrace",
	"AgentMessage",
	"ToolCall",
	"get_current_trace",
	"format_trace",
	"print_trace",
]

