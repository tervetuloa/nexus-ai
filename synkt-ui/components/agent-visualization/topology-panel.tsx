"use client"

import { memo } from "react"
import { AlertTriangle, CircleDot, GitFork, Route, Shield, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TopologyData } from "@/hooks/use-trace-stream"

export interface TopologyPanelProps {
  topology: TopologyData | null
  className?: string
}

function IssueRow({ icon: Icon, label, items, color }: {
  icon: React.ElementType
  label: string
  items: string[] | string[][]
  color: string
}) {
  if (!items || items.length === 0) return null

  const formattedItems = items.map((item) =>
    Array.isArray(item) ? item.join(" → ") : item
  )

  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center gap-2 text-[13px] font-medium", color)}>
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <span className={cn(
          "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-semibold px-1.5",
          color.includes("red") && "bg-red-500/20",
          color.includes("amber") && "bg-amber-500/20",
          color.includes("purple") && "bg-purple-500/20",
          color.includes("orange") && "bg-orange-500/20",
        )}>
          {items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-5">
        {formattedItems.map((item, i) => (
          <span
            key={i}
            className="rounded-md bg-white/5 border border-white/8 px-2 py-0.5 text-[12px] font-mono text-white/70"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export const TopologyPanel = memo(function TopologyPanel({
  topology,
  className,
}: TopologyPanelProps) {
  if (!topology) return null

  const hasIssues = topology.has_issues

  return (
    <div
      className={cn(
        "w-[260px] rounded-2xl border",
        "backdrop-blur-[20px] shadow-[0_12px_48px_rgba(0,0,0,0.5)]",
        "animate-[fade-in-up_0.3s_ease-out] overflow-hidden",
        hasIssues
          ? "border-accent-red/30 bg-[rgba(36,36,36,0.95)]"
          : "border-accent-green/30 bg-[rgba(36,36,36,0.9)]",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2.5 px-5 py-3.5 border-b",
        hasIssues
          ? "border-red-500/20 bg-red-500/5"
          : "border-green-500/20 bg-green-500/5"
      )}>
        {hasIssues ? (
          <AlertTriangle className="h-4 w-4 text-accent-red" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-accent-green" />
        )}
        <span className={cn(
          "text-[13px] font-semibold",
          hasIssues ? "text-accent-red" : "text-accent-green"
        )}>
          {hasIssues ? "Structural Issues Found" : "Graph Valid"}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5">
        {hasIssues ? (
          <>
            <IssueRow
              icon={GitFork}
              label="Unbounded Cycles"
              items={topology.unbounded_cycles}
              color="text-accent-red"
            />
            <IssueRow
              icon={CircleDot}
              label="Dead-End Nodes"
              items={topology.dead_end_nodes}
              color="text-accent-amber"
            />
            <IssueRow
              icon={Shield}
              label="Unreachable Nodes"
              items={topology.unreachable_nodes}
              color="text-purple-400"
            />
            <IssueRow
              icon={Route}
              label="No Path to END"
              items={topology.missing_end_paths}
              color="text-orange-400"
            />
          </>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-white/60 py-1">
            <ShieldCheck className="h-4 w-4 text-accent-green" />
            <span>No structural issues detected.</span>
          </div>
        )}

        {/* Node count */}
        <div className="pt-2 border-t border-white/8">
          <div className="flex items-center justify-between text-[12px] text-white/40">
            <span>{topology.nodes.length} nodes</span>
            <span>{topology.edges.length} edges</span>
          </div>
        </div>
      </div>
    </div>
  )
})
