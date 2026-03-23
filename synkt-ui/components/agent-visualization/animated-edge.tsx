"use client"

import { memo, useId } from "react"
import { cn } from "@/lib/utils"

export type EdgeStatus = "idle" | "active" | "error" | "loop"

export interface AnimatedEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  /** Outward normal direction at source border point */
  sourceNx?: number
  sourceNy?: number
  /** Outward normal direction at target border point */
  targetNx?: number
  targetNy?: number
  /** Perpendicular offset for parallel edges between the same node pair */
  parallelOffset?: number
  status?: EdgeStatus
  label?: string
  animateParticles?: boolean
  /** ID of the shared glow filter in the parent SVG */
  glowFilterId?: string
  className?: string
}

const statusStyles = {
  idle: {
    stroke: "rgba(255, 255, 255, 0.2)",
    strokeDasharray: "5,5",
    particleColor: "transparent",
  },
  active: {
    stroke: "#10b981",
    strokeDasharray: "none",
    particleColor: "#10b981",
  },
  error: {
    stroke: "#ef4444",
    strokeDasharray: "none",
    particleColor: "transparent",
  },
  loop: {
    stroke: "#f59e0b",
    strokeDasharray: "none",
    particleColor: "#f59e0b",
  },
}

export const AnimatedEdge = memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNx = 0,
  sourceNy = 0,
  targetNx = 0,
  targetNy = 0,
  parallelOffset = 0,
  status = "idle",
  label,
  animateParticles = true,
  glowFilterId,
  className,
}: AnimatedEdgeProps) {
  const uniqueId = useId()
  const pathId = `path-${id}-${uniqueId}`
  const { stroke, strokeDasharray, particleColor } = statusStyles[status]

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Perpendicular unit vector for offsetting parallel edges
  const perpX = distance > 0 ? -dy / distance : 0
  const perpY = distance > 0 ? dx / distance : 0

  // Apply parallel offset to source/target positions
  const sx = sourceX + perpX * parallelOffset
  const sy = sourceY + perpY * parallelOffset
  const tx = targetX + perpX * parallelOffset
  const ty = targetY + perpY * parallelOffset

  // Control point offset scales with distance — edges flow outward from each node's
  // border along the normal before curving toward the other node.
  const cpOffset = Math.max(30, Math.min(80, distance * 0.35))

  const controlX1 = sx + sourceNx * cpOffset + perpX * parallelOffset * 0.5
  const controlY1 = sy + sourceNy * cpOffset + perpY * parallelOffset * 0.5
  const controlX2 = tx + targetNx * cpOffset + perpX * parallelOffset * 0.5
  const controlY2 = ty + targetNy * cpOffset + perpY * parallelOffset * 0.5

  const pathD = `M ${sx} ${sy} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${tx} ${ty}`

  // Arrow direction: angle at target (from last control point into target)
  const arrowAngle = Math.atan2(ty - controlY2, tx - controlX2)
  const arrowLen = 10
  const ax1 = tx - arrowLen * Math.cos(arrowAngle - Math.PI / 6)
  const ay1 = ty - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
  const ax2 = tx - arrowLen * Math.cos(arrowAngle + Math.PI / 6)
  const ay2 = ty - arrowLen * Math.sin(arrowAngle + Math.PI / 6)

  // Label position: midpoint of the curve
  const midT = 0.5
  const labelX = Math.pow(1-midT, 3) * sx + 3*Math.pow(1-midT, 2)*midT * controlX1 + 3*(1-midT)*midT*midT * controlX2 + midT*midT*midT * tx
  const labelY = Math.pow(1-midT, 3) * sy + 3*Math.pow(1-midT, 2)*midT * controlY1 + 3*(1-midT)*midT*midT * controlY2 + midT*midT*midT * ty

  const glowFilter = glowFilterId ? `url(#${glowFilterId})` : undefined

  return (
    <g className={className}>
      {/* Main path */}
      <path
        id={pathId}
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        filter={(status === "active" || status === "loop") ? glowFilter : undefined}
        className={cn(status === "loop" && "animate-pulse")}
      />

      {/* Arrow marker - rotated to match edge direction */}
      <polygon
        points={`${ax1},${ay1} ${tx},${ty} ${ax2},${ay2}`}
        fill={stroke}
      />

      {/* Edge label */}
      {label && distance > 80 && (
        <g>
          <rect
            x={labelX - label.length * 3.5 - 6}
            y={labelY - 10}
            width={label.length * 7 + 12}
            height={20}
            rx={6}
            fill="rgba(26, 26, 26, 0.9)"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={1}
          />
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize={11}
            fontFamily="monospace"
          >
            {label}
          </text>
        </g>
      )}

      {/* Animated particles for active/loop states */}
      {animateParticles && (status === "active" || status === "loop") && (
        <>
          {[0, 0.33, 0.66].map((offset, i) => (
            <circle
              key={i}
              r={4}
              fill={particleColor}
              filter={glowFilter}
              className="opacity-0"
              style={{
                offsetPath: `path("${pathD}")`,
                animation: `particle-flow 1.5s ease-in-out ${offset * 1.5}s infinite`,
              }}
            />
          ))}
        </>
      )}
    </g>
  )
})
