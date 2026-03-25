import { useEffect, useState, useCallback, useRef } from "react"

export interface AgentData {
  name: string
  status: "idle" | "active" | "complete" | "error"
  cost: number
  tokens: number
  type: string
}

export interface MessageData {
  from_agent: string
  to_agent: string
  timestamp: number
  content: string
}

export interface TraceData {
  agents: AgentData[]
  messages: MessageData[]
  total_cost: number
  total_tokens: number
  latency_ms: number
  timestamp: number
  loop_detected: boolean
  loop_agents: string[]
}

export interface TopologyData {
  dead_end_nodes: string[]
  unreachable_nodes: string[]
  unbounded_cycles: string[][]
  missing_end_paths: string[]
  has_issues: boolean
  nodes: string[]
  edges: string[][]
}

export function useTraceStream(url: string = "http://localhost:8000/stream") {
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [topologyData, setTopologyData] = useState<TopologyData | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Accumulate snapshots for timeline replay
  const [traceHistory, setTraceHistory] = useState<TraceData[]>([])
  const historyRef = useRef<TraceData[]>([])

  const connect = useCallback(() => {
    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        setConnected(true)
        setError(null)
      }

      eventSource.addEventListener("trace", (event) => {
        try {
          const data = JSON.parse(event.data) as TraceData
          setTraceData(data)
          // Append to history (cap at 500 entries to prevent OOM)
          if (historyRef.current.length >= 500) {
            historyRef.current = historyRef.current.slice(-250)
          }
          historyRef.current.push(data)
          setTraceHistory([...historyRef.current])
        } catch {
          // Ignore parse errors
        }
      })

      eventSource.addEventListener("topology", (event) => {
        try {
          const data = JSON.parse(event.data) as TopologyData
          setTopologyData(data)
        } catch {
          // Ignore parse errors
        }
      })

      eventSource.onerror = () => {
        setConnected(false)
        setError(
          "Connection lost. Make sure server is running: python -m synkt.server"
        )
      }
    } catch {
      setError("Failed to connect to server")
    }

    return () => {
      eventSource?.close()
    }
  }, [url])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])

  const clearHistory = useCallback(() => {
    historyRef.current = []
    setTraceHistory([])
  }, [])

  return { traceData, topologyData, connected, error, traceHistory, clearHistory }
}
