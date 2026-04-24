'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import type { ValueStreamTreeNode } from '@marketlum/shared';
import { Card } from '../ui/card';

interface ValueStreamCirclePackingProps {
  tree: ValueStreamTreeNode[];
}

interface CircleNode {
  id: string;
  name: string;
  children?: CircleNode[];
}

function toCircleData(nodes: ValueStreamTreeNode[]): CircleNode[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    children: n.children && n.children.length > 0 ? toCircleData(n.children) : undefined,
  }));
}

export function ValueStreamCirclePacking({ tree }: ValueStreamCirclePackingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || tree.length === 0) return;

    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 600;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Build hierarchy with synthetic root
    const rootData: CircleNode = { id: '', name: '', children: toCircleData(tree) };
    const root = d3
      .hierarchy(rootData)
      .sum(() => 1)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const pack = d3.pack<CircleNode>().size([width, height]).padding(4);
    const packed = pack(root) as d3.HierarchyCircularNode<CircleNode>;

    // Branding color scale by depth — primary teal through accent purple
    const color = d3.scaleLinear<string>()
      .domain([0, Math.max(packed.height, 1)])
      .range(['hsl(157, 72%, 40%)', 'hsl(260, 60%, 55%)'])
      .interpolate(d3.interpolateHsl);

    let focus = packed;
    let view: [number, number, number] = [packed.x, packed.y, packed.r * 2];

    // Create main group
    const g = svg.append('g');

    // Circles
    const node = g
      .selectAll<SVGCircleElement, d3.HierarchyCircularNode<CircleNode>>('circle')
      .data(packed.descendants())
      .join('circle')
      .attr('fill', (d) => d.children ? color(d.depth) : color(d.depth))
      .attr('fill-opacity', (d) => d.children ? 0.25 : 0.6)
      .attr('stroke', (d) => d.children ? color(d.depth) : 'none')
      .attr('stroke-width', (d) => d.children ? 1.5 : 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();

        // If it's a leaf node, navigate to detail page
        if (!d.children && d.data.id) {
          router.push(`/admin/value-streams/${d.data.id}`);
          return;
        }

        // Zoom into the clicked circle
        if (focus !== d) {
          zoom(d);
        }
      });

    // Labels
    const label = g
      .selectAll<SVGTextElement, d3.HierarchyCircularNode<CircleNode>>('text')
      .data(packed.descendants())
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => `${Math.min(d.r / 3, 14)}px`)
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none')
      .text((d) => d.data.name)
      .each(function (d) {
        // Hide label if circle is too small
        const textLen = this.getComputedTextLength();
        if (textLen > d.r * 1.8) {
          d3.select(this).attr('visibility', 'hidden');
        }
      });

    // Click on background to zoom out
    svg.on('click', () => zoom(packed));

    // Initial zoom
    zoomTo(view);

    function zoomTo(v: [number, number, number]) {
      const k = Math.min(width, height) / v[2];
      view = v;

      label
        .attr('transform', (d) => `translate(${(d.x - v[0]) * k + width / 2},${(d.y - v[1]) * k + height / 2})`)
        .each(function (d) {
          const r = d.r * k;
          const fontSize = Math.min(r / 3, 14);
          d3.select(this).attr('font-size', `${fontSize}px`);
          // Show/hide based on visible size
          const textLen = this.getComputedTextLength();
          d3.select(this).attr('visibility', textLen > r * 1.8 ? 'hidden' : 'visible');
        });

      node
        .attr('cx', (d) => (d.x - v[0]) * k + width / 2)
        .attr('cy', (d) => (d.y - v[1]) * k + height / 2)
        .attr('r', (d) => d.r * k);
    }

    function zoom(d: d3.HierarchyCircularNode<CircleNode>) {
      focus = d;

      const targetView: [number, number, number] = [d.x, d.y, d.r * 2];

      svg
        .transition()
        .duration(750)
        .tween('zoom', () => {
          const i = d3.interpolateZoom(view, targetView);
          return (t: number) => zoomTo(i(t) as [number, number, number]);
        });
    }

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          pack.size([w, h]);
          pack(root) as d3.HierarchyCircularNode<CircleNode>;
          zoomTo([focus.x, focus.y, focus.r * 2]);
        }
      }
    });
    resizeObserver.observe(svgEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [tree, router]);

  if (tree.length === 0) {
    return null;
  }

  return (
    <Card
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - 300px)', minHeight: 400 }}
    >
      <svg ref={svgRef} className="h-full w-full" />
    </Card>
  );
}
