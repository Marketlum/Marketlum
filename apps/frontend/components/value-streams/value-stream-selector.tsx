"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValueStream } from "./types";
import { ValueStreamIcon } from "./icons";
import api from "@/lib/api-sdk";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type FlatValueStream = {
  id: string;
  name: string;
  image?: { id: string; altText?: string | null } | null;
  depth: number;
};

function flattenValueStreams(
  streams: ValueStream[],
  depth: number = 0
): FlatValueStream[] {
  const result: FlatValueStream[] = [];
  for (const stream of streams) {
    result.push({
      id: stream.id,
      name: stream.name,
      image: stream.image,
      depth,
    });
    if (stream.children && stream.children.length > 0) {
      result.push(...flattenValueStreams(stream.children, depth + 1));
    }
  }
  return result;
}

export function ValueStreamSelector() {
  const router = useRouter();
  const params = useParams();
  const [valueStreams, setValueStreams] = useState<FlatValueStream[]>([]);
  const [loading, setLoading] = useState(true);

  const currentStreamId = params.id as string | undefined;

  useEffect(() => {
    api.getValueStreams()
      .then((data: ValueStream[]) => {
        setValueStreams(flattenValueStreams(data));
      })
      .catch((error) => {
        console.error("Error fetching value streams:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleValueChange = (id: string) => {
    router.push(`/value-streams/${id}`);
  };

  if (loading || valueStreams.length === 0) {
    return null;
  }

  const selectedStream = currentStreamId
    ? valueStreams.find((s) => s.id === currentStreamId)
    : null;

  return (
    <Select value={currentStreamId || ""} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select value stream">
          {selectedStream && (
            <span className="flex items-center gap-2">
              {selectedStream.image ? (
                <img
                  src={`${apiBaseUrl}/files/${selectedStream.image.id}/thumbnail`}
                  alt={selectedStream.image.altText || selectedStream.name}
                  className="h-4 w-4 rounded object-cover"
                />
              ) : (
                <ValueStreamIcon className="h-4 w-4" />
              )}
              <span className="truncate">{selectedStream.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {valueStreams.map((stream) => (
          <SelectItem key={stream.id} value={stream.id}>
            <span
              className="flex items-center gap-2"
              style={{ paddingLeft: `${stream.depth * 12}px` }}
            >
              {stream.image ? (
                <img
                  src={`${apiBaseUrl}/files/${stream.image.id}/thumbnail`}
                  alt={stream.image.altText || stream.name}
                  className="h-4 w-4 rounded object-cover"
                />
              ) : (
                <ValueStreamIcon className="h-4 w-4" />
              )}
              <span>{stream.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
