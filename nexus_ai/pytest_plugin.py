from __future__ import annotations

import pytest

from nexus_ai.trace.models import AgentTrace
from nexus_ai.trace.storage import clear_current_trace, set_current_trace


@pytest.fixture(autouse=True)
def nexus_ai_trace() -> AgentTrace:
    """Automatically create and clean up trace for each test."""
    trace = AgentTrace()
    set_current_trace(trace)
    yield trace
    clear_current_trace()


def pytest_configure(config: pytest.Config) -> None:
    """Register nexus_ai markers."""
    config.addinivalue_line(
        "markers",
        "nexus_ai: mark test as an agent coordination test",
    )

