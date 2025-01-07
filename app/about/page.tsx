import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold text-blue-500">About</h1>
      <p className="mt-4">
        Builder love compares developer activity across blockchain ecosystems.
        <br />
        <br />
        Developer data is sourced from Electric Capital&apos;s Crypto Ecosystems
        repo (
        <a
          href="https://github.com/electric-capital/crypto-ecosystems/tree/master"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          https://github.com/electric-capital/crypto-ecosystems/tree/master
        </a>
        ) and Github.
        <br />
        <br />
        Data Methodology The Artemis dashboard allows us some basic insights
        into developer ecosystems, however the data labels generally lack
        context and are not useful for understanding the relative strength of
        developer ecosystems.
        <br />
        <br />
        Existing analysis of blockchain developer data is incomplete and the
        data labeling methodology is context unaware:
        <br />
        - Tooling, such as Hardhat, Foundry, and Truffle are built to support
        specific blockchain development frameworks, so it makes sense to
        include the developer activity in these ecosystems in the statistics of
        the blockchain framework they primarily support
        <br />- The developer activity statistics of multi-ecosystem
        applications and infrastructure, such as message passing bridges,
        oracles, and indexing services are allocated to single development
        frameworks
        <br />- Rollups on another blockchain for infrastructure services, such
        as transaction ordering and data verifiability, state verification, as
        well as shared security from an enshrined token bridge. Developer
        activity statistics of rollup blockchains can be complementary to the
        development framework of the blockchain providing infrastructure.
        Example in mind: a rollup that has built custom interfaces and helpers
        for the infrastructure provider. These tools can be leveraged by other
        rollups to deploy the same tech stack.
        <br />- Rollup blockchains, and many layer one blockchains, often times
        strive to exactly replicate the development framework of more popular
        frameworks, such as establishing execution specifications that are
        compatible with the Ethereum Virtual Machine. Developer activity in
        these ecosystems is directly complementary of the development framework
        they are replicating.
        <br />
        <br />A better data labeling methodology will enable us to create useful
        metrics for comparing the relative strengths of blockchain development
        frameworks.
      </p>
    </div>
  );
};

export default AboutPage;