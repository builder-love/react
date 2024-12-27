# execution_vm

Basic analysis of developer activity across blockchain ecosystems. 

The data is sourced from Artemis developer activity report (https://app.artemisanalytics.com/developer-activity). 

Developer data in the Artemis report is sourced from Electric Capital's Crypto Ecosystems repo (https://github.com/electric-capital/crypto-ecosystems/tree/master).

## Data
The Artemis dashboard allows us some basic insights into developer ecosystems, however the data labels generally lack context and are not useful for understanding the relative strength of developer ecosystems. For instance tooling, such as Hardhat, Foundry, and Truffle are built to support specific blockchain development frameworks, so it makes sense to include the developer activity in these ecosystems in the statistics of the blockchain framework they primarily support. Another methodology shortcoming is cross ecosystem applications and infrastructure, such as message passing bridges, oracles, and indexing services. The developer activity statistics of these ecosystems are more difficult to allocate across development frameworks. Further, rollups are directly complementary to another blockchain, which provides infrastructure services, such as transaction ordering and data verifiability, state verification, as well as shared security from an enshrined token bridge. Developer activity statistics of rollup blockchains is also difficult to allocate accross development frameworks. Lastly, rollup blockchains and even layer one blockchains often times strive to exactly replicate the development framework of more popular frameworks, such as establishing execution specifications that are compatible with the Ethereum Virtual Machine. A strong case can be made that the developer activity in these ecosystems is directly complementary of the development framework they are replicating. 

These shortcomings are a problem of incomplete and context unaware data labeling methodologies. Only with better data labeling methodologies can we best create useful metrics for comparing the relative strengths of development frameworks. 
