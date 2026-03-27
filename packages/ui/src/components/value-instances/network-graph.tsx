'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type { AgentResponse, ValueInstanceResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Card } from '../ui/card';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  connectionCount: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  name: string;
  valueName: string;
  fromAgentName: string;
  toAgentName: string;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  organization: { fill: '#93c5fd', stroke: '#60a5fa' },
  individual: { fill: '#86efac', stroke: '#4ade80' },
  virtual: { fill: '#d8b4fe', stroke: '#c084fc' },
};

function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function buildGraph(agents: AgentResponse[], valueInstances: ValueInstanceResponse[]) {
  const connected = valueInstances.filter((vi) => vi.fromAgent && vi.toAgent);
  if (connected.length === 0) {
    return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
  }

  const connectionCounts = new Map<string, number>();
  for (const vi of connected) {
    const fromId = vi.fromAgent!.id;
    const toId = vi.toAgent!.id;
    connectionCounts.set(fromId, (connectionCounts.get(fromId) ?? 0) + 1);
    connectionCounts.set(toId, (connectionCounts.get(toId) ?? 0) + 1);
  }

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const nodes: GraphNode[] = [];
  for (const [id, count] of connectionCounts) {
    const agent = agentMap.get(id);
    if (agent) {
      nodes.push({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        connectionCount: count,
      });
    }
  }

  const links: GraphLink[] = connected.map((vi) => ({
    source: vi.fromAgent!.id,
    target: vi.toAgent!.id,
    name: vi.name,
    valueName: vi.value.name,
    fromAgentName: vi.fromAgent!.name,
    toAgentName: vi.toAgent!.name,
  }));

  return { nodes, links };
}

export function NetworkGraph() {
  const t = useTranslations('valueInstances');
  const ta = useTranslations('agents');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);

  // Effect 1: Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [agentsRes, viRes] = await Promise.all([
          api.get<PaginatedResponse<AgentResponse>>('/agents?limit=10000'),
          api.get<PaginatedResponse<ValueInstanceResponse>>('/value-instances?limit=10000'),
        ]);

        if (cancelled) return;

        const data = buildGraph(agentsRes.data, viRes.data);
        setGraphData(data);
      } catch {
        setGraphData({ nodes: [], links: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Effect 2: Render D3 graph once data is loaded and SVG is in the DOM
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const { nodes, links } = graphData;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    // Defs for arrowhead markers
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'hsl(var(--border))');

    // Container group for zoom/pan
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Click on background to reset highlight
    svg.on('click', () => {
      linkGroup.attr('opacity', 1);
      nodeGroup.attr('opacity', 1);
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(150),
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    // Links
    const linkGroup = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseenter', (event: MouseEvent, d: GraphLink) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
        tooltip.innerHTML = `
          <div class="font-semibold">${d.name}</div>
          <div class="text-xs text-muted-foreground">${d.valueName}</div>
          <div class="text-xs mt-1">${d.fromAgentName} → ${d.toAgentName}</div>
        `;
      })
      .on('mousemove', (event: MouseEvent) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
      })
      .on('mouseleave', () => {
        const tooltip = tooltipRef.current;
        if (tooltip) tooltip.style.display = 'none';
      });

    // Node groups
    const nodeGroup = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: GraphNode) => {
        event.stopPropagation();
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        for (const link of links) {
          const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : String(link.source);
          const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : String(link.target);
          if (sourceId === d.id) connectedIds.add(targetId);
          if (targetId === d.id) connectedIds.add(sourceId);
        }

        nodeGroup.attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15));
        linkGroup.attr('opacity', (l) => {
          const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : String(l.source);
          const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : String(l.target);
          return sourceId === d.id || targetId === d.id ? 1 : 0.15;
        });
      })
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circles
    nodeGroup
      .append('circle')
      .attr('r', (d) => clamp(8, 6 + d.connectionCount * 3, 24))
      .attr('fill', (d) => NODE_COLORS[d.type]?.fill ?? '#6b7280')
      .attr('stroke', (d) => NODE_COLORS[d.type]?.stroke ?? '#4b5563')
      .attr('stroke-width', 2);

    // Node labels
    nodeGroup
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => clamp(8, 6 + d.connectionCount * 3, 24) + 14)
      .attr('font-size', '11px')
      .attr('fill', 'hsl(var(--foreground))');

    // Tick
    simulation.on('tick', () => {
      linkGroup
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        simulation.force('center', d3.forceCenter(w / 2, h / 2));
        simulation.alpha(0.3).restart();
      }
    });
    resizeObserver.observe(svgEl);

    return () => {
      resizeObserver.disconnect();
      simulation.stop();
    };
  }, [graphData]);

  if (loading) {
    return (
      <Card className="flex items-center justify-center" style={{ height: 'calc(100vh - 240px)', minHeight: 400 }}>
        <p className="text-muted-foreground">{t('graphLoading')}</p>
      </Card>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card className="flex items-center justify-center" style={{ height: 'calc(100vh - 240px)', minHeight: 400 }}>
        <p className="text-muted-foreground">{t('graphNoData')}</p>
      </Card>
    );
  }

  return (
    <>
      <Card
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: 'calc(100vh - 240px)', minHeight: 400 }}
      >
        <svg ref={svgRef} className="h-full w-full" />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 rounded-md border bg-background/90 p-2 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#93c5fd' }} />
            <span>{ta('typeOrganization')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#86efac' }} />
            <span>{ta('typeIndividual')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#d8b4fe' }} />
            <span>{ta('typeVirtual')}</span>
          </div>
        </div>
      </Card>

      {/* Tooltip (rendered in fixed position outside Card to avoid clipping) */}
      <div
        ref={tooltipRef}
        className="fixed z-50 hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
