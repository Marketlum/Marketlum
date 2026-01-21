import { FileUpload } from "@/components/files/types";

export type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
  image?: FileUpload | null;
  imageId?: string | null;
  children?: ValueStream[];
};
