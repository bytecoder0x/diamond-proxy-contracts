import hardhatNetworkHelpersPlugin from '@nomicfoundation/hardhat-network-helpers';
import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import hardhatTypechainPlugin from '@nomicfoundation/hardhat-typechain';
import dotenv from 'dotenv';
import { configVariable } from 'hardhat/config';

import type { HardhatUserConfig } from 'hardhat/config';
dotenv.config({ quiet: true });

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
        url: process.env.ETH_RPC_URL || '',
        blockNumber: 23461899,
      },
      chainId: 1,
      gasPrice: 250000000000, // 250 gwei
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
    },
    polygon: {
      type: 'http',
      chainType: 'op',
      url: process.env.POLYGON_RPC_URL || '',
      accounts: [process.env.POLYGON_PRIVATE_KEY || ''],
    },
  },
  typechain: {
    outDir: 'typechain',
  },
};

export default config;
