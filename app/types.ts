import { type DefaultTooltipContentProps } from 'recharts';

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
  stargaze_count: number | null;
  repo_count: number | null;
}

// Define the type for the forks data you expect from the API route
export interface TopForkData {
  project_title: string;
  latest_data_timestamp: string;
  fork_count: number;
}

// Define the type for the stars data you expect from the API route
export interface TopStarsData {
  project_title: string;
  latest_data_timestamp: string;
  stargaze_count: number;
}