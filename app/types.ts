import { type DefaultTooltipContentProps } from 'recharts';

export interface StarsDataItem {
  name: string;
  stars: number;
  forks: number;
}

export interface ForksDataItem {
  name: string;
  forks: number;
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