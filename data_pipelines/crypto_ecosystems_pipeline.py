# %%
import requests
import pandas as pd
import toml
import os
import sqlite3
import uuid

import os

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the database file one level up
db_path = os.path.join(current_dir, '..', 'crypto_ecosystems.db')

def get_github_folders(url):
  """
  Retrieves a list of folder names from a GitHub repository URL.

  Args:
    url: The URL of the GitHub repository.

  Returns:
    A list of folder names.
  """
  response = requests.get(url, headers={"Authorization": f"Bearer {os.getenv('go_blockchain_ecosystem')}"})
  response.raise_for_status()  # Raise an exception for bad status codes

  folders = []
  for item in response.json():
    if item['type'] == 'dir':
      folders.append(item['name'])
  return folders

def get_toml_files(url):
  """
  Retrieves a list of .toml files from a GitHub repository URL.

  Args:
    url: The URL of the GitHub repository.

  Returns:
    A list of .toml file names.
  """
  response = requests.get(url, headers={"Authorization": f"Bearer {os.getenv('go_blockchain_ecosystem')}"})
  response.raise_for_status()

  toml_files = []
  for item in response.json():
    if item['type'] == 'file' and item['name'].endswith('.toml'):
      toml_files.append(item['name'])
  return toml_files

def get_toml_data(url):
  """
  Retrieves and parses data from a .toml file at a given URL.

  Args:
    url: The URL of the .toml file.

  Returns:
    A dictionary containing the parsed data.
  """
  response = requests.get(url, headers={"Authorization": f"Bearer {os.getenv('go_blockchain_ecosystem')}"})
  response.raise_for_status()
  return toml.loads(response.text)

def main():
  """
  Main function to collect and process data from the GitHub repository.
  """
  base_url = "https://api.github.com/repos/electric-capital/crypto-ecosystems/contents/data/ecosystems"
  base_url_raw = "https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/master/data/ecosystems"
  folders = get_github_folders(base_url)

  all_data = []
  for folder in folders:
    # if folder == '1':  # Check if it's folder '8'
    #     break  # Exit the loop if it is
    folder_url = f"{base_url}/{folder}"
    toml_files = get_toml_files(folder_url)

    for toml_file in toml_files:
      file_url = f"{base_url_raw}/{folder}/{toml_file}"
      try:
        data = get_toml_data(file_url)
        data['folder'] = folder  # Add folder information
        data['file'] = toml_file  # Add file name
        all_data.append(data)
      except toml.TomlDecodeError as e:
        print(f"Error decoding TOML file {file_url}: {e}")
        
  return pd.DataFrame(all_data)
  # You can further process or save the dataframe as needed

# call main
df = main()
# write df to sqlite database locally
# # first create a lookup column that assigns a unique id to each row
df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]

# next create a sqlite table that contains the following columns:
# id
# title
# file
# folder
# drop the pandas index
# manually define column names. Use unpacked_df, which will be a df used for later database ops
unpacked_df = df[['id', 'title', 'file', 'folder']].copy()
unpacked_df.columns = ['project_id', 'project_name', 'file', 'folder']
unpacked_df.to_sql('crypto_ecosystems', con=sqlite3.connect(db_path), if_exists='replace', index=False)

# next, unpack the fields sub_ecosystems, github_organizations, repo into separate tables with the primary key being the id column
# and the foreign key being the id column in the crypto_ecosystems table

# the field sub_ecosystems contains a list of comma separated values
# the field github_organizations contains a list of comma separated values
# the field repo contain lists of dictionaries with the following key: url

# Function to unpack lists and create new rows
def unpack_list(row, column):
    org_id = row['id']
    title = row['title']
    github_orgs = row[column]
    data = []
    for org in github_orgs:
        data.append((org_id, title, org))  # Create a tuple for each value
    return data

########################## github_organizations
new_rows = df[['id', 'title', 'github_organizations']].apply(lambda row: unpack_list(row, 'github_organizations'), axis=1).explode()

# Create a new DataFrame from the unpacked data
unpacked_df = pd.DataFrame(new_rows.tolist(), columns=['id', 'title', 'github_organization'])

# drop rows where id is NaN
unpacked_df = unpacked_df[unpacked_df['id'].notna()]

# write unpacked_df to sqlite database locally
# manually define column names
unpacked_df.columns = ['project_id', 'project_name', 'github_org_url']
unpacked_df.to_sql('github_organizations', con=sqlite3.connect(db_path), if_exists='replace', index=False)

# sub_ecosystems
# remove df rows that contain empty sub ecosystem lists
df_ecosystems = df[df['sub_ecosystems'].apply(lambda x: len(x) > 0)]

# Apply the function to each row and explode the resulting list
new_rows = df_ecosystems[['id', 'title', 'sub_ecosystems']].apply(lambda row: unpack_list(row, 'sub_ecosystems'), axis=1).explode()

# Create a new DataFrame from the unpacked data
unpacked_df = pd.DataFrame(new_rows.tolist(), columns=['id', 'title', 'sub_ecosystems'])

# drop rows where id is NaN
unpacked_df = unpacked_df[unpacked_df['id'].notna()]

# write unpacked_df to sqlite database locally
# manually define column names
unpacked_df.columns = ['project_id', 'project_name', 'sub_ecosystems']
unpacked_df.to_sql('sub_ecosystems', con=sqlite3.connect(db_path), if_exists='replace', index=False)

# Function to unpack lists of dictionaries and create new rows
def unpack_list_of_dicts(row):
    org_id = row['id']
    title = row['title']
    org_repos = row['repo']
    data = []
    if isinstance(org_repos, list):  # Check if org_repos is a list
        for org in org_repos:
            if isinstance(org, dict) and 'url' in org:  # Check if org is a dictionary with 'url' key
                data.append((org_id, title, org['url']))
    return data

# Apply the function to each row and explode the resulting list
new_rows = df.apply(unpack_list_of_dicts, axis=1).explode()

# Create a new DataFrame from the unpacked data
unpacked_df = pd.DataFrame(new_rows.tolist(), columns=['id','title', 'url'])  # Use 'url' as column name

# write unpacked_df to sqlite database locally
# manually define column names
unpacked_df.columns = ['project_id', 'project_name', 'repo_url']
unpacked_df.to_sql('github_repos', con=sqlite3.connect(db_path), if_exists='replace', index=False)
