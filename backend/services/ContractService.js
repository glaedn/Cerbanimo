import WalletService from './WalletService.js';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ContractService {
  constructor() {
    this.providers = {}; // map of chain -> provider
    this.contracts = {}; // map of chain:contractAddress -> contract instance
    this.abis = {};      // map of contractName -> ABI
  }

  /**
   * Loads an ABI from the abis directory.
   */
  async loadABI(name) {
    if (this.abis[name]) return this.abis[name];

    try {
      const abiPath = path.resolve(__dirname, `../abis/${name}.json`);
      const abiContent = fs.readFileSync(abiPath, 'utf8');
      this.abis[name] = JSON.parse(abiContent);
      return this.abis[name];
    } catch (err) {
      console.error(`ContractService: Failed to load ABI ${name}`, err);
      return null;
    }
  }

  /**
   * Initializes a provider for a specific chain.
   */
  async getProvider(chain) {
    if (this.providers[chain]) return this.providers[chain];

    const rpcUrl = process.env[`RPC_URL_${chain.toUpperCase()}`];
    if (!rpcUrl) {
      console.warn(`ContractService: No RPC URL found for chain ${chain}`);
      return null;
    }

    try {
      this.providers[chain] = new ethers.JsonRpcProvider(rpcUrl);
      return this.providers[chain];
    } catch (err) {
      console.error(`ContractService: Failed to initialize provider for ${chain}`, err);
      return null;
    }
  }

  /**
   * Loads a contract instance.
   */
  async getContract(chain, address, abiName) {
    const key = `${chain}:${address}`;
    if (this.contracts[key]) return this.contracts[key];

    const provider = await this.getProvider(chain);
    if (!provider) return null;

    const abi = await this.loadABI(abiName);
    if (!abi) return null;

    try {
      this.contracts[key] = new ethers.Contract(address, abi, provider);
      return this.contracts[key];
    } catch (err) {
      console.error(`ContractService: Failed to load contract ${abiName} at ${address}`, err);
      return null;
    }
  }

  /**
   * Placeholder for sending a transaction.
   */
  async sendTransaction(chain, contractAddress, method, args, options = {}) {
    console.log(`Sending tx to ${contractAddress} on ${chain}: ${method}(${args.join(', ')})`);
    return {
      txHash: '0x' + '0'.repeat(64),
      status: 'pending'
    };
  }

  /**
   * Set up event listeners for a contract.
   */
  async listenToEvents(chain, contractAddress, eventName, callback) {
    console.log(`Starting listener for ${eventName} on ${contractAddress} (${chain})`);
    // Logic to subscribe to contract events
  }

  /**
   * Syncs historical events.
   */
  async syncPastEvents(chain, contractAddress, eventName, fromBlock) {
    console.log(`Syncing past ${eventName} events from block ${fromBlock} on ${chain}`);
  }
}

export default new ContractService();
