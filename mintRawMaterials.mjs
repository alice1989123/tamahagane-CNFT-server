import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { idTestnet } from "./Wallet/blockfrost.mjs";
import axios from "axios";
import CoinSelection from "./Lib/CoinSelection.mjs";
import { prvKey } from "./Wallet/keys.mjs";
import dotenv from "dotenv";
import { metadataBuilder } from "./Lib/Wallet.mjs";
dotenv.config();
const baseAddr = process.env.ADDRESS;

const request = async function (url) {
  try {
    // Adds Blockfrost project_id to req header
    const configBuilder = {
      headers: {
        project_id: idTestnet,
      },
    };
    const response = await axios.get(url, configBuilder);

    return response.data;
  } catch (error) {
    console.log(error.response);
    return null;
  }
};

const uTXOs = function (addrsBench32) {
  return `https://cardano-testnet.blockfrost.io/api/v0/addresses/${addrsBench32}/utxos`;
};

const BlockFrost = new BlockFrostAPI({ isTestnet: true, projectId: idTestnet });

const initTx = async () => {
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

const addressBench32_1 = baseAddr;

const addressBench32_2 =
  "addr_test1qp6kuchljenmrpeqndh7rdthqc2frnm0jw5pu8u3ws0zuwkvhpj2uecg0a5mhkdtwnm30qw38tjq42uxu80rpjn7yytsmffw4e";

const shelleyChangeAddress = CardanoWasm.Address.from_bech32(addressBench32_1);

async function blockFrostReq(addrs) {
  try {
    // Adds Blockfrost project_id to req header
    const configBuilder = {
      headers: {
        project_id: idTestnet,
      },
    };
    const response = await axios.get(addrs, configBuilder);
    //console.log(response);
    return response.data;
  } catch (error) {
    console.log(error.response);
    return null;
  }
}

async function getUtxos(addr) {
  const URL = uTXOs(addr);
  const response = await blockFrostReq(URL);

  let utxos = [];

  response.forEach((element) => {
    const value = amountToValue(element.amount);

    const input = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(
        Buffer.from(element.tx_hash, "hex")
      ),
      element.tx_index
    );

    const output = CardanoWasm.TransactionOutput.new(
      CardanoWasm.Address.from_bech32(addr),
      value
    );

    const utxo = CardanoWasm.TransactionUnspentOutput.new(input, output);
    utxos.push(utxo);
  });
  return utxos;
}

const amountToValue = (assets) => {
  const multiAsset = CardanoWasm.MultiAsset.new();
  const lovelace = assets.find((asset) => asset.unit === "lovelace");
  const policies = [
    ...new Set(
      assets
        .filter((asset) => asset.unit !== "lovelace")
        .map((asset) => asset.unit.slice(0, 56))
    ),
  ];
  policies.forEach((policy) => {
    const policyAssets = assets.filter(
      (asset) => asset.unit.slice(0, 56) === policy
    );
    const assetsValue = CardanoWasm.Assets.new();
    policyAssets.forEach((asset) => {
      assetsValue.insert(
        CardanoWasm.AssetName.new(Buffer.from(asset.unit.slice(56), "hex")),
        CardanoWasm.BigNum.from_str(asset.quantity)
      );
    });
    multiAsset.insert(
      CardanoWasm.ScriptHash.from_bytes(Buffer.from(policy, "hex")),
      assetsValue
    );
  });
  const value = CardanoWasm.Value.new(
    CardanoWasm.BigNum.from_str(lovelace ? lovelace.quantity : "0")
  );
  if (assets.length > 1 || !lovelace) value.set_multiasset(multiAsset);
  return value;
};

const hexToAscii = (hex) => {
  var _hex = hex.toString();
  var str = "";
  for (var i = 0; i < _hex.length && _hex.substr(i, 2) !== "00"; i += 2)
    str += String.fromCharCode(parseInt(_hex.substr(i, 2), 16));
  return str;
};

const asciiToHex = (str) => {
  var arr = [];
  for (var i = 0, l = str.length; i < l; i++) {
    var hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return arr.join("");
};

export async function mintTx(
  assets,
  metadata,
  policy,
  protocolParameters,
  numberOfWitness
) {
  const address = shelleyChangeAddress;

  const checkValue = amountToValue(
    assets.map((asset) => ({
      unit: policy.id + asciiToHex(asset.name),
      quantity: asset.quantity,
    }))
  );
  const minAda = CardanoWasm.min_ada_required(
    checkValue,
    false,
    CardanoWasm.BigNum.from_str(protocolParameters.minUtxo)
  );

  let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));

  const _outputs = CardanoWasm.TransactionOutputs.new();
  _outputs.add(
    CardanoWasm.TransactionOutput.new(address, CardanoWasm.Value.new(minAda))
  );
  const utxos = await getUtxos(addressBench32_1);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.coinsPerUtxoWord,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize
  );

  const selection = await CoinSelection.randomImprove(utxos, _outputs, 20); //there is some issue with the selection algorithm!!!

  const nativeScripts = CardanoWasm.NativeScripts.new();
  nativeScripts.add(policy.script);

  const mintedAssets = CardanoWasm.Assets.new();
  assets.forEach((asset) => {
    mintedAssets.insert(
      CardanoWasm.AssetName.new(Buffer.from(asset.name)),
      CardanoWasm.BigNum.from_str(asset.quantity)
    );
  });

  const mintedValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));

  const multiAsset = CardanoWasm.MultiAsset.new();
  multiAsset.insert(
    CardanoWasm.ScriptHash.from_bytes(policy.script.hash().to_bytes()),
    mintedAssets
  );

  mintedValue.set_multiasset(multiAsset);
  value = value.checked_add(mintedValue);

  const mint = CardanoWasm.Mint.new();

  const mintAssets = CardanoWasm.MintAssets.new();
  assets.forEach((asset) => {
    mintAssets.insert(
      CardanoWasm.AssetName.new(Buffer.from(asset.name)),
      CardanoWasm.Int.new(CardanoWasm.BigNum.from_str(asset.quantity))
    );
  });

  mint.insert(
    CardanoWasm.ScriptHash.from_bytes(
      policy.script
        .hash(CardanoWasm.ScriptHashNamespace.NativeScript)
        .to_bytes()
    ),
    mintAssets
  );

  const inputs = CardanoWasm.TransactionInputs.new(); // here we should use a coinSelection Algorithm but there is some issue!! FIX!
  selection.input.forEach((utxo) => {
    inputs.add(
      CardanoWasm.TransactionInput.new(
        utxo.input().transaction_id(),
        utxo.input().index()
      )
    );
    value = value.checked_add(utxo.output().amount());
  });

  const rawOutputs = CardanoWasm.TransactionOutputs.new();
  rawOutputs.add(CardanoWasm.TransactionOutput.new(address, value));
  const fee = CardanoWasm.BigNum.from_str("0");

  const rawTxBody = CardanoWasm.TransactionBody.new(
    inputs,
    rawOutputs,
    fee,
    policy.ttl
  );
  rawTxBody.set_mint(mint);

  let _metadata;
  if (metadata) {
    const generalMetadata = CardanoWasm.GeneralTransactionMetadata.new();
    console.log(Buffer.from(generalMetadata.to_bytes(), "hex").toString("hex"));

    generalMetadata.insert(
      CardanoWasm.BigNum.from_str("721"),
      CardanoWasm.encode_json_str_to_metadatum(JSON.stringify(metadata))
    );
    _metadata = CardanoWasm.AuxiliaryData.new();
    _metadata.set_metadata(generalMetadata);

    console.log(`the metadata is ${_metadata.metadata()}`);

    rawTxBody.set_auxiliary_data_hash(
      CardanoWasm.hash_auxiliary_data(_metadata)
    );
  }
  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  witnesses.set_native_scripts(nativeScripts);

  const dummyVkeyWitness =
    "8258208814c250f40bfc74d6c64f02fc75a54e68a9a8b3736e408d9820a6093d5e38b95840f04a036fa56b180af6537b2bba79cec75191dc47419e1fd8a4a892e7d84b7195348b3989c15f1e7b895c5ccee65a1931615b4bdb8bbbd01e6170db7a6831310c";
  const vkeys = CardanoWasm.Vkeywitnesses.new();

  if (typeof numberOfWitness === Number) {
    for (let i = 0; i < numberOfWitness + 1; i++) {
      vkeys.add(
        CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
      );
    }
  } else {
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    witnesses.set_vkeys(vkeys);
  }

  const rawTx = CardanoWasm.Transaction.new(rawTxBody, witnesses, _metadata);
  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),
    CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
  );
  let minFee = CardanoWasm.min_fee(rawTx, linearFee);

  value = value.checked_sub(CardanoWasm.Value.new(minFee));
  const outputs = CardanoWasm.TransactionOutputs.new();
  outputs.add(CardanoWasm.TransactionOutput.new(address, value));

  const finalTxBody = CardanoWasm.TransactionBody.new(
    inputs,
    outputs,
    minFee,
    policy.ttl
  );
  finalTxBody.set_mint(rawTxBody.multiassets());
  finalTxBody.set_auxiliary_data_hash(rawTxBody.auxiliary_data_hash());

  const finalWitnesses = CardanoWasm.TransactionWitnessSet.new();
  finalWitnesses.set_native_scripts(nativeScripts);

  const transaction = CardanoWasm.Transaction.new(
    finalTxBody,
    finalWitnesses,
    rawTx.auxiliary_data()
  );

  const size = transaction.to_bytes().length * 2;
  if (size > protocolParameters.maxTxSize) throw ERROR.txTooBig;

  return transaction;
}

export async function MintTx(assetsWithMetada) {
  const protocolParameters = await initTx();
  const policy = await createLockingPolicyScript();

  const metadata = { [policy.id]: assetsWithMetada.metadatas };
  const assets = assetsWithMetada.assets;

  try {
    const tx = await mintTx(assets, metadata, policy, protocolParameters);
    const txHash = CardanoWasm.hash_transaction(tx.body());
    const witnesses = tx.witness_set();

    const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
    vkeysWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeysWitnesses);
    const transaction = CardanoWasm.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // transaction metadata
    );

    try {
      const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
      const submitionHash = await BlockFrost.txSubmit(CBORTx);
      console.log(`tx Submited tiwh txHas ${submitionHash}`);
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.log(error);
    return { error: error.info || error.toString() };
  }
  // const metadata = METADATA
}
export async function createLockingPolicyScript() {
  const protocolParameters = await initTx();
  const ttl = protocolParameters.slot + 1000;

  const address = addressBench32_1;

  const paymentKeyHash = CardanoWasm.BaseAddress.from_address(
    CardanoWasm.Address.from_bech32(addressBench32_1)
  )
    .payment_cred()
    .to_keyhash();

  const nativeScripts = CardanoWasm.NativeScripts.new();
  const script = CardanoWasm.ScriptPubkey.new(paymentKeyHash);
  const nativeScript = CardanoWasm.NativeScript.new_script_pubkey(script);
  const lockScript = CardanoWasm.NativeScript.new_timelock_expiry(
    CardanoWasm.TimelockExpiry.new(ttl)
  );
  nativeScripts.add(nativeScript);
  nativeScripts.add(lockScript);
  const finalScript = CardanoWasm.NativeScript.new_script_all(
    CardanoWasm.ScriptAll.new(nativeScripts)
  );
  const policyId = Buffer.from(
    CardanoWasm.ScriptHash.from_bytes(finalScript.hash().to_bytes()).to_bytes(),
    "hex"
  ).toString("hex");
  return { id: policyId, script: finalScript, ttl };
}
