'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type {
  ExchangeResponse,
  ExchangeFlowResponse,
  PaginatedResponse,
} from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Card } from '../ui/card';
import { usePipelines } from '../../hooks/use-pipelines';
import { useValueStreams } from '../../hooks/use-value-streams';
import { useChannels } from '../../hooks/use-channels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// --- Types ---

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  connectionCount: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  fromAgentId: string;
  toAgentId: string;
  valueType: string;
  flowCount: number;
  fromAgentName: string;
  toAgentName: string;
}

// --- Constants ---

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  organization: { fill: '#93c5fd', stroke: '#60a5fa' },
  individual: { fill: '#86efac', stroke: '#4ade80' },
  virtual: { fill: '#d8b4fe', stroke: '#c084fc' },
};

const VALUE_TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  product: { fill: '#dbeafe', stroke: '#93c5fd' },
  service: { fill: '#fef9c3', stroke: '#fde047' },
  relationship: { fill: '#fee2e2', stroke: '#fca5a5' },
  right: { fill: '#f3e8ff', stroke: '#d8b4fe' },
};

const PARTICLE_COLOR: Record<string, string> = {
  product: '#93c5fd',
  service: '#fde68a',
  relationship: '#fca5a5',
  right: '#d8b4fe',
};

function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// --- Graph Builder ---

