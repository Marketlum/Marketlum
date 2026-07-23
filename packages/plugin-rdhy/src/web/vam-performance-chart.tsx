'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type {
  RdhyVamMonthlyActual,
  RdhyVamPerformanceMilestone,
} from '../shared/vam-performance';

interface Props {
  milestones: RdhyVamPerformanceMilestone[];
  monthlyActuals: RdhyVamMonthlyActual[];
  windowStart: string;
  windowEnd: string;
  /** Plan and actual share a unit only when the agreement is COMPARABLE. */
  showPlan: boolean;
}

/** End of a 'YYYY-MM' bucket, clamped to the evaluation cutoff. */
function bucketDate(month: string, windowEnd: Date): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  const end = new Date(year, monthNumber, 0, 23, 59, 59);
  return end.getTime() > windowEnd.getTime() ? windowEnd : end;
}

/** Cumulative plan-vs-actual line chart, following the d3 idiom of the
 * dashboard's RevenueExpensesChart (ResizeObserver + tooltip div). */
export function VamPerformanceChart({
  milestones,
  monthlyActuals,
  windowStart,
  windowEnd,
  showPlan,
}: Props) {
  const t = useTranslations('plugin.rdhy.vam.performance');
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(0);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(entry.contentRect.width);
      }
    });
    observer.observe(svgEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || svgWidth === 0) return;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgEl.clientHeight - margin.top - margin.bottom;
    if (width <= 0 || height <= 0) return;

    const start = new Date(windowStart);
    const end = new Date(windowEnd);

    const planPoints: Array<{ date: Date; value: number }> = showPlan
      ? [
          { date: start, value: 0 },
          ...milestones.map((m) => ({
            date: new Date(m.dueDate),
            value: Number(m.targetCumulative),
          })),
        ]
      : [];
    const actualPoints = monthlyActuals.map((bucket) => ({
      date: bucketDate(bucket.month, end),
      value: Number(bucket.cumulative),
      month: bucket.month,
      revenue: bucket.revenue,
    }));

    const lastDue = milestones.length
      ? new Date(milestones[milestones.length - 1].dueDate)
      : end;
    const xMax = lastDue.getTime() > end.getTime() ? lastDue : end;
    const yMax =
      d3.max([...planPoints.map((p) => p.value), ...actualPoints.map((p) => p.value)]) || 0;

    const x = d3.scaleTime().domain([start, xMax]).range([0, width]);
    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.1 || 1])
      .nice()
      .range([height, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-opacity', 0.5);
    g.select('.grid .domain').remove();

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
      .selectAll('text')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '11px');
    g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '11px');
    g.selectAll('.domain').attr('stroke', 'hsl(var(--border))');
    g.selectAll('.tick line').attr('stroke', 'hsl(var(--border))');

    const colors = { plan: 'hsl(var(--muted-foreground))', actual: '#10b981' };

    // Milestone due-date markers
    for (const milestone of milestones) {
      const dueX = x(new Date(milestone.dueDate));
      g.append('line')
        .attr('x1', dueX)
        .attr('x2', dueX)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', 'hsl(var(--border))')
        .attr('stroke-dasharray', '2,3');
    }

    // Evaluation-cutoff marker
    g.append('line')
      .attr('x1', x(end))
      .attr('x2', x(end))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-opacity', 0.7);

    // Plan: targets accrue at their due dates — a step line
    if (planPoints.length > 1) {
      const planLine = d3
        .line<{ date: Date; value: number }>()
        .x((p) => x(p.date))
        .y((p) => y(p.value))
        .curve(d3.curveStepAfter);
      g.append('path')
        .datum(planPoints)
        .attr('fill', 'none')
        .attr('stroke', colors.plan)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3')
        .attr('d', planLine);
    }

    // Actual cumulative revenue
    if (actualPoints.length > 0) {
      const actualLine = d3
        .line<{ date: Date; value: number }>()
        .x((p) => x(p.date))
        .y((p) => y(p.value));
      g.append('path')
        .datum([{ date: start, value: 0, month: '', revenue: '0' }, ...actualPoints])
        .attr('fill', 'none')
        .attr('stroke', colors.actual)
        .attr('stroke-width', 2)
        .attr('d', actualLine);

      g.selectAll('.actual-point')
        .data(actualPoints)
        .join('circle')
        .attr('class', 'actual-point')
        .attr('cx', (p) => x(p.date))
        .attr('cy', (p) => y(p.value))
        .attr('r', 3)
        .attr('fill', colors.actual)
        .on('mouseenter', (event: MouseEvent, p) => {
          const tooltip = tooltipRef.current;
          if (!tooltip) return;
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.clientX + 12}px`;
          tooltip.style.top = `${event.clientY - 12}px`;
          tooltip.innerHTML = `
            <div class="font-semibold">${p.month}</div>
            <div class="text-xs">${Number(p.value).toLocaleString('en-US')}</div>
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
    }
  }, [milestones, monthlyActuals, windowStart, windowEnd, showPlan, svgWidth]);

  return (
    <>
      <div className="relative overflow-hidden rounded-md border">
        <svg ref={svgRef} className="w-full" style={{ height: 280 }} />
        <div className="absolute top-3 right-3 flex items-center gap-4 rounded-md border bg-background/90 px-3 py-1.5 text-xs backdrop-blur-sm">
          {showPlan && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{ borderTop: '2px dashed hsl(var(--muted-foreground))' }}
              />
              <span>{t('chartPlan')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#10b981' }} />
            <span>{t('chartActual')}</span>
          </div>
        </div>
      </div>
      <div
        ref={tooltipRef}
        className="fixed z-50 hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
