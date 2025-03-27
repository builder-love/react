import { type DefaultTooltipContentProps } from 'recharts';

export interface StarsDataItem {
  name: string;
  stars: number;
  repos: number;
}

export interface LanguageItem {
  language_name: string;
  bytes: number;
  byte_dominance: number;
}

export type Payload = {
  dataKey: string;
  fill: string;
  legendType?: string;
  name: string;
  payload: LanguageItem;
  value: number;
  color?: string;
  stroke?: string;
};

export type TooltipProps = DefaultTooltipContentProps<number, string> & {
  payload?: Payload[];
  active?: boolean;
};

export interface CustomScatterData {
  project_name: string;
  contributor_count: number | null;
  stars_count: number | null;
  repo_count: number | null;
}

// Define the type for the data you expect from your API route
export interface TopForkData {
  project_title: string;
  latest_data_timestamp: string;
  forks: number;
}