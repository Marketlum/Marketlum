"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crop, Maximize, Palette, Loader2 } from "lucide-react";
import { FileUpload } from "./types";

type ImageEditorProps = {
  file: FileUpload;
  apiBaseUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrop: (data: { x: number; y: number; width: number; height: number }) => Promise<void>;
  onResize: (data: { width?: number; height?: number; keepAspectRatio?: boolean }) => Promise<void>;
  onGrayscale: () => Promise<void>;
};

export function ImageEditor({
  file,
  apiBaseUrl,
  open,
  onOpenChange,
  onCrop,
  onResize,
  onGrayscale,
}: ImageEditorProps) {
  const [activeTab, setActiveTab] = useState("crop");
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop state
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(file.width || 100);
  const [cropHeight, setCropHeight] = useState(file.height || 100);

  // Resize state
  const [resizeWidth, setResizeWidth] = useState(file.width || 100);
  const [resizeHeight, setResizeHeight] = useState(file.height || 100);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const aspectRatio = file.width && file.height ? file.width / file.height : 1;

  // Image ref for preview
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when file changes
  useEffect(() => {
    setCropX(0);
    setCropY(0);
    setCropWidth(file.width || 100);
    setCropHeight(file.height || 100);
    setResizeWidth(file.width || 100);
    setResizeHeight(file.height || 100);
  }, [file.id]);

  // Update resize dimensions maintaining aspect ratio
  const handleResizeWidthChange = (value: number) => {
    setResizeWidth(value);
    if (keepAspectRatio && file.width && file.height) {
      setResizeHeight(Math.round(value / aspectRatio));
    }
  };

  const handleResizeHeightChange = (value: number) => {
    setResizeHeight(value);
    if (keepAspectRatio && file.width && file.height) {
      setResizeWidth(Math.round(value * aspectRatio));
    }
  };

  const handleCrop = async () => {
    setIsProcessing(true);
    try {
      await onCrop({ x: cropX, y: cropY, width: cropWidth, height: cropHeight });
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResize = async () => {
    setIsProcessing(true);
    try {
      await onResize({ width: resizeWidth, height: resizeHeight, keepAspectRatio });
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrayscale = async () => {
    setIsProcessing(true);
    try {
      await onGrayscale();
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image: {file.originalName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            <img
              ref={imageRef}
              src={`${apiBaseUrl}/files/${file.id}/preview`}
              alt={file.originalName}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="crop" className="flex items-center gap-2">
                <Crop className="h-4 w-4" />
                Crop
              </TabsTrigger>
              <TabsTrigger value="resize" className="flex items-center gap-2">
                <Maximize className="h-4 w-4" />
                Resize
              </TabsTrigger>
              <TabsTrigger value="grayscale" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Grayscale
              </TabsTrigger>
            </TabsList>

            {/* Crop tab */}
            <TabsContent value="crop" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the crop coordinates and dimensions. The origin (0, 0) is the top-left corner.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cropX">X Position</Label>
                  <Input
                    id="cropX"
                    type="number"
                    min={0}
                    max={file.width || 1000}
                    value={cropX}
                    onChange={(e) => setCropX(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="cropY">Y Position</Label>
                  <Input
                    id="cropY"
                    type="number"
                    min={0}
                    max={file.height || 1000}
                    value={cropY}
                    onChange={(e) => setCropY(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="cropWidth">Width</Label>
                  <Input
                    id="cropWidth"
                    type="number"
                    min={1}
                    max={file.width || 1000}
                    value={cropWidth}
                    onChange={(e) => setCropWidth(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="cropHeight">Height</Label>
                  <Input
                    id="cropHeight"
                    type="number"
                    min={1}
                    max={file.height || 1000}
                    value={cropHeight}
                    onChange={(e) => setCropHeight(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              {file.width && file.height && (
                <p className="text-xs text-muted-foreground">
                  Original dimensions: {file.width} x {file.height}
                </p>
              )}
              <Button
                onClick={handleCrop}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crop className="mr-2 h-4 w-4" />
                    Apply Crop
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Resize tab */}
            <TabsContent value="resize" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter new dimensions for the image.
              </p>
              <div className="flex items-center space-x-2">
                <Switch
                  id="aspectRatio"
                  checked={keepAspectRatio}
                  onCheckedChange={setKeepAspectRatio}
                />
                <Label htmlFor="aspectRatio">Keep aspect ratio</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resizeWidth">Width</Label>
                  <Input
                    id="resizeWidth"
                    type="number"
                    min={1}
                    value={resizeWidth}
                    onChange={(e) => handleResizeWidthChange(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="resizeHeight">Height</Label>
                  <Input
                    id="resizeHeight"
                    type="number"
                    min={1}
                    value={resizeHeight}
                    onChange={(e) => handleResizeHeightChange(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              {file.width && file.height && (
                <p className="text-xs text-muted-foreground">
                  Original dimensions: {file.width} x {file.height}
                </p>
              )}
              <Button
                onClick={handleResize}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Maximize className="mr-2 h-4 w-4" />
                    Apply Resize
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Grayscale tab */}
            <TabsContent value="grayscale" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Convert the image to grayscale. This will create a new black and white version of the image.
              </p>
              <Button
                onClick={handleGrayscale}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Palette className="mr-2 h-4 w-4" />
                    Convert to Grayscale
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center">
            Note: Editing will create a new file. The original file will be preserved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
