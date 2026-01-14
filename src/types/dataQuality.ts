export interface CatalogDistribution {
  id: string;
  title: string;
  description?: string;
  accessURL: string;
  downloadURL?: string;
  format?: string;
  mediaType?: string;
  byteSize?: number;
  dataset: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface CatalogDataset {
  id: string;
  title: string;
  description?: string;
  distributions: CatalogDistribution[];
  theme?: string[];
  keywords?: string[];
  publisher?: string;
  issued?: string;
  modified?: string;
}
