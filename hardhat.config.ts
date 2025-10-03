import type { HardhatUserConfig } from 'hardhat/config';

import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import hardhatNetworkHelpersPlugin from '@nomicfoundation/hardhat-network-helpers';
import hardhatTypechainPlugin from '@nomicfoundation/hardhat-typechain';
import { configVariable } from 'hardhat/config';

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatNetworkHelpersPlugin, hardhatTypechainPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.30',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      production: {
        version: '0.8.30',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
      forking: {
        url: configVariable('ETH_RPC_URL'),
        blockNumber: 23461899,
      },
      chainId: 1,
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
    },
    polygon: {
      type: 'http',
      chainType: 'op',
      url: configVariable('POLYGON_RPC_URL'),
      accounts: [configVariable('POLYGON_PRIVATE_KEY')],
    },
  },
  typechain: {
    outDir: 'typechain',
  },
};

export default config;
