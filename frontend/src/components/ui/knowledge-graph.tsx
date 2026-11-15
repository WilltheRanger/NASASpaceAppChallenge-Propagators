/**
 * Knowledge Graph — adapted from 21st.dev "Knowledge Graph" by heygaia
 * (https://21st.dev/@heygaia/components/knowledge-graph).
 * Original: d3 force-directed graph with zoom, pan, drag, tooltips, a type legend and
 * SVG/PNG export. Changes for Anchor: colours come from props/CSS variables (no hashed
 * rainbow), labels can be longer and sit beside the node, link labels use the theme's
 * muted colour, and node size can carry meaning. The simulation, zoom, drag and export
 * code are the original's.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
  size?: number
  color?: string
  sub?: string
}
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  label?: string
  strength?: number
  color?: string
}
export interface KnowledgeGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  typeColors?: Record<string, string>
  onNodeClick?: (node: GraphNode) => void
  showLegend?: boolean
  showLinkLabels?: boolean
  centerNodeId?: string
  className?: string
}
export interface KnowledgeGraphHandle { exportAsSVG: () => void; exportAsPNG: () => void; resetZoom: () => void }

const formatTypeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, KnowledgeGraphProps>(
  ({ nodes, links, typeColors = {}, onNodeClick, showLegend = true, showLinkLabels = true, centerNodeId, className = '' }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
    const [tooltip, setTooltip] = useState({ x: 0, y: 0, content: '', visible: false })
    const legend = Object.entries(typeColors).map(([type, color]) => ({ type: formatTypeLabel(type), color }))

    const exportAsSVG = useCallback(() => {
      if (!svgRef.current) return
      const data = new XMLSerializer().serializeToString(svgRef.current)
      const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }))
      const a = document.createElement('a'); a.href = url; a.download = 'anchor-graph.svg'; a.click(); URL.revokeObjectURL(url)
    }, [])
    const exportAsPNG = useCallback(() => {
      if (!svgRef.current) return
      const { width, height } = svgRef.current.getBoundingClientRect()
      const canvas = document.createElement('canvas'); canvas.width = width * 2; canvas.height = height * 2
      const ctx = canvas.getContext('2d'); ctx?.scale(2, 2)
      const img = new window.Image()
      img.onload = () => { ctx?.drawImage(img, 0, 0, width, height); canvas.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'anchor-graph.png'; a.click(); URL.revokeObjectURL(u) }, 'image/png') }
      img.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml;charset=utf-8' }))
    }, [])
    const resetZoom = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity) }, [])
    useImperativeHandle(ref, () => ({ exportAsSVG, exportAsPNG, resetZoom }))

    useEffect(() => {
      if (!svgRef.current || !containerRef.current || nodes.length === 0) return
      const container = containerRef.current
      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()
      const width = container.clientWidth, height = container.clientHeight
      const color = (n: GraphNode) => n.color || typeColors[n.type] || '#8a8f98'
      const nodesCopy: GraphNode[] = nodes.map((n) => ({ ...n, size: n.size || 14 }))
      const linksCopy: GraphLink[] = links.map((l) => ({ ...l }))
      const centre = centerNodeId ? nodesCopy.find((n) => n.id === centerNodeId) : null
      if (centre) { centre.fx = width / 2; centre.fy = height / 2 }
      const simulation = d3.forceSimulation<GraphNode>(nodesCopy)
        .force('link', d3.forceLink<GraphNode, GraphLink>(linksCopy).id((d) => d.id).distance(120).strength((d) => d.strength || 0.7))
        .force('charge', d3.forceManyBody().strength(-520))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide<GraphNode>().radius((d) => (d.size || 14) + 26))
      const g = svg.append('g')
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on('zoom', (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => g.attr('transform', e.transform.toString()))
      zoomRef.current = zoom
      svg.call(zoom)
      const link = g.selectAll<SVGLineElement, GraphLink>('.link').data(linksCopy).join('line').attr('class', 'link')
        .attr('stroke', (d) => d.color || 'var(--kg-link, #6b7280)').attr('stroke-opacity', 0.7).attr('stroke-width', 1.4)
      const linkLabel = showLinkLabels
        ? g.selectAll<SVGTextElement, GraphLink>('.link-label').data(linksCopy.filter((l) => l.label)).join('text').attr('class', 'link-label')
          .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-family', 'var(--kg-mono, monospace)').attr('fill', 'var(--kg-muted, #9ca3af)').text((d) => d.label || '')
        : null
      const nodeGroup = g.selectAll<SVGGElement, GraphNode>('.node-group').data(nodesCopy).join('g').attr('class', 'node-group').style('cursor', 'pointer')
        .call(d3.drag<SVGGElement, GraphNode>()
          .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); if (d.id !== centerNodeId) { d.fx = null; d.fy = null } }))
      nodeGroup.append('circle').attr('r', (d) => d.size || 14).attr('fill', (d) => color(d)).attr('fill-opacity', 0.18).attr('stroke', (d) => color(d)).attr('stroke-width', 1.6)
      nodeGroup.append('circle').attr('r', 3.2).attr('fill', (d) => color(d))
      nodeGroup.append('text').attr('x', (d) => (d.size || 14) + 8).attr('dy', '-0.1em').attr('font-size', '12px').attr('font-weight', 600).attr('fill', 'var(--kg-text, #fff)').attr('pointer-events', 'none').text((d) => d.label)
      nodeGroup.append('text').attr('x', (d) => (d.size || 14) + 8).attr('dy', '1.15em').attr('font-size', '10px').attr('font-family', 'var(--kg-mono, monospace)').attr('fill', 'var(--kg-muted, #9ca3af)').attr('pointer-events', 'none').text((d) => d.sub ?? formatTypeLabel(d.type))
      nodeGroup
        .on('click', (_e: MouseEvent, d: GraphNode) => onNodeClick?.(d))
        .on('mouseover', (e: MouseEvent, d: GraphNode) => { const [x, y] = d3.pointer(e, container); setTooltip({ x: x + 10, y: y - 10, content: `${d.label} · ${d.sub ?? formatTypeLabel(d.type)}`, visible: true }) })
        .on('mouseout', () => setTooltip((p) => ({ ...p, visible: false })))
      simulation.on('tick', () => {
        link.attr('x1', (d) => (d.source as GraphNode).x ?? 0).attr('y1', (d) => (d.source as GraphNode).y ?? 0).attr('x2', (d) => (d.target as GraphNode).x ?? 0).attr('y2', (d) => (d.target as GraphNode).y ?? 0)
        linkLabel?.attr('x', (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2).attr('y', (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2 - 4)
        nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })
      return () => { simulation.stop() }
    }, [nodes, links, typeColors, onNodeClick, showLinkLabels, centerNodeId])

    return (
      <div className={cn('relative h-full w-full min-h-[360px]', className)}>
        <div ref={containerRef} className="h-full w-full">
          <svg ref={svgRef} width="100%" height="100%" role="img" aria-label="Graph of satellites, regions, datasets and checks" style={{ background: 'var(--kg-bg, #18181b)', borderRadius: 'var(--kg-radius, 12px)' }} />
        </div>
        {tooltip.visible && (
          <div className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs shadow-lg" style={{ left: tooltip.x, top: tooltip.y, background: 'var(--kg-tip-bg, #27272a)', color: 'var(--kg-tip-fg, #f4f4f5)', border: '1px solid var(--kg-line, #3f3f46)' }}>{tooltip.content}</div>
        )}
        {showLegend && legend.length > 0 && (
          <div className="absolute right-3 top-3 z-10 space-y-1.5 rounded-md p-2.5" style={{ background: 'var(--kg-panel, rgba(39,39,42,0.9))', border: '1px solid var(--kg-line, #3f3f46)' }}>
            {legend.map((i) => (
              <div key={i.type} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} /><span className="text-[11px]" style={{ color: 'var(--kg-muted, #d4d4d8)' }}>{i.type}</span></div>
            ))}
          </div>
        )}
      </div>
    )
  },
)
KnowledgeGraph.displayName = 'KnowledgeGraph'
export default KnowledgeGraph
