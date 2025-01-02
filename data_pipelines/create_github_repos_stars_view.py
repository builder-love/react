
import sqlite3
import pandas as pd
import os

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the database file one level up
db_path = os.path.join(current_dir, '..', 'crypto_ecosystems.db')

# connect to the crypto_ecosystems.db sqlite db
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# query the crypto_ecosystems.db sqlite db
# create a new view called github_repos_stars_view
# the view is the github_stars table with two new columns: repo_url and project_id
# repo_url is the concatenation of the string "https://github.com/" and the nameWithOwner column from the github_stars table
# project_id is the project_id from the github_repos table
cursor.execute('''CREATE VIEW github_repos_stars_view AS
SELECT 
    gs.*,  -- Select all columns from github_stars
    'https://github.com/' || gs.nameWithOwner AS repo_url,  -- Concatenate to create repo_url
    gr.project_id  -- Select project_id from github_repos
FROM 
    github_stars gs
JOIN 
    github_repos gr ON 'https://github.com/' || gs.nameWithOwner = gr.repo_url;''')
