import * as dotenv from "dotenv";
import axios from "axios";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { BlockFrostIPFS } from "@blockfrost/blockfrost-js";

dotenv.config({ path: "../.env" });

const idMainet = process.env.ID_MAINNET;
const idTestnet = process.env.ID_TESTNET;
const ipfsKey = process.env.IPFS_KEY;

export const IPFS = new BlockFrostIPFS({
  projectId: ipfsKey,
});

export const BlockFrost = new BlockFrostAPI({
  isTestnet: true,
  projectId: idTestnet,
});

export async function blockFrostReq(URL) {
  try {
    // Adds Blockfrost project_id to req header
    const configBuilder = {
      headers: {
        project_id: idTestnet,
      },
    };
    const response = await axios.get(URL, configBuilder);
    //console.log(response);
    return response.data;
  } catch (error) {
    console.log(error.response);
    return error;
  }
}

export const getProtocolParams = async () => {
  try {
    const latest_block = await BlockFrost.blocksLatest();
    const p = await BlockFrost.epochsParameters(latest_block.epoch);
    return {
      linearFee: {
        minFeeA: p.min_fee_a.toString(),
        minFeeB: p.min_fee_b.toString(),
      },
      minUtxo: "1000000", //p.min_utxo, minUTxOValue protocol paramter has been removed since Alonzo HF. Calulation of minADA works differently now, but 1 minADA still sufficient for now
      poolDeposit: p.pool_deposit,
      keyDeposit: p.key_deposit,
      coinsPerUtxoWord: "34482",
      maxValSize: 5000,
      priceMem: 5.77e-2,
      priceStep: 7.21e-5,
      maxTxSize: p.max_tx_size,
      slot: latest_block.slot,
    };
  } catch (e) {
    console.log(e);
  }
};
