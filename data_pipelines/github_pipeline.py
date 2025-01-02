import sqlite3
import pandas as pd
import os
import requests

# get gh pat for api
gh_pat = os.environ.get("go_blockchain_ecosystem")
headers = {'Authorization': f'token {gh_pat}'}

# connect to the crypto_ecosystems.db database
conn = sqlite3.connect('crypto_ecosystems.db')

# get the first record from the github_organizations table
df = pd.read_sql_query('SELECT * FROM github_organizations LIMIT 1', conn)

# get the project_id and org_url, and extract the organization name from the URL
project_id = df['project_id'].iloc[0]
project_name = df['project_name'].iloc[0]
org_url = df['github_org_url'].iloc[0]
org_name = org_url.split('/')[-1]

# Get the list of repositories for the org
url = f'https://api.github.com/users/{org_name}/repos'
response = requests.get(url, headers=headers)
repos = response.json()

# Iterate through the repositories and get language data
repo_languages = []  # Use a list to store dictionaries
for repo in repos:
    repo_name = repo['name']
    languages_url = f'https://api.github.com/repos/{org_name}/{repo_name}/languages'
    languages_response = requests.get(languages_url, headers=headers)
    languages = languages_response.json()

    # create a dictionary with project_id, org_url, repo_name, language, and bytes
    # create new records for each language 
    for language, bytes in languages.items():
        repo_languages.append({
            'project_id': project_id,
            'project_name': project_name,
            'repo_name': repo_name, 
            'language': language,
            'bytes': bytes
        })

# write the dictionary to a pandas dataframe
df = pd.DataFrame(repo_languages)

# print the dataframe
print(df)

# Aggregate language data
# create a dictionary with the language as the key and the bytes as the value
# for language, bytes in languages.items():
#     language_stats[language] = language_stats.get(language, 0) + bytes