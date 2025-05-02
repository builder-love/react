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

// Define a type for the transformed data structure suitable for the LineChart
export interface FormattedLineChartData {
  report_date: string;
  [projectTitle: string]: number | string;
}

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

// Define the type for the top projects trends data you expect from the API route
export interface TopProjectsTrendsData {
  project_title: string;
  report_date: string;
  weighted_score_index: number;
  fork_count: number | null;
  stargaze_count: number | null;
  commit_count: number | null;
  contributor_count: number | null;
  watcher_count: number | null;
  is_not_fork_ratio: number | null;
  commit_count_pct_change_over_4_weeks: number | null;
  contributor_count_pct_change_over_4_weeks: number | null;
  fork_count_pct_change_over_4_weeks: number | null;
  stargaze_count_pct_change_over_4_weeks: number | null; 
  watcher_count_pct_change_over_4_weeks: number | null;
  is_not_fork_ratio_pct_change_over_4_weeks: number | null; 
  project_rank_category: string;
}