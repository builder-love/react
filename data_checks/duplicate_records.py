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

# check for duplicate project_id in crypto_ecosystems
cursor.execute('''-- confirm no duplicate project_id in crypto_ecosystems
with counts_ as (select project_id, count(project_id) counter from crypto_ecosystems group by project_id)

select * from counts_ where counter > 1''')

rows = cursor.fetchall()

# convert rows to a pandas dataframe
df = pd.DataFrame(rows, columns=['project_id', 'counter'])

# print the dataframe
print(df)