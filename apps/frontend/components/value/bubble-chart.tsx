"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { Value, ValueType, getValueTypeLabel } from "./types";
import { ValueTypeBadge } from "./value-type-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, List, ZoomIn, ZoomOut, Maximize, Minimize, ChevronRight, FolderTree, Layers } from "lucide-react";

// Pastel color palette for value types (matching VALUE_TYPE_COLORS)
const TYPE_COLORS: Record<ValueType, { base: string; dark: string }> = {
  product: { base: "#93c5fd", dark: "#1e40af" },      // blue pastel -> dark blue
  service: { base: "#fde047", dark: "#a16207" },      // yellow pastel -> dark yellow
  relationship: { base: "#fca5a5", dark: "#991b1b" }, // red pastel -> dark red
  right: { base: "#d8b4fe", dark: "#6b21a8" },        // purple pastel -> dark purple
};

// Get color based on type and depth for better contrast between levels
const getNodeColor = (type: ValueType, depth: number): string => {
  const colors = TYPE_COLORS[type];
  const maxDepth = 6;
  const t = Math.min((depth - 1) / maxDepth, 1);

  const parseHex = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const base = parseHex(colors.base);
  const dark = parseHex(colors.dark);

  const r = Math.round(base.r + (dark.r - base.r) * t * 0.6);
  const g = Math.round(base.g + (dark.g - base.g) * t * 0.6);
  const b = Math.round(base.b + (dark.b - base.b) * t * 0.6);

  return `rgb(${r}, ${g}, ${b})`;
};

// Get stroke color (darker version) based on type and depth
const getStrokeColor = (type: ValueType, depth: number): string => {
  const colors = TYPE_COLORS[type];
  const maxDepth = 6;
  const t = Math.min((depth - 1) / maxDepth, 1);

  const parseHex = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const base = parseHex(colors.base);
  const dark = parseHex(colors.dark);

  const r = Math.round(base.r + (dark.r - base.r) * (t * 0.6 + 0.4));
  const g = Math.round(base.g + (dark.g - base.g) * (t * 0.6 + 0.4));
  const b = Math.round(base.b + (dark.b - base.b) * (t * 0.6 + 0.4));

  return `rgb(${r}, ${g}, ${b})`;
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
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [focusedNode, setFocusedNode] = useState<PackedNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [colorByType, setColorByType] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<PackedNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    const container = fullscreenContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const { width, height } = container.getBoundingClientRect();
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          }
        }
      }, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
        const scale = 2;
        const x = dimensions.width / 2 - found.x * scale;
        const y = dimensions.height / 2 - found.y * scale;

        d3.select(svg)
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

        setFocusedNode(found as PackedNode);
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

    setFocusedNode(node);
  }, [dimensions]);

  // Get ancestor path for breadcrumb
  const getAncestorPath = (node: PackedNode): PackedNode[] => {
    const path: PackedNode[] = [];
    let current: PackedNode | null = node;
    while (current && current.data.id !== "root") {
      path.unshift(current);
      current = current.parent as PackedNode | null;
    }
    return path;
  };

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
  const ancestorPath = focusedNode ? getAncestorPath(focusedNode) : [];

  return (
    <div ref={fullscreenContainerRef} className={`flex flex-col h-full ${isFullscreen ? "bg-background" : ""}`}>
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
          <Button variant="outline" size="icon" onClick={handleToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {onSwitchToList && !isFullscreen && (
          <Button variant="ghost" size="sm" onClick={onSwitchToList}>
            <List className="h-4 w-4 mr-2" />
            List view
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b text-sm">
        <span className="text-muted-foreground">Types:</span>
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full border"
              style={{ backgroundColor: colors.base, borderColor: colors.dark }}
            />
            <span className="capitalize">{type}</span>
          </div>
        ))}
        <span className="ml-auto text-muted-foreground text-xs">
          Zoom: {Math.round(currentScale * 100)}% | Drag to pan, scroll to zoom, click to focus
        </span>
      </div>

      {/* Main content: Chart + Details Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart - Left side */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-muted/20 overflow-hidden"
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
                      fill={colorByType ? getNodeColor(node.data.type, node.depth) : "#6b7280"}
                      fillOpacity={isFocusedNode ? 0.95 : 0.85}
                      stroke={isMatching ? "#ef4444" : isFocusedNode ? "#ffffff" : colorByType ? getStrokeColor(node.data.type, node.depth) : "#374151"}
                      strokeWidth={isMatching ? 4 : isFocusedNode ? 3 : 2}
                      strokeOpacity={isMatching || isFocusedNode ? 1 : 0.8}
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
                    className="px-1.5 py-0.5 rounded text-xs border"
                    style={{
                      backgroundColor: TYPE_COLORS[hoveredNode.data.type].base,
                      borderColor: TYPE_COLORS[hoveredNode.data.type].dark,
                      color: TYPE_COLORS[hoveredNode.data.type].dark,
                    }}
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

        {/* Details Panel - Right side */}
        <div className="w-80 border-l bg-background overflow-y-auto">
          {focusedNode && focusedNode.data.id !== "root" ? (
            <div className="p-4 space-y-4">
              {/* Breadcrumb */}
              {ancestorPath.length > 1 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
                  {ancestorPath.map((node, index) => (
                    <span key={node.data.id} className="flex items-center gap-1">
                      {index > 0 && <ChevronRight className="h-3 w-3" />}
                      <button
                        onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, node)}
                        className={`hover:text-foreground ${index === ancestorPath.length - 1 ? "text-foreground font-medium" : ""}`}
                      >
                        {node.data.name.length > 15 ? node.data.name.substring(0, 15) + "..." : node.data.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Main Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {focusedNode.data.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <ValueTypeBadge type={focusedNode.data.type} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focusedNode.data.description && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                      <p className="text-sm mt-1">{focusedNode.data.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Depth</label>
                      <p className="text-sm mt-1 flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Level {focusedNode.depth}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Children</label>
                      <p className="text-sm mt-1 flex items-center gap-1">
                        <FolderTree className="h-3 w-3" />
                        {focusedNode.children?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Children List */}
              {focusedNode.children && focusedNode.children.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Children ({focusedNode.children.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {focusedNode.children.map((child) => (
                        <button
                          key={child.data.id}
                          onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, child as PackedNode)}
                          className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between gap-2"
                        >
                          <span className="text-sm truncate">{child.data.name}</span>
                          <ValueTypeBadge type={child.data.type} className="text-xs shrink-0" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parent */}
              {focusedNode.parent && focusedNode.parent.data.id !== "root" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Parent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, focusedNode.parent as PackedNode)}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-sm truncate">{focusedNode.parent.data.name}</span>
                      <ValueTypeBadge type={focusedNode.parent.data.type} className="text-xs shrink-0" />
                    </button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a value</p>
              <p className="text-sm mt-1">Click on a bubble to view its details</p>
            </div>
          )}
        </div>
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
