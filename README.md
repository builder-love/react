# execution_vm

https://treboryatska.github.io/execution_vm/

Basic analysis of developer activity across blockchain ecosystems. 

The data is sourced from Artemis developer activity report (https://app.artemisanalytics.com/developer-activity). 

Developer data in the Artemis report is sourced from Electric Capital's Crypto Ecosystems repo (https://github.com/electric-capital/crypto-ecosystems/tree/master).

## Data Methodology
The Artemis dashboard allows us some basic insights into developer ecosystems, however the data labels generally lack context and are not useful for understanding the relative strength of developer ecosystems. 

Specifically, the Artemis data has an incomplete and context unaware data labeling methodology:
- Tooling, such as Hardhat, Foundry, and Truffle are built to support specific blockchain development frameworks, so it makes sense to include the developer activity in these ecosystems in the statistics of the blockchain framework they primarily support
- The developer activity statistics of multi-ecosystem applications and infrastructure, such as message passing bridges, oracles, and indexing services are allocated to single development frameworks
- Rollups on another blockchain for infrastructure services, such as transaction ordering and data verifiability, state verification, as well as shared security from an enshrined token bridge. Developer activity statistics of rollup blockchains can be complementary to the development framework of the blockchain providing infrastructure. Example in mind: a rollup that has built custom interfaces and helpers for the infrastructure provider. These tools can be leveraged by other rollups to deploy the same tech stack. 
- Rollup blockchains, and many layer one blockchains, often times strive to exactly replicate the development framework of more popular frameworks, such as establishing execution specifications that are compatible with the Ethereum Virtual Machine. Developer activity in these ecosystems is directly complementary of the development framework they are replicating. 

A better data labeling methodology will enable us to create useful metrics for comparing the relative strengths of blockchain development frameworks. 
