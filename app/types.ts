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
  [projectTitle: string]: number | string | null | undefined;
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

// top_projects data structure 
export interface TopProjects {
  project_title: string;
  latest_data_timestamp: string;
  contributor_count: number | null;
  contributor_count_pct_change_over_4_weeks: number | null;
  repo_count: number | null;
  fork_count: number | null;
  fork_count_pct_change_over_4_weeks: number | null;
  stargaze_count: number | null;
  stargaze_count_pct_change_over_4_weeks: number | null;
  commit_count: number | null;
  commit_count_pct_change_over_4_weeks: number | null;
  watcher_count: number | null;
  watcher_count_pct_change_over_4_weeks: number | null;
  is_not_fork_ratio: number | null;
  is_not_fork_ratio_pct_change_over_4_weeks: number | null;
  project_rank: number | null;
  prior_4_weeks_project_rank: number | null;
  absolute_project_rank_change_over_4_weeks: number | null;
  rank_of_project_rank_change_over_4_weeks: number | null;
  quartile_bucket: number | null;
  project_rank_category: string | null;
  weighted_score_index: number | null;
  weighted_score_sma: number | null;
  prior_4_weeks_weighted_score: number | null;
}

// type for Project Organization Data
// make all types nullable since we may not find any orgs for a given project
export interface ProjectOrganizationData {
  project_title: string | null; 
  project_organization_url: string | null;
  latest_data_timestamp: string | null; 
  org_rank: number | null;
  org_rank_category: string | null;
  weighted_score_index: number | null; 
}

// Define the interface for the top projects trends data you expect from the API route
// for the top 50 chart
export interface Top50ProjectsTrendsData {
  project_title: string;
  report_date: string;
  weighted_score_index: number;
  repo_count: number | null;
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

// Define a type for project trend data points based on the project_trend Pydantic model
// for individual project trend charts
export interface ProjectTrendsData {
  project_title: string;
  report_date: string; 
  latest_data_timestamp: string;
  contributor_count: number | null;
  contributor_count_rank: number | null;
  contributor_count_pct_change_over_4_weeks: number | null;
  contributor_count_pct_change_over_4_weeks_rank: number | null;
  repo_count: number | null;
  fork_count: number | null;
  fork_count_pct_change_over_4_weeks: number | null;
  fork_count_rank: number | null;
  fork_count_pct_change_over_4_weeks_rank: number | null;
  stargaze_count: number | null;
  stargaze_count_pct_change_over_4_weeks: number | null;
  stargaze_count_rank: number | null;
  stargaze_count_pct_change_over_4_weeks_rank: number | null;
  commit_count: number | null;
  commit_count_pct_change_over_4_weeks: number | null;
  commit_count_rank: number | null;
  commit_count_pct_change_over_4_weeks_rank: number | null;
  watcher_count: number | null;
  watcher_count_pct_change_over_4_weeks: number | null;
  watcher_count_rank: number | null;
  watcher_count_pct_change_over_4_weeks_rank: number | null;
  is_not_fork_ratio: number | null;
  is_not_fork_ratio_pct_change_over_4_weeks: number | null;
  is_not_fork_ratio_rank: number | null;
  is_not_fork_ratio_pct_change_over_4_weeks_rank: number | null;
  quartile_project_rank: number | null;
  overall_project_rank: number | null;
}

export interface RepoData {
  project_title: string; 
  latest_data_timestamp: string;
  repo: string | null; 
  fork_count: number | null;
  stargaze_count: number | null;
  watcher_count: number | null;
  weighted_score_index: number | null;
  repo_rank: number | null;
  quartile_bucket: number | null;
  repo_rank_category: string | null;
  predicted_is_dev_tooling: boolean | null;
  predicted_is_educational: boolean | null;
  predicted_is_scaffold: boolean | null;
  predicted_is_app: boolean | null;
  predicted_is_infrastructure: boolean | null;
}

export interface PaginatedRepos {
  items: RepoData[];
  total_items: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Define the type for the enhanced top projects trends data you expect from the API route
export type EnhancedTopProjectsTrendsData = Top50ProjectsTrendsData & {
  [key: string]: string | number | null | undefined; // Index signature to allow dynamic access like item[selectedMetric]
}

// Define the top 100 Contributor interface based on API
export interface Top100Contributor {
  contributor_login: string;
  is_anon: boolean | null;
  dominant_language: string | null;
  location: string | null;
  contributor_html_url: string | null;
  total_repos_contributed_to: number | null;
  total_contributions: number | null;
  contributions_to_og_repos: number | null;
  normalized_total_repo_quality_weighted_contribution_score_rank: number | null;
  followers_total_count: number | null;
  weighted_score_index: number | null;
  contributor_rank: number | null;
  latest_data_timestamp: string | null;
}