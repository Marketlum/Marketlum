'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Maximize2, Minimize2 } from 'lucide-react';
import * as d3 from 'd3';
import type { ValueResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  abstract: boolean;
  connectionCount: number;
  agentName: string | null;
  valueStreamName: string | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  parentType: string | null;
}

const TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  product: { fill: '#dbeafe', stroke: '#93c5fd' },
  service: { fill: '#fef9c3', stroke: '#fde047' },
  relationship: { fill: '#fee2e2', stroke: '#fca5a5' },
  right: { fill: '#f3e8ff', stroke: '#d8b4fe' },
};

const GRID_SIZE = 40;

function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function buildGraph(values: ValueResponse[]) {
  const connectionCounts = new Map<string, number>();
  const parentLinks: { childId: string; parentId: string; parentType: string | null }[] = [];

  for (const v of values) {
    if (v.parent) {
      parentLinks.push({ childId: v.id, parentId: v.parent.id, parentType: v.parentType });
      connectionCounts.set(v.id, (connectionCounts.get(v.id) ?? 0) + 1);
      connectionCounts.set(v.parent.id, (connectionCounts.get(v.parent.id) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = values.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    abstract: v.abstract,
    connectionCount: connectionCounts.get(v.id) ?? 0,
    agentName: v.agent?.name ?? null,
    valueStreamName: (v as any).valueStream?.name ?? null,
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = parentLinks
    .filter((l) => nodeIds.has(l.childId) && nodeIds.has(l.parentId))
    .map((l) => ({
      source: l.childId,
      target: l.parentId,
      parentType: l.parentType,
    }));

  return { nodes, links };
}

export function ValuesNetworkGraph() {
  const t = useTranslations('values');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await api.get<PaginatedResponse<ValueResponse>>('/values?limit=10000');
        if (cancelled) return;
        const data = buildGraph(res.data);
        setGraphData(data);
      } catch {
        setGraphData({ nodes: [], links: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const { nodes, links } = graphData;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    // Defs: arrowhead + grid pattern
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'val-arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'hsl(var(--border))');

    const gridPattern = defs
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', GRID_SIZE)
      .attr('height', GRID_SIZE)
      .attr('patternUnits', 'userSpaceOnUse');

    gridPattern
      .append('path')
      .attr('d', `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.5);

    // Grid background — large enough to cover panning
    const gridExtent = 10000;
    const gridBg = svg
      .append('rect')
      .attr('x', -gridExtent / 2)
      .attr('y', -gridExtent / 2)
      .attr('width', gridExtent)
      .attr('height', gridExtent)
      .attr('fill', 'url(#grid-pattern)');

    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        gridBg.attr('transform', event.transform);
      });
    svg.call(zoom);

    svg.on('click', () => {
      linkGroup.attr('opacity', 1);
      linkLabelGroup.attr('opacity', 1);
      nodeGroup.attr('opacity', 1);
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(180),
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50));

    // Links
    const linkGroup = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#val-arrowhead)');

    // Link labels (parentType)
    const linkLabelGroup = g
      .append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => {
        if (d.parentType === 'part_of') return 'part of';
        if (d.parentType === 'on_top_of') return 'on top of';
        return '';
      })
      .attr('font-size', '9px')
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('text-anchor', 'middle');

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
        linkLabelGroup.attr('opacity', (l) => {
          const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : String(l.source);
          const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : String(l.target);
          return sourceId === d.id || targetId === d.id ? 1 : 0.15;
        });
      })
      .on('mouseenter', (event: MouseEvent, d: GraphNode) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
        const parts = [`<div class="font-semibold">${d.name}</div>`];
        parts.push(`<div class="text-xs text-muted-foreground">${d.type}${d.abstract ? ' (abstract)' : ''}</div>`);
        if (d.agentName) parts.push(`<div class="text-xs mt-1">${d.agentName}</div>`);
        if (d.valueStreamName) parts.push(`<div class="text-xs">${d.valueStreamName}</div>`);
        tooltip.innerHTML = parts.join('');
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
      .attr('r', (d) => clamp(10, 8 + d.connectionCount * 3, 24))
      .attr('fill', (d) => TYPE_COLORS[d.type]?.fill ?? '#6b7280')
      .attr('stroke', (d) => TYPE_COLORS[d.type]?.stroke ?? '#4b5563')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.abstract ? '4 2' : 'none'));

    // Node labels
    nodeGroup
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => clamp(10, 8 + d.connectionCount * 3, 24) + 14)
      .attr('font-size', '11px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-style', (d) => (d.abstract ? 'italic' : 'normal'));

    // Tick
    simulation.on('tick', () => {
      linkGroup
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      linkLabelGroup
        .attr('x', (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2 - 6);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

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
        className="relative overflow-hidden bg-background"
        style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 240px)', minHeight: 400 }}
      >
        <svg ref={svgRef} className="h-full w-full" />

        {/* Fullscreen toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 rounded-md border bg-background/90 p-2 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: '#dbeafe', borderColor: '#93c5fd' }} />
            <span>{t('typeProduct')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: '#fef9c3', borderColor: '#fde047' }} />
            <span>{t('typeService')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5' }} />
            <span>{t('typeRelationship')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }} />
            <span>{t('typeRight')}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 border-t pt-1">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground" />
            <span className="italic">{t('abstract')}</span>
          </div>
        </div>
      </Card>

      <div
        ref={tooltipRef}
        className="fixed z-50 hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
