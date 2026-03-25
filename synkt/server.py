"""Real-time trace streaming server for synkt UI.

Streams test execution data via Server-Sent Events (SSE).
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="synkt Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory trace queue shared between endpoints
trace_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()


@app.get("/stream")
async def stream_traces() -> EventSourceResponse:
    """SSE endpoint that streams trace snapshots to the UI."""

    async def event_generator():  # type: ignore[no-untyped-def]
        while True:
            trace = await trace_queue.get()
            event_type = trace.pop("_event", "trace")
            yield {"event": event_type, "data": json.dumps(trace)}

    return EventSourceResponse(event_generator())


@app.post("/trace")
async def receive_trace(trace: dict[str, Any]) -> dict[str, str]:
    """Receive a trace snapshot from test execution."""
    await trace_queue.put(trace)
    return {"status": "ok"}


# ─── Structural topology analysis ────────────────────────────────────


class TopologyRequest(BaseModel):
    """Graph topology submitted for analysis."""

    nodes: list[str]
    edges: list[list[str]] = Field(
        ..., description="List of [source, target] pairs"
    )
    conditional_edges: dict[str, dict[str, str]] = Field(default_factory=dict)


@app.post("/topology")
async def analyze_topology(req: TopologyRequest) -> dict[str, Any]:
    """
    Run structural analysis on a graph and return the report.

    Also pushes a 'topology' SSE event so the UI updates in real-time.
    """
    try:
        from synkt.analysis.graph_topology import GraphTopologyAnalyzer
    except ImportError:
        return {
            "error": "networkx not installed. Run: pip install synkt[analysis]"
        }

    edges_tuples = [(e[0], e[1]) for e in req.edges if len(e) >= 2]
    analyzer = GraphTopologyAnalyzer.from_dict(
        nodes=req.nodes,
        edges=edges_tuples,
        conditional_edges=req.conditional_edges,
    )
    report = analyzer.analyze()

    result = {
        "dead_end_nodes": report["dead_end_nodes"],
        "unreachable_nodes": report["unreachable_nodes"],
        "unbounded_cycles": report["unbounded_cycles"],
        "missing_end_paths": report["missing_end_paths"],
        "has_issues": analyzer.has_structural_issues(),
        "nodes": req.nodes,
        "edges": req.edges,
        "conditional_edges": req.conditional_edges,
    }

    # Push to SSE stream for real-time UI updates
    sse_event = {**result, "_event": "topology"}
    await trace_queue.put(sse_event)

    return result


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check."""
    return {"status": "healthy", "queue_size": trace_queue.qsize()}


if __name__ == "__main__":
    import uvicorn

    print("synkt server starting on http://localhost:8000")
    print("Open http://localhost:3000 to view dashboard")
    uvicorn.run(app, host="0.0.0.0", port=8000)
