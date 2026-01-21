"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { Value, ValueType, getValueTypeLabel } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, RotateCcw, List, ZoomIn, ZoomOut } from "lucide-react";

// Color palette for value types
const TYPE_COLORS: Record<ValueType, string> = {
  product: "#3b82f6", // blue
  service: "#22c55e", // green
  relationship: "#f59e0b", // amber
  right: "#8b5cf6", // purple
};

interface PackedNode extends d3.HierarchyCircularNode<Value> {
  data: Value;
}

type ValueBubbleChartProps = {
  values: Value[];
  onSwitchToList?: () => void;
};

export function ValueBubbleChart({ values, onSwitchToList }: ValueBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [focusedNode, setFocusedNode] = useState<PackedNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [colorByType, setColorByType] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<PackedNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Create a virtual root to handle multiple root values
  const rootData = useMemo((): Value => {
    return {
      id: "root",
      name: "All Values",
      type: "product" as ValueType,
      parentType: "on_top_of" as const,
      children: values,
    };
  }, [values]);

  // Calculate pack size based on data
  const packSize = useMemo(() => {
    const nodeCount = values.reduce((count, v) => {
      const countChildren = (node: Value): number => {
        return 1 + (node.children?.reduce((c, child) => c + countChildren(child), 0) || 0);
      };
      return count + countChildren(v);
    }, 0);
    // Scale pack size based on number of nodes
    const baseSize = Math.max(800, Math.min(3000, nodeCount * 100));
    return baseSize;
  }, [values]);

  // Build and pack hierarchy
  const root = useMemo(() => {
    const hierarchy = d3
      .hierarchy<Value>(rootData)
      .sum(() => 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const pack = d3
      .pack<Value>()
      .size([packSize, packSize])
      .padding(6);

    return pack(hierarchy);
  }, [rootData, packSize]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setDimensions({ width, height: Math.max(height, 400) });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize focused node to root
  useEffect(() => {
    if (root && !focusedNode) {
      setFocusedNode(root);
    }
  }, [root, focusedNode]);

  // Setup zoom behavior
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !root) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    zoomRef.current = zoom;
    d3.select(svg).call(zoom);

    // Initial transform to center the pack
    const initialScale = Math.min(
      dimensions.width / packSize,
      dimensions.height / packSize
    ) * 0.9;
    const initialX = (dimensions.width - packSize * initialScale) / 2;
    const initialY = (dimensions.height - packSize * initialScale) / 2;

    const initialTransform = d3.zoomIdentity
      .translate(initialX, initialY)
      .scale(initialScale);

    d3.select(svg).call(zoom.transform, initialTransform);

    return () => {
      d3.select(svg).on(".zoom", null);
    };
  }, [root, dimensions, packSize]);

  // Search matching nodes
  const matchingNodes = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase();
    const matches = new Set<string>();

    const searchNode = (node: d3.HierarchyCircularNode<Value>) => {
      if (node.data.name.toLowerCase().includes(query)) {
        matches.add(node.data.id);
      }
      node.children?.forEach(searchNode);
    };

    if (root) searchNode(root);
    return matches;
  }, [searchQuery, root]);

  // Reset view
  const handleResetView = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || !root) return;

    const initialScale = Math.min(
      dimensions.width / packSize,
      dimensions.height / packSize
    ) * 0.9;
    const initialX = (dimensions.width - packSize * initialScale) / 2;
    const initialY = (dimensions.height - packSize * initialScale) / 2;

    const initialTransform = d3.zoomIdentity
      .translate(initialX, initialY)
      .scale(initialScale);

    d3.select(svg)
      .transition()
      .duration(750)
      .call(zoom.transform, initialTransform);

    setFocusedNode(root);
  }, [dimensions, packSize, root]);

  // Zoom in
  const handleZoomIn = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg).transition().duration(300).call(zoom.scaleBy, 1.5);
  }, []);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg).transition().duration(300).call(zoom.scaleBy, 0.67);
  }, []);

  // Navigate to first search match
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (matchingNodes.size > 0 && root) {
      const svg = svgRef.current;
      const zoom = zoomRef.current;
      if (!svg || !zoom) return;

      const findNode = (node: d3.HierarchyCircularNode<Value>): PackedNode | null => {
        if (matchingNodes.has(node.data.id)) {
          return node as PackedNode;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findNode(root);
      if (found) {
        // Zoom to the found node
        const scale = 2;
        const x = dimensions.width / 2 - found.x * scale;
        const y = dimensions.height / 2 - found.y * scale;

        d3.select(svg)
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

        // Set parent as focused to show labels for siblings
        if (found.parent) {
          setFocusedNode(found.parent as PackedNode);
        }
      }
    }
  }, [matchingNodes, root, dimensions]);

  // Zoom to node on click
  const handleNodeClick = useCallback((event: React.MouseEvent, node: PackedNode) => {
    event.stopPropagation();
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;

    const scale = Math.min(4, dimensions.width / (node.r * 4));
    const x = dimensions.width / 2 - node.x * scale;
    const y = dimensions.height / 2 - node.y * scale;

    d3.select(svg)
      .transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

    // Set this node as focused to show labels for its children
    setFocusedNode(node);
  }, [dimensions]);

  // Render
  if (values.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-muted-foreground text-lg mb-4">No values yet</p>
        <Button onClick={onSwitchToList}>Create your first Value</Button>
      </div>
    );
  }

  const allNodes = root ? root.descendants() : [];
  const currentScale = transform.k;

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-4 p-4 border-b flex-wrap">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find value..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </form>

        <div className="flex items-center space-x-2">
          <Switch
            id="color-by-type"
            checked={colorByType}
            onCheckedChange={setColorByType}
          />
          <Label htmlFor="color-by-type">Color by type</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-labels"
            checked={showLabels}
            onCheckedChange={setShowLabels}
          />
          <Label htmlFor="show-labels">Show labels</Label>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {onSwitchToList && (
          <Button variant="ghost" size="sm" onClick={onSwitchToList}>
            <List className="h-4 w-4 mr-2" />
            List view
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b text-sm">
        <span className="text-muted-foreground">Types:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{type}</span>
          </div>
        ))}
        <span className="ml-auto text-muted-foreground text-xs">
          {focusedNode && focusedNode.data.id !== "root" && (
            <span className="mr-3">
              Focus: <span className="font-medium text-foreground">{focusedNode.data.name}</span>
            </span>
          )}
          Zoom: {Math.round(currentScale * 100)}% | Drag to pan, scroll to zoom, click to focus
        </span>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[400px] relative bg-muted/20 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ display: "block", cursor: "grab" }}
        >
          <g
            ref={gRef}
            transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
          >
            {allNodes.map((node) => {
              const isRoot = node.data.id === "root";
              const isMatching = matchingNodes.has(node.data.id);
              const scaledRadius = node.r * currentScale;

              // Show labels only for direct children of the focused node
              const isChildOfFocused = focusedNode && node.parent === focusedNode;
              const isFocusedNode = focusedNode === node;
              const shouldShowLabel = showLabels && scaledRadius > 15 && !isRoot && (isChildOfFocused || isFocusedNode);

              if (isRoot) return null;

              return (
                <g
                  key={node.data.id}
                  transform={`translate(${node.x},${node.y})`}
                  onClick={(e) => handleNodeClick(e, node as PackedNode)}
                  onMouseEnter={(e) => {
                    setHoveredNode(node as PackedNode);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={node.r}
                    fill={colorByType ? TYPE_COLORS[node.data.type] : "#6b7280"}
                    fillOpacity={isFocusedNode ? 0.9 : 0.7}
                    stroke={isMatching ? "#ef4444" : isFocusedNode ? "#ffffff" : colorByType ? TYPE_COLORS[node.data.type] : "#374151"}
                    strokeWidth={isMatching ? 4 : isFocusedNode ? 3 : 2}
                    strokeOpacity={isMatching || isFocusedNode ? 1 : 0.5}
                  />
                  {shouldShowLabel && (
                    <text
                      textAnchor="middle"
                      dy="0.3em"
                      style={{
                        fontSize: `${Math.max(8, Math.min(12, node.r / 6))}px`,
                        fill: "white",
                        pointerEvents: "none",
                        fontWeight: 500,
                        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                      }}
                    >
                      {node.data.name.length > Math.floor(node.r / 4)
                        ? node.data.name.substring(0, Math.max(3, Math.floor(node.r / 4) - 2)) + "..."
                        : node.data.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="fixed z-50 bg-popover border rounded-lg shadow-lg p-3 text-sm max-w-[250px] pointer-events-none"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y + 15,
            }}
          >
            <div className="font-semibold mb-1">{hoveredNode.data.name}</div>
            <div className="text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>Type:</span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: TYPE_COLORS[hoveredNode.data.type] }}
                >
                  {getValueTypeLabel(hoveredNode.data.type)}
                </span>
              </div>
              {hoveredNode.data.description && (
                <div className="line-clamp-2">
                  {hoveredNode.data.description}
                </div>
              )}
              <div>Children: {hoveredNode.children?.length || 0}</div>
              <div>Depth: {hoveredNode.depth}</div>
              <div className="text-xs mt-2 text-muted-foreground/70">
                Click to zoom to node
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance warning */}
      {allNodes.length > 2000 && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
          Large hierarchy ({allNodes.length} nodes) - labels may be hidden for performance
        </div>
      )}
    </div>
  );
}
