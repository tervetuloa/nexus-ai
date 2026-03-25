from __future__ import annotations

from datetime import datetime
from typing import Optional, Type

from pydantic import BaseModel

from synkt.trace.storage import get_current_trace


def assert_handoff(
    from_agent: str,
    to_agent: str,
    message_schema: Optional[Type[BaseModel]] = None,
    **kwargs: str,
) -> None:
    """
    Assert that one agent handed off to another.

    Args:
        from_agent: Name of the agent that initiated handoff
        to_agent: Name of the agent that received handoff
        message_schema: Optional Pydantic model to validate message content

    Raises:
        AssertionError: If handoff didn't occur or schema doesn't match

    Examples:
        >>> assert_handoff("triage", "refunds")
    """
    # Backward compatibility with docs/examples using from_node/to_node.
    from_agent = kwargs.get("from_node", from_agent)
    to_agent = kwargs.get("to_node", to_agent)

    trace = get_current_trace()
    handoffs = [
        msg
        for msg in trace.messages
        if msg.from_agent == from_agent and msg.to_agent == to_agent
    ]

    if not handoffs:
        raise AssertionError(
            f"No handoff from '{from_agent}' to '{to_agent}'. "
            f"Found {len(trace.messages)} total messages: "
            f"{[(m.from_agent, m.to_agent) for m in trace.messages]}"
        )

    if message_schema:
        handoff = handoffs[0]
        try:
            message_schema(**handoff.content)
        except Exception as exc:  # pragma: no cover - exact pydantic error varies
            raise AssertionError(
                f"Handoff message doesn't match schema {message_schema.__name__}: {exc}"
            ) from exc


def assert_agent_called(
    agent_name: str,
    times: int = 1,
) -> None:
    """
    Assert that a specific agent was invoked (appeared as from_agent or to_agent) a given number
    of times in the trace.

    This is the agent-level counterpart to ``assert_tool_called``.  Use it to verify that
    a particular agent participated in the execution the expected number of times — for example,
    that a validator agent ran exactly once, or that a retry loop invoked an agent three times.

    Args:
        agent_name: Name of the agent to check (matched against ``from_agent`` and ``to_agent``
                    fields of every recorded message).
        times: Expected total number of messages in which the agent appears (default 1).

    Raises:
        AssertionError: If the actual invocation count does not equal *times*.

    Examples:
        >>> assert_agent_called("validator")
        >>> assert_agent_called("researcher", times=3)
    """
    trace = get_current_trace()
    invocations = [
        msg
        for msg in trace.messages
        if msg.from_agent == agent_name or msg.to_agent == agent_name
    ]

    if len(invocations) != times:
        raise AssertionError(
            f"Expected '{agent_name}' to be called {times} time(s), "
            f"but found {len(invocations)} invocation(s). "
            f"All agents seen: {list({m.from_agent for m in trace.messages} | {m.to_agent for m in trace.messages})}"
        )


def assert_no_agent_called(agent_name: str) -> None:
    """
    Assert that a specific agent was never invoked during the trace.

    This is the agent-level counterpart to ``assert_no_tool_called``.  Use it to verify that
    an agent that should have been skipped (e.g. an escalation path, a human-review step,
    or an expensive sub-agent) did not participate in the execution.

    Args:
        agent_name: Name of the agent that must not appear in any message.

    Raises:
        AssertionError: If the agent appears in one or more messages.

    Examples:
        >>> assert_no_agent_called("human_review")
        >>> assert_no_agent_called("escalation_agent")
    """
    trace = get_current_trace()
    invocations = [
        msg
        for msg in trace.messages
        if msg.from_agent == agent_name or msg.to_agent == agent_name
    ]

    if invocations:
        raise AssertionError(
            f"Expected '{agent_name}' to never be called, "
            f"but found {len(invocations)} invocation(s)."
        )


def assert_parallel_execution(agents: list[str], max_time_delta_ms: float = 50.0) -> None:
    """
    Assert that multiple agents executed in near-parallel based on timestamps.

    Args:
        agents: Agent names expected to run in parallel
        max_time_delta_ms: Maximum allowed span between earliest and latest event

    Raises:
        AssertionError: If insufficient events are present or timing is too far apart
    """
    trace = get_current_trace()
    timestamps: list[datetime] = []

    for message in trace.messages:
        if message.from_agent in agents or message.to_agent in agents:
            timestamps.append(message.timestamp)

    if len(timestamps) < len(agents):
        raise AssertionError(
            f"Expected events for {len(agents)} agents, found {len(timestamps)} relevant messages"
        )

    span_ms = (max(timestamps) - min(timestamps)).total_seconds() * 1000
    if span_ms > max_time_delta_ms:
        raise AssertionError(
            f"Expected parallel execution within {max_time_delta_ms}ms, observed {span_ms:.2f}ms"
        )

