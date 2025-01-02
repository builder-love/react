import sqlite3
import pandas as pd
import requests
import os
import time
from datetime import datetime
import pytz

gh_pat = os.environ.get("go_blockchain_ecosystem")

def fetch_repo_data(repo_names):
    """
    Fetches data for multiple repositories using a single GraphQL query.

    Args:
      repo_names: A list of repository names in the format "owner/repo".

    Returns:
      A tuple containing:
        - data: The JSON response data.
        - rate_limit_info: A dictionary containing rate limit information.
    """

    # extract the repo names from repo_names list
    # only get the repo name from the url: everything after https://github.com/
    repo_names = [url.split("https://github.com/")[1] for url in repo_names]

    try:
        # Construct the GraphQL query with multiple repositories
        query = """
          query {
            %s
          }
        """ % '\n'.join([
            f'repo{i}: repository(owner: "{repo.split("/")[0]}", name: "{repo.split("/")[1]}") '
            f'{{ nameWithOwner stargazerCount }}'
            for i, repo in enumerate(repo_names)
        ])

        # Prepare the request headers with your GitHub PAT
        headers = {"Authorization": f"Bearer {gh_pat}"}

        # Make the GraphQL API request
        response = requests.post('https://api.github.com/graphql', json={'query': query}, headers=headers)
        # if the response is not 200, print the error and print the headers
        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(response.headers)
            raise Exception(f"Error: {response.status_code}")

        # Extract rate limit information from headers
        print(" \n resource usage tracking:")
        rate_limit_info = {
            'remaining': response.headers['x-ratelimit-remaining'],
            'used': response.headers['x-ratelimit-used']
        }

        return response.json(), rate_limit_info

    except requests.exceptions.RequestException as e:
        print(f"Error fetching repository data: {e}")
        return None, None

def process_repo_batch(repo_names):
    """
    Processes a batch of repository names, fetches data, and handles errors.

    Args:
      repo_names: A list of repository names in the format "owner/repo".

    Returns:
      A list of dictionaries containing repository data.
    """
    data, rate_limit_info = fetch_repo_data(repo_names)

    # Print rate limit information
    print("Rate Limit Info:", rate_limit_info)

    # Extract repository data and error data
    repo_data = []
    error_data = []

    for key, value in data['data'].items():
      if value is not None:  # Check if the repository data exists
        repo_data.append({
            'nameWithOwner': value['nameWithOwner'],
            'stargazerCount': value['stargazerCount']
        })
      else:
        # Extract error information from the 'errors' list
        for error in data['errors']:
          if error['path'] == [key]:  # Match the error to the missing repo
            error_data.append({
                'type': error['type'],
                'message': error['message']
            })
            break  # Move to the next repo after finding the matching error

    return repo_data, error_data

def main():
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Construct the path to the database file one level up
    db_path = os.path.join(current_dir, '..', 'crypto_ecosystems.db')

    # Connect to the database
    conn = sqlite3.connect(db_path)

    # Fetch all repo names from the database
    df = pd.read_sql_query('SELECT DISTINCT repo_url FROM repos WHERE repo_url LIKE "https://github.com/%"', conn)
    all_repo_names = df['repo_url'].tolist()

    # Process repos in batches of 500
    batch_size = 100
    all_repo_data = []
    all_error_data = []
    for i in range(0, len(all_repo_names), batch_size):
        print(f"Processing batch {i // batch_size + 1} of {len(all_repo_names) // batch_size} \n")
        # print the timestamp in north american timezone
        print(f"Timestamp: {datetime.now(pytz.timezone('America/New_York'))}")
        repo_batch = all_repo_names[i: i + batch_size]
        repo_data, error_data = process_repo_batch(repo_batch)
        all_repo_data.extend(repo_data)
        all_error_data.extend(error_data)

        # Handle rate limiting (adjust sleep time as needed)
        time.sleep(9)

    # Create DataFrame from all the collected data
    final_df = pd.DataFrame(all_repo_data)
    error_df = pd.DataFrame(all_error_data)
    print("final_df:")
    print(final_df)
    print("/n error_df:")
    print(error_df)

    # write final_df to crypto_ecosystems.db. Create a new table called github_stars
    final_df.to_sql('github_stars', conn, if_exists='replace', index=False)

    # write error_df to crypto_ecosystems.db. Create a new table called github_stars_errors
    error_df.to_sql('github_stars_errors', conn, if_exists='replace', index=False)

    # commit the changes
    conn.commit()

    # Close the database connection
    conn.close()

if __name__ == "__main__":
    main()