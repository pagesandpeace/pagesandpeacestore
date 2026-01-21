export type RowStatus = "unclassified" | "classified" | "ignored";

export type NormalisedRow = {
  id: string;
  raw_name: string;
  quantity: number;
  status: RowStatus;
  category: string | null;
};

export type GroupedRow = {
  raw_name: string;
  rows: NormalisedRow[];
  eventCount: number;
  unitCount: number;
};
