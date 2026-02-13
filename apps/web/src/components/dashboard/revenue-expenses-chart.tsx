'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type { DashboardTimeSeriesPoint } from '@marketlum/shared';
import { Card } from '@/components/ui/card';

interface Props {
  data: DashboardTimeSeriesPoint[];
}

export function RevenueExpensesChart({ data }: Props) {
  const t = useTranslations('dashboard');
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(0);

  // Track container width via ResizeObserver
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

  // Draw chart whenever data or dimensions change
  useEffect(() => {
    if (!svgRef.current || data.length === 0 || svgWidth === 0) return;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgEl.clientHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const periods = data.map((d) => d.period);
    const maxAmount = d3.max(data, (d) =>
      Math.max(parseFloat(d.revenue), parseFloat(d.expenses)),
    ) || 0;

    // X scale — band for periods
    const x0 = d3.scaleBand().domain(periods).range([0, width]).padding(0.3);
    const x1 = d3
      .scaleBand()
      .domain(['revenue', 'expenses'])
      .range([0, x0.bandwidth()])
      .padding(0.1);

    // Y scale
    const y = d3
      .scaleLinear()
      .domain([0, maxAmount * 1.1 || 1])
      .nice()
      .range([height, 0]);

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

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0))
      .selectAll('text')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '11px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '11px');

    // Style axis lines
    g.selectAll('.domain').attr('stroke', 'hsl(var(--border))');
    g.selectAll('.tick line').attr('stroke', 'hsl(var(--border))');

    const colors = { revenue: '#10b981', expenses: '#f43f5e' };

    // Bars
    const barGroups = g
      .selectAll('.bar-group')
      .data(data)
      .join('g')
      .attr('class', 'bar-group')
      .attr('transform', (d) => `translate(${x0(d.period)},0)`);

    // Revenue bars
    barGroups
      .append('rect')
      .attr('x', () => x1('revenue')!)
      .attr('y', (d) => y(parseFloat(d.revenue)))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => height - y(parseFloat(d.revenue)))
      .attr('fill', colors.revenue)
      .attr('rx', 2)
      .on('mouseenter', (event: MouseEvent, d: DashboardTimeSeriesPoint) => {
        showTooltip(event, d);
      })
      .on('mousemove', (event: MouseEvent) => {
        moveTooltip(event);
      })
      .on('mouseleave', hideTooltip);

    // Expense bars
    barGroups
      .append('rect')
      .attr('x', () => x1('expenses')!)
      .attr('y', (d) => y(parseFloat(d.expenses)))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => height - y(parseFloat(d.expenses)))
      .attr('fill', colors.expenses)
      .attr('rx', 2)
      .on('mouseenter', (event: MouseEvent, d: DashboardTimeSeriesPoint) => {
        showTooltip(event, d);
      })
      .on('mousemove', (event: MouseEvent) => {
        moveTooltip(event);
      })
      .on('mouseleave', hideTooltip);

    function showTooltip(event: MouseEvent, d: DashboardTimeSeriesPoint) {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY - 12}px`;
      tooltip.innerHTML = `
        <div class="font-semibold">${d.period}</div>
        <div class="text-xs"><span style="color:${colors.revenue}">${t('revenue')}:</span> ${d.revenue}</div>
        <div class="text-xs"><span style="color:${colors.expenses}">${t('expenses')}:</span> ${d.expenses}</div>
      `;
    }

    function moveTooltip(event: MouseEvent) {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY - 12}px`;
    }

    function hideTooltip() {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.style.display = 'none';
    }
  }, [data, svgWidth, t]);

  if (data.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('noData')}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        <svg ref={svgRef} className="w-full" style={{ height: 350 }} />
        {/* Legend */}
        <div className="absolute top-3 right-3 flex items-center gap-4 rounded-md border bg-background/90 px-3 py-1.5 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
            <span>{t('revenue')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#f43f5e' }} />
            <span>{t('expenses')}</span>
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
