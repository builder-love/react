import os
import requests

# get gh pat for api
gh_pat = os.environ.get("go_blockchain_ecosystem")

headers = {'Authorization': f'token {gh_pat}'}

owner = 'jup-ag'
# repo = 'v4-core'

# url = f'https://api.github.com/repos/{owner}/{repo}/languages'
# response = requests.get(url, headers=headers)

# languages = response.json()

# # Print the languages and their byte counts
# for language, bytes in languages.items():
#   print(f'{language}: {bytes} bytes')

# Get the list of repositories
url = f'https://api.github.com/users/{owner}/repos'
response = requests.get(url, headers=headers)
repos = response.json()

language_stats = {}

# Iterate through the repositories and get language data
for repo in repos:
  repo_name = repo['name']
  languages_url = f'https://api.github.com/repos/{owner}/{repo_name}/languages'
  languages_response = requests.get(languages_url, headers=headers)
  languages = languages_response.json()

  # Aggregate language data
  for language, bytes in languages.items():
    language_stats[language] = language_stats.get(language, 0) + bytes

# Calculate language distribution
total_bytes = sum(language_stats.values())
for language, bytes in language_stats.items():
  percentage = (bytes / total_bytes) * 100
  print(f'{language}: {percentage:.2f}%')