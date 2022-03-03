import * as wasm from "../custom_modules/@emurgo/cardano-serialization-lib-nodejs/cardano_serialization_lib.js";
import { languageViews } from "./LanguageViews.mjs";
import { BlockFrost, blockFrostReq, getProtocolParams } from "./blockfrost.mjs";
import CoinSelection from "./CoinSelection.mjs";
import * as dotenv from "dotenv";
import { prvKey, prvKey2 } from "./Wallet/keys.mjs";
import { policysId } from "../Constants/policyId.mjs";
import { materials } from "../Constants/assets.mjs";

dotenv.config();
const ServerAddress = process.env.ADDRESS;

export function toHex(bytes) {
  return Buffer.from(bytes, "hex").toString("hex");
}
export function fromHex(hex) {
  return Buffer.from(hex, "hex");
}

export function asciiToHex(ascii) {
  return Buffer.from(ascii, "utf-8").toString("hex");
}

export function HextoAscii(Hex) {
  return Buffer.from(Hex, "hex").toString("utf-8");
}

export async function initTx(protocolParameters) {
  const txBuilder = wasm.TransactionBuilder.new(
    wasm.LinearFee.new(
      wasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),
      wasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
    ),
    wasm.BigNum.from_str(protocolParameters.minUtxo),
    wasm.BigNum.from_str(protocolParameters.poolDeposit),
    wasm.BigNum.from_str(protocolParameters.keyDeposit),
    protocolParameters.maxValSize,
    protocolParameters.maxTxSize,
    protocolParameters.priceMem,
    protocolParameters.priceStep,
    wasm.LanguageViews.new(Buffer.from(languageViews, "hex"))
  );

  return txBuilder;
}

export const amountToValue = (assets) => {
  const multiAsset = wasm.MultiAsset.new();
  console.log(assets);
  const lovelace = assets.find((asset) => asset.unit === "lovelace");
  const policies = [
    ...new Set(
      assets
        .filter((asset) => asset.unit !== "lovelace")
        .map((asset) => asset.unit.slice(0, 56))
    ),
  ];
  console.log(policies);
  policies.forEach((policy) => {
    const policyAssets = assets.filter(
      (asset) => asset.unit.slice(0, 56) === policy
    );
    const assetsValue = wasm.Assets.new();
    policyAssets.forEach((asset) => {
      assetsValue.insert(
        wasm.AssetName.new(Buffer.from(asset.unit.slice(56), "hex")),
        wasm.BigNum.from_str(asset.quantity)
      );
    });
    multiAsset.insert(
      wasm.ScriptHash.from_bytes(Buffer.from(policy, "hex")),
      assetsValue
    );
  });
  const value = wasm.Value.new(
    wasm.BigNum.from_str(lovelace ? lovelace.quantity : "0")
  );
  if (assets.length > 1 || !lovelace) value.set_multiasset(multiAsset);
  return value;
};

export async function getUtxos(addr) {
  const URL = `https://cardano-testnet.blockfrost.io/api/v0/addresses/${addr}/utxos`;
  const response = await blockFrostReq(URL);

  let utxos = [];

  response.forEach((element) => {
    const value = amountToValue(element.amount);

    const input = wasm.TransactionInput.new(
      wasm.TransactionHash.from_bytes(Buffer.from(element.tx_hash, "hex")),
      element.tx_index
    );

    const output = wasm.TransactionOutput.new(
      wasm.Address.from_bech32(addr),
      value
    );

    const utxo = wasm.TransactionUnspentOutput.new(input, output);
    utxos.push(utxo);
  });
  return utxos;
}

export async function sendNFTs(
  sender,
  prvKeysSender,
  address,
  NFTamount,
  change
) {
  console.log(sender, prvKeysSender, address, NFTamount, change);
  const protocolParameters = await getProtocolParams();
  const wasmchange = wasm.Value.new(wasm.BigNum.from_str(`${change}`));

  let NFTValue;
  let value;
  let totalValue;
  if (NFTamount.length >= 1) {
    NFTValue = amountToValue(NFTamount).checked_add(wasmchange);
    value = wasm.Value.new(
      wasm.min_ada_required(
        NFTValue,
        wasm.BigNum.from_str(protocolParameters.minUtxo)
      )
    );
    totalValue = value.checked_add(NFTValue);
  }
  if (NFTamount.length == 0) {
    //console.log(change, protocolParameters.minUtxo + 500000);

    return "There were no tokens sent";
  }
  const reciverAddress = wasm.Address.from_bech32(address);

  const txBuilder = await initTx(protocolParameters);
  const utxos = await getUtxos(sender);
  //console.log(ServerAddress);

  //console.log(value.coin().to_str());
  const outPut = wasm.TransactionOutput.new(reciverAddress, totalValue);

  const outputs = wasm.TransactionOutputs.new();
  //console.log(outputs);
  outputs.add(outPut);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize
  );
  //console.log(outputs);
  const inputs = await CoinSelection.randomImprove(utxos, outputs);
  //console.log(inputs);
  // TODO: Continue here
  inputs.input.forEach((utxo) => {
    //console.log(utxo);
    const input = utxo.input();
    //console.log(input.address(), input, input.value());
    txBuilder.add_input(
      wasm.Address.from_bech32(ServerAddress),
      input,
      utxo.output().amount()
    );
  });
  txBuilder.add_output(outPut);
  txBuilder.add_change_if_needed(wasm.Address.from_bech32(sender));

  const txBody = txBuilder.build();

  const tx = wasm.Transaction.new(txBody, wasm.TransactionWitnessSet.new());

  //console.log(inputs);

  try {
    const txHash = wasm.hash_transaction(tx.body());
    const witnesses = tx.witness_set();

    const vkeysWitnesses = wasm.Vkeywitnesses.new();
    //console.log(prvKeysSender);

    const vkeyWitness = wasm.make_vkey_witness(txHash, prvKey2);
    vkeysWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeysWitnesses);
    const transaction = wasm.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // transaction metadata
    );

    try {
      const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
      const submitionHash = await BlockFrost.txSubmit(CBORTx);
      console.log(`tx Submited tiwh txHas ${submitionHash}`);
      return submitionHash;
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.log(error);
    return { error: error.info || error.toString() };
  }
}
export const initTx_ = async () => {
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
      maxTxSize: parseInt(p.max_tx_size),
      slot: parseInt(latest_block.slot),
    };
  } catch (e) {
    console.log(e);
  }
};

export async function sendAllTokens(address) {
  const reciverAddress = wasm.Address.from_bech32(address);
  const protocolParameters = await getProtocolParams();

  const txBuilder = await initTx(protocolParameters);
  const utxos = await getUtxos(ServerAddress);
  //console.log(ServerAddress);
  const value = wasm.Value.new(wasm.BigNum.from_str("1700000"));
  //const totalValue = value.checked_add(NFTValue);
  //const outPut = wasm.TransactionOutput.new(reciverAddress, totalValue);

  const outputs = wasm.TransactionOutputs.new();
  //console.log(outputs);
  //outputs.add(outPut);

  //console.log(outputs);

  // TODO: Continue here
  utxos.forEach((utxo) => {
    //console.log(utxo);
    const input = utxo.input();
    //console.log(input.address(), input, input.value());
    txBuilder.add_input(
      wasm.Address.from_bech32(ServerAddress),
      input,
      utxo.output().amount()
    );
  });
  txBuilder.add_change_if_needed(wasm.Address.from_bech32(address));

  const txBody = txBuilder.build();

  const tx = wasm.Transaction.new(txBody, wasm.TransactionWitnessSet.new());

  //console.log(inputs);

  try {
    const txHash = wasm.hash_transaction(tx.body());
    const witnesses = tx.witness_set();

    const vkeysWitnesses = wasm.Vkeywitnesses.new();
    const vkeyWitness = wasm.make_vkey_witness(txHash, prvKey);
    vkeysWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeysWitnesses);
    const transaction = wasm.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // transaction metadata
    );

    try {
      const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
      const submitionHash = await BlockFrost.txSubmit(CBORTx);
      console.log(`tx Submited tiwh txHash ${submitionHash}`);
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.log(error);
    return { error: error.info || error.toString() };
  }
}

export function isNFTlegit(nft) {
  try {
    //console.log(nft);
    if (policysId.includes(nft.unit.slice(0, 56))) {
      return true;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}

export const isRecipeComplete_ = function (assetsToBurn, asset) {
  function materialCounter(assetsToBurn, material) {
    if (assetsToBurn) {
      //console.log(assetsToBurn);

      const filteredAssets = assetsToBurn.filter((x) => {
        /*  console.log(
          `${fromHex(x.unit.slice(56)).toString().replace(/\d+/g, "")}` ==
            `${material.value}`
        ); */

        return (
          `${fromHex(x.unit.slice(56)).toString().replace(/\d+/g, "")}` ==
          `${material.value}`
        );
      });
      //console.log(filteredAssets);
      return filteredAssets.length;
    } else {
      return 0;
    }
  }

  const selectedRecipeData = asset.recipe;
  // const selectedAssetsData = []
  //console.log(selectedRecipeData);
  let selectedAssetData = [];
  console.log(materials);
  materials.forEach((material) => {
    const count = materialCounter(assetsToBurn, material);
    console.log(count);
    selectedAssetData.push(count);
  });
  console.log(selectedAssetData, selectedRecipeData);
  return (
    JSON.stringify(selectedRecipeData) == JSON.stringify(selectedAssetData)
  );
};
