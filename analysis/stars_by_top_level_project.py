# connect to the crypto_ecosystems.db sqlite db
import sqlite3
import pandas as pd

# connect to the crypto_ecosystems.db sqlite db
conn = sqlite3.connect('crypto_ecosystems.db')
cursor = conn.cursor()

# count stars by top level project
cursor.execute('''-- stars by project
with project_stars as (select project_id, sum(stargazerCount)  project_stargaze_count from github_repos_stars_view group by project_id order by project_stargaze_count desc),

project_repos as (select project_id, count(repo_url) project_repo_count from github_repos group by project_id)

select ce.project_name, pr.project_repo_count, gv.project_stargaze_count
from crypto_ecosystems ce  LEFT JOIN project_stars gv
	on ce.project_id = gv.project_id LEFT JOIN project_repos pr
	on ce.project_id = pr.project_id
order by gv.project_stargaze_count DESC''')

rows = cursor.fetchall()

# convert rows to a pandas dataframe
df = pd.DataFrame(rows, columns=['project_name', 'project_repo_count', 'project_stargaze_count'])

# create a csv of the top 50 crypto projects by stargaze count
df.head(50).to_csv('top_50_crypto_projects_by_stargaze_count.csv', index=False)