function buildGraph(
  flows: ExchangeFlowResponse[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  if (flows.length === 0) return { nodes: [], links: [] };

  // Aggregate flows by (fromAgent, toAgent, valueType)
  const edgeMap = new Map<string, GraphLink>();
  const agentMap = new Map<string, { id: string; name: string; type: string }>();
  const connectionCounts = new Map<string, number>();

  for (const flow of flows) {
    const valueType = flow.value?.type ?? 'unknown';
    const key = `${flow.fromAgent.id}::${flow.toAgent.id}::${valueType}`;

    agentMap.set(flow.fromAgent.id, flow.fromAgent);
    agentMap.set(flow.toAgent.id, flow.toAgent);

    connectionCounts.set(flow.fromAgent.id, (connectionCounts.get(flow.fromAgent.id) ?? 0) + 1);
    connectionCounts.set(flow.toAgent.id, (connectionCounts.get(flow.toAgent.id) ?? 0) + 1);

    const existing = edgeMap.get(key);
    if (existing) {
      existing.flowCount += 1;
    } else {
      edgeMap.set(key, {
        source: flow.fromAgent.id,
        target: flow.toAgent.id,
        fromAgentId: flow.fromAgent.id,
        toAgentId: flow.toAgent.id,
        valueType,
        flowCount: 1,
        fromAgentName: flow.fromAgent.name,
        toAgentName: flow.toAgent.name,
      });
    }
  }

  const nodes: GraphNode[] = [];
  for (const [id, agent] of agentMap) {
    nodes.push({
      id,
      name: agent.name,
      type: agent.type,
      connectionCount: connectionCounts.get(id) ?? 0,
    });
  }

  const links = [...edgeMap.values()];

  return { nodes, links };
}

// --- Component ---

export function ExchangeFlowGraph() {
  const t = useTranslations('exchanges');
  const ta = useTranslations('agents');
  const tv = useTranslations('values');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);

  // Filters
  const [pipelineId, setPipelineId] = useState<string>('');
  const [valueStreamId, setValueStreamId] = useState<string>('');
  const [channelId, setChannelId] = useState<string>('');
  const { pipelines } = usePipelines();
  const { valueStreams } = useValueStreams();
  const { channels } = useChannels();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build search query
      const params = new URLSearchParams({ limit: '10000' });
      if (pipelineId) params.set('pipelineId', pipelineId);
      if (valueStreamId) params.set('valueStreamId', valueStreamId);
      if (channelId) params.set('channelId', channelId);

      // Fetch exchanges matching filters
      const exchangesRes = await api.get<PaginatedResponse<ExchangeResponse>>(
        `/exchanges/search?${params}`,
      );

      // Fetch flows for each exchange in parallel
      const allFlows: ExchangeFlowResponse[] = [];
      const flowPromises = exchangesRes.data.map(async (exchange) => {
        const flows = await api.get<ExchangeFlowResponse[]>(
          `/exchanges/${exchange.id}/flows`,
        );
        return flows;
      });

      const results = await Promise.all(flowPromises);
      for (const flows of results) {
        allFlows.push(...flows);
      }

      const data = buildGraph(allFlows);
      setGraphData(data);
    } catch {
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [pipelineId, valueStreamId, channelId]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    let cancelled = false;

    fetchData().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // Render D3 graph
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const { nodes, links } = graphData;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

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
      particleGroup.attr('opacity', 1);
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

    // Compute offsets for parallel edges between same agent pair
    const pairEdgeCounts = new Map<string, number>();
    const pairEdgeIndex = new Map<string, number>();
    for (const link of links) {
      const pairKey = [link.fromAgentId, link.toAgentId].sort().join('::');
      pairEdgeCounts.set(pairKey, (pairEdgeCounts.get(pairKey) ?? 0) + 1);
    }
    const edgeOffsets: number[] = [];
    for (const link of links) {
      const pairKey = [link.fromAgentId, link.toAgentId].sort().join('::');
      const total = pairEdgeCounts.get(pairKey) ?? 1;
      const idx = pairEdgeIndex.get(pairKey) ?? 0;
      pairEdgeIndex.set(pairKey, idx + 1);
      const offset = total === 1 ? 0 : (idx - (total - 1) / 2) * 12;
      edgeOffsets.push(offset);
    }

    // Links
    const linkGroup = g
      .append('g')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => PARTICLE_COLOR[d.valueType] ?? '#6b7280')
      .attr('stroke-width', (d) => clamp(1.5, d.flowCount * 1.5, 8))
      .attr('stroke-opacity', 0.6)
      .on('mouseenter', (event: MouseEvent, d: GraphLink) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
        tooltip.innerHTML = `
          <div class="font-semibold">${d.fromAgentName} → ${d.toAgentName}</div>
          <div class="text-xs text-muted-foreground">${d.valueType}</div>
          <div class="text-xs mt-1">${d.flowCount} ${t('flowCount')}</div>
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
        particleGroup.attr('opacity', (l) => {
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

    // Animated particles
    const particleGroup = g
      .append('g')
      .selectAll<SVGCircleElement, GraphLink>('circle')
      .data(links)
      .join('circle')
      .attr('r', 3)
      .attr('fill', (d) => PARTICLE_COLOR[d.valueType] ?? '#6b7280');

    // Path computation helper for curved links
    function computePath(d: GraphLink, idx: number): string {
      const s = d.source as GraphNode;
      const t = d.target as GraphNode;
      const sx = s.x ?? 0;
      const sy = s.y ?? 0;
      const tx = t.x ?? 0;
      const ty = t.y ?? 0;
      const offset = edgeOffsets[idx];

      if (offset === 0) {
        return `M${sx},${sy}L${tx},${ty}`;
      }

      // Compute perpendicular offset for curved path
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const mx = (sx + tx) / 2 + nx * offset;
      const my = (sy + ty) / 2 + ny * offset;

      return `M${sx},${sy}Q${mx},${my} ${tx},${ty}`;
    }

    // Animation loop for particles
    let animationId: number;
    const startTime = Date.now();

    function animateParticles() {
      const elapsed = (Date.now() - startTime) / 1000;

      particleGroup.each(function (d, i) {
        const s = d.source as GraphNode;
        const tNode = d.target as GraphNode;
        const sx = s.x ?? 0;
        const sy = s.y ?? 0;
        const tx = tNode.x ?? 0;
        const ty = tNode.y ?? 0;
        const offset = edgeOffsets[i];

        // Particle position along path (0 to 1, looping)
        const speed = 0.3;
        const progress = (elapsed * speed) % 1;

        let px: number;
        let py: number;

        if (offset === 0) {
          px = sx + (tx - sx) * progress;
          py = sy + (ty - sy) * progress;
        } else {
          // Quadratic bezier interpolation
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const mx = (sx + tx) / 2 + nx * offset;
          const my = (sy + ty) / 2 + ny * offset;

          const t2 = progress;
          const t1 = 1 - t2;
          px = t1 * t1 * sx + 2 * t1 * t2 * mx + t2 * t2 * tx;
          py = t1 * t1 * sy + 2 * t1 * t2 * my + t2 * t2 * ty;
        }

        d3.select(this).attr('cx', px).attr('cy', py);
      });

      animationId = requestAnimationFrame(animateParticles);
    }

    animateParticles();

    // Tick
    simulation.on('tick', () => {
      linkGroup.attr('d', (d, i) => computePath(d, i));
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
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      simulation.stop();
    };
  }, [graphData, t]);

  if (loading) {
    return (
      <>
        <Filters
          t={t}
          tv={tv}
          pipelineId={pipelineId}
          setPipelineId={setPipelineId}
          valueStreamId={valueStreamId}
          setValueStreamId={setValueStreamId}
          channelId={channelId}
          setChannelId={setChannelId}
          pipelines={pipelines}
          valueStreams={valueStreams}
          channels={channels}
        />
        <Card className="flex items-center justify-center" style={{ height: 'calc(100vh - 300px)', minHeight: 400 }}>
          <p className="text-muted-foreground">{t('flowGraphLoading')}</p>
        </Card>
      </>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <>
        <Filters
          t={t}
          tv={tv}
          pipelineId={pipelineId}
          setPipelineId={setPipelineId}
          valueStreamId={valueStreamId}
          setValueStreamId={setValueStreamId}
          channelId={channelId}
          setChannelId={setChannelId}
          pipelines={pipelines}
          valueStreams={valueStreams}
          channels={channels}
        />
        <Card className="flex items-center justify-center" style={{ height: 'calc(100vh - 300px)', minHeight: 400 }}>
          <p className="text-muted-foreground">{t('flowGraphNoData')}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <Filters
        t={t}
        tv={tv}
        pipelineId={pipelineId}
        setPipelineId={setPipelineId}
        valueStreamId={valueStreamId}
        setValueStreamId={setValueStreamId}
        channelId={channelId}
        setChannelId={setChannelId}
        pipelines={pipelines}
        valueStreams={valueStreams}
        channels={channels}
      />
      <Card
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: 'calc(100vh - 300px)', minHeight: 400 }}
      >
        <svg ref={svgRef} className="h-full w-full" />

        {/* Agent type legend */}
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

        {/* Value type legend */}
        <div className="absolute bottom-3 right-3 rounded-md border bg-background/90 p-2 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: PARTICLE_COLOR.product }} />
            <span>{tv('typeProduct')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: PARTICLE_COLOR.service }} />
            <span>{tv('typeService')}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: PARTICLE_COLOR.relationship }} />
            <span>{tv('typeRelationship')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: PARTICLE_COLOR.right }} />
            <span>{tv('typeRight')}</span>
          </div>
        </div>
      </Card>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}

// --- Filter Bar ---

interface FilterProps {
  t: ReturnType<typeof useTranslations>;
  tv: ReturnType<typeof useTranslations>;
  pipelineId: string;
  setPipelineId: (v: string) => void;
  valueStreamId: string;
  setValueStreamId: (v: string) => void;
  channelId: string;
  setChannelId: (v: string) => void;
  pipelines: { id: string; name: string; color: string }[];
  valueStreams: { id: string; name: string }[];
  channels: { id: string; name: string }[];
}

function Filters({
  t,
  pipelineId,
  setPipelineId,
  valueStreamId,
  setValueStreamId,
  channelId,
  setChannelId,
  pipelines,
  valueStreams,
  channels,
}: FilterProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Select value={pipelineId} onValueChange={(v) => setPipelineId(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('allPipelines')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('allPipelines')}</SelectItem>
          {pipelines.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={valueStreamId} onValueChange={(v) => setValueStreamId(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('allValueStreams')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('allValueStreams')}</SelectItem>
          {valueStreams.map((vs) => (
            <SelectItem key={vs.id} value={vs.id}>
              {vs.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={channelId} onValueChange={(v) => setChannelId(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('allChannels')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('allChannels')}</SelectItem>
          {channels.map((ch) => (
            <SelectItem key={ch.id} value={ch.id}>
              {ch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
