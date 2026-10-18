import type { BundleItem } from "./domain";
export type EditableBundle = {
  id: string;
  title: string;
  description: string;
  category: string;
  size: string;
  brand: string;
  condition: string;
  location: string;
  pickup: boolean;
  price_pence: number;
  items: BundleItem[];
  photos: { id: string; url: string }[];
};
