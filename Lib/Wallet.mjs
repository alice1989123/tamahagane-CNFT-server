import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { prvKey, getKeyAddress } from "../Wallet/keys.mjs";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { idTestnet } from "../Wallet/blockfrost.mjs";
import CoinSelection from "./CoinSelection.mjs";
import axios from "axios";
import dotenv from "dotenv";
import { Buffer } from "safe-buffer";
import { getActiveSells } from "../Database/Activesells.mjs";
import { registerNFT } from "../Database/NFTsRegistry.mjs";
import { policysId } from "../Constants/policyId.mjs";

dotenv.config();
export const baseAddr = process.env.ADDRESS;

export const BlockFrost = new BlockFrostAPI({
  isTestnet: true,
  projectId: idTestnet,
});

export const initTx = async () => {
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

export async function getWalletBalance(addr) {
  try {
    const Balance = await blockFrostReq(
      `https://cardano-testnet.blockfrost.io/api/v0/addresses/${addr}`
    );
    return Balance;
    //console.log(Balance);
  } catch (e) {
    console.log(e);
  }
}

export async function getTxInfo(hash) {
  try {
    const info = await blockFrostReq(
      `https://cardano-testnet.blockfrost.io/api/v0/txs/${hash}/utxos`
    );
    return info;
    //console.log(Balance);
  } catch (e) {
    console.log(e);
  }
}

export async function MarketData(marketaddress) {
  try {
    //console.log(marketaddress);
    const data = await getWalletBalance(marketaddress);
    console.log(data);
    const sales = await getActiveSells();
    //console.log(sales);

    let filteredData = data.amount.filter((x) =>
      sales.map((y) => y.unit).includes(x.unit)
    );

    filteredData = filteredData.filter((x) => x.quantity == 1); // We will only allow NTs!
    filteredData = filteredData.filter(
      (
        x // Only allow NFTs of the Tamahagane CNFT Game
      ) => policysId.includes(x.unit.slice(0, 56))
    );

    let filteredDataPrice = [];

    filteredData.forEach((x, i) => {
      const price = sales.filter((y) => y.unit == x.unit)[0].price;
      const address = sales.filter((y) => y.unit == x.unit)[0].address;
      filteredDataPrice.push({
        unit: x.unit,
        quantity: x.quantity,
        price: price,
        address: address,
      });
    });

    //console.log(filteredData);
    //console.log(filteredDataPrice);
    return filteredDataPrice;
  } catch (e) {
    console.log(e);
    return [];
  }
}

export async function getMetadata(asset) {
  try {
    // Adds Blockfrost project_id to req header
    const config = {
      headers: {
        project_id: idTestnet,
      },
    };
    const response = await axios.get(
      `https://cardano-testnet.blockfrost.io/api/v0/assets/${asset}`,
      config
    );
    //console.log(response.data);

    return response.data;
  } catch (error) {
    // console.log(error.response);
    return null;
  }
}
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

export async function getTokensbyPolicyId(address, policy) {
  try {
    const walletInfo = await getWalletBalance(address);
    const tokensbyId = walletInfo.amount.filter(
      (x) => x.unit.slice(0, 56) === policy
    );
    //console.log(tokensbyId);

    return tokensbyId;
  } catch (e) {
    console.log(e);
  }
}

export const amountToValue = (assets) => {
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

export async function getWalletData(addr) {
  try {
    const uTXOs = function (addrsBench32) {
      return `https://cardano-testnet.blockfrost.io/api/v0/addresses/${addrsBench32}/utxos`;
    };
    const URL = uTXOs(addr);
    const response = await blockFrostReq(URL);
    //console.log(response);

    return response;
  } catch (e) {
    console.log(e);
  }
}

export async function getUtxos(addr) {
  const response = await getWalletData(addr);
  console.log(response);

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

export async function maketxconfigBuilder() {
  const p = await initTx();
  let configBuilder = CardanoWasm.TransactionBuilderConfigBuilder.new();

  configBuilder = configBuilder.fee_algo(
    CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str(p.linearFee.minFeeA),
      CardanoWasm.BigNum.from_str(p.linearFee.minFeeB)
    )
  );
  configBuilder = configBuilder.coins_per_utxo_word(
    CardanoWasm.BigNum.from_str(p.coinsPerUtxoWord)
  );
  configBuilder = configBuilder.pool_deposit(
    CardanoWasm.BigNum.from_str(p.poolDeposit)
  );
  configBuilder = configBuilder.key_deposit(
    CardanoWasm.BigNum.from_str(p.keyDeposit)
  );
  configBuilder = configBuilder.max_tx_size(p.maxTxSize);
  configBuilder = configBuilder.max_value_size(p.maxValSize);
  configBuilder = configBuilder.prefer_pure_change(true);
  const config = configBuilder.build();
  return config;
}

export async function makeTxBuilder() {
  const config = await maketxconfigBuilder();
  const txBuilder = CardanoWasm.TransactionBuilder.new(config);
  return txBuilder;
}

export async function submitTx(transaction) {
  try {
    const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
    const submitionHash = await BlockFrost.txSubmit(CBORTx);
    console.log(`tx Submited tiwh txHas ${submitionHash}`);
    return submitionHash;
  } catch (e) {
    console.log(e);
  }
}

export function metadataBuilder(
  description,
  src,
  name,
  mediaType,
  timelockExpirySlot,
  policyId
) {
  const encodedName = new Buffer.from(name).toString("hex");
  return {
    [policyId]: {
      [name]: {
        description: description,
        files: [
          {
            mediaType: mediaType,
            name: name,
            src: `ipfs://${src}`,
          },
        ],
        image: `ipfs://${src}`,
        mediaType: mediaType,
        name: name,
        mintBefore: timelockExpirySlot,
      },
    },
    ["version"]: "1.0",
  };
}

export async function sendingCards(
  address,
  balance,
  rawutxos,
  buyOption,
  txHashClient
) {
  const serverAddressBech32 = process.env.ADDRESS;

  const checkTx = async function (txHashClient, buyOption) {
    const price = `${buyOption * 2 * 1000000}`;
    //every 30 seconds 5 times it queryes blockfros and compare is the price send is accord with the buying option
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    for (let i = 0; i < 5; i++) {
      await sleep(30000);
      try {
        const txInfo = await getTxInfo(txHashClient);
        const outputs = txInfo.outputs;
        //console.log(outputs);

        const serverOutput = outputs.filter(
          (x) => x.address === serverAddressBech32
        );

        if (
          serverOutput.length >= 0 &&
          serverOutput[0].amount[0].quantity === price
        ) {
          return true;
        } else {
          return false;
        }
      } catch (e) {
        console.log(`the tx was not found in the  ${i}- time error ${e}`);
      }
    }
  };
  const check = true; //await checkTx(txHashClient, buyOption);
  if (check === true) {
    const policyid = "e93ec6209631511713b832e5378f77b587762bc272893a7163ecc46e";

    const randomSelect = function (n, array) {
      const shuffled = array.sort(function () {
        return 0.5 - Math.random();
      });

      const selected = shuffled.slice(0, n);
      return selected;
    };

    const serverAddress = CardanoWasm.Address.from_bech32(serverAddressBech32); // Server direction
    const clientAddress = CardanoWasm.Address.from_bech32(address); // Client direction
    const tokensbyId = await getTokensbyPolicyId(serverAddressBech32, policyid);
    const selectedTokens = randomSelect(7 * buyOption, tokensbyId);
    //console.log(selectedTokens);

    const utxosServer = await getUtxos(serverAddressBech32);
    //console.log(`this is the leght of the utxo array ${utxosServer.length}`);

    const protocolParameters = await initTx();

    CoinSelection.setProtocolParameters(
      protocolParameters.minUtxo,
      protocolParameters.coinsPerUtxoWord,
      protocolParameters.linearFee.minFeeA,
      protocolParameters.linearFee.minFeeB,
      protocolParameters.maxTxSize
    );

    const valueTokens = amountToValue(selectedTokens);
    let minAda = CardanoWasm.Value.new(
      CardanoWasm.min_ada_required(
        valueTokens,
        false,
        CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
      )
    );

    //let minAda = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("2000000"));

    const outPutClient_ = CardanoWasm.TransactionOutput.new(
      clientAddress,
      minAda.checked_add(valueTokens)
    );
    let outPutsClient_ = CardanoWasm.TransactionOutputs.new();
    outPutsClient_.add(outPutClient_);

    const selectionServer = await CoinSelection.randomImprove(
      utxosServer,
      outPutsClient_,
      20
    );

    const txBuilder = await makeTxBuilder();

    selectionServer.input.forEach((input) => {
      txBuilder.add_input(
        clientAddress,
        input.input(),
        input.output().amount()
      );
    });
    txBuilder.add_output(outPutClient_);
    txBuilder.set_ttl(protocolParameters.slot + 1000);
    txBuilder.add_change_if_needed(serverAddress);
    const tx = txBuilder.build_tx();

    const txHash = CardanoWasm.hash_transaction(tx.body());
    let witnesses = tx.witness_set();

    const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
    vkeysWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeysWitnesses);
    const transaction = CardanoWasm.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // transaction metadata
    );

    const submitionHash = await submitTx(transaction);
  } else {
    return "The transaction could not be verified please contact the support team";
  }
}

export async function ForgeWeapon(
  clientAddress,
  balance,
  utxos,
  assetsWithMetada,
  tokensToBurn
) {
  const protocolParameters = await initTx();
  const addressBench32_1 = process.env.ADDRESS; // Addres used in the policy the same Address used for minting
  const signingPrvKey = getKeyAddress(process.env.WALLET_KEY).prvKey;
  console.log(process.env.ADDRESS_2, process.env.ADDRESS);
  const policy = await createLockingPolicyScript(
    process.env.ADDRESS,
    protocolParameters
  );

  let metadata = assetsWithMetada.metadatas;

  metadata = { [policy.id]: assetsWithMetada.metadatas };
  const assets = assetsWithMetada.assets;

  try {
    const tx = await mintTx(
      assets,
      metadata,
      policy,
      protocolParameters,
      tokensToBurn,
      addressBench32_1
    );
    const txHash = CardanoWasm.hash_transaction(tx.body());
    const witnesses = tx.witness_set();

    const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, signingPrvKey);
    vkeysWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeysWitnesses);
    const transaction = CardanoWasm.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // transaction metadata
    );

    try {
      const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
      //console.log(CBORTx);
      return CBORTx;
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.log(error);
  }
  async function mintTx(
    assets,
    metadata,
    policy,
    protocolParameters,
    tokensToBurn,
    burningAddressBech32
  ) {
    const address = CardanoWasm.Address.from_bech32(clientAddress); // clientAddress
    const burningAddress =
      CardanoWasm.Address.from_bech32(burningAddressBech32);
    /* const utxosBurningAddress = await getUtxos(burningAddressBech32); */

    const checkValueMinting = amountToValue(
      assets.map((asset) => ({
        unit: policy.id + asciiToHex(asset.name),
        quantity: asset.quantity,
      }))
    );

    const minAdaMinting = CardanoWasm.min_ada_required(
      checkValueMinting,
      false,
      CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
    );

    let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));

    const burningValue = amountToValue(tokensToBurn);
    const checkValueBurning = CardanoWasm.Value.new(
      CardanoWasm.min_ada_required(
        burningValue,
        false,
        CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
      )
    );

    const outputServer = burningValue.checked_add(checkValueBurning);

    const _outputs = CardanoWasm.TransactionOutputs.new();
    _outputs.add(
      CardanoWasm.TransactionOutput.new(
        address,
        CardanoWasm.Value.new(minAdaMinting)
      )
    );
    _outputs.add(
      CardanoWasm.TransactionOutput.new(burningAddress, outputServer)
    );

    //console.log(Buffer.from(_outputs.to_bytes(), "hex").toString("hex"));

    CoinSelection.setProtocolParameters(
      protocolParameters.minUtxo,
      protocolParameters.coinsPerUtxoWord,
      protocolParameters.linearFee.minFeeA,
      protocolParameters.linearFee.minFeeB,
      protocolParameters.maxTxSize
    );
    const utxos_ = utxos.map((element) => {
      return CardanoWasm.TransactionUnspentOutput.from_bytes(
        Buffer.from(element, "hex")
      );
    });
    console.log(
      [0, 1].map((i) => ValuetoAmount(_outputs.get(i).amount())),
      _outputs.get(0).amount().coin().to_str()
    );

    const selection = await CoinSelection.randomImprove(utxos_, _outputs, 20);

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
    value = value.checked_add(mintedValue); //Add minted Assets

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

    const inputs = CardanoWasm.TransactionInputs.new();

    selection.input.forEach((utxo) => {
      inputs.add(
        CardanoWasm.TransactionInput.new(
          utxo.input().transaction_id(),
          utxo.input().index()
        )
      );
      value = value.checked_add(utxo.output().amount()); //Adds all inputs
    });

    value = value.checked_sub(outputServer); // quits burning Tokens + min ada required for sending the burning tokens

    const rawOutputs = CardanoWasm.TransactionOutputs.new();

    rawOutputs.add(CardanoWasm.TransactionOutput.new(address, value));
    //ChangeBurningAdresss + BurningTokens
    rawOutputs.add(
      CardanoWasm.TransactionOutput.new(
        burningAddress,
        checkValueBurning.checked_add(burningValue)
      )
    );

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
      /*  console.log(
        Buffer.from(generalMetadata.to_bytes(), "hex").toString("hex")
      ); */

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

    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    witnesses.set_vkeys(vkeys);

    const rawTx = CardanoWasm.Transaction.new(rawTxBody, witnesses, _metadata);
    const linearFee = CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),
      CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
    );
    let minFee = CardanoWasm.min_fee(rawTx, linearFee);

    value = value.checked_sub(CardanoWasm.Value.new(minFee));

    const outputs = CardanoWasm.TransactionOutputs.new();
    // Minting+ Change - Fee
    outputs.add(CardanoWasm.TransactionOutput.new(address, value));
    outputs.add(
      CardanoWasm.TransactionOutput.new(burningAddress, outputServer)
    );
    //console.log(checkValueBurning.coin().to_str());
    //console.log(outputs.len());

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
    //console.log(Buffer.from(transaction.to_bytes(), "hex").toString("hex"));

    return transaction;
  }
}
export async function createLockingPolicyScript(address, protocolParameters) {
  const ttl = protocolParameters.slot + 1000;

  const paymentKeyHash = CardanoWasm.BaseAddress.from_address(
    CardanoWasm.Address.from_bech32(address)
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
  //nativeScripts.add(lockScript); We decided to remove time-policy, since this way it would be easier to only allow NFTs with one simple policyId for all NFTs in all the game
  const finalScript = CardanoWasm.NativeScript.new_script_all(
    CardanoWasm.ScriptAll.new(nativeScripts)
  );
  const policyId = Buffer.from(
    CardanoWasm.ScriptHash.from_bytes(finalScript.hash().to_bytes()).to_bytes(),
    "hex"
  ).toString("hex");
  return { id: policyId, script: finalScript, ttl };
}

export function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}
export function fromHex(hex) {
  return Buffer.from(hex, "hex");
}

export function ValuetoAmount(value) {
  let amount = [{ unit: "lovelace", quantity: `${value.coin().to_str()}` }];

  if (value.multiasset()) {
    const multiAssets = value.multiasset().keys();
    for (let j = 0; j < multiAssets.len(); j++) {
      const policy = multiAssets.get(j);
      const policyAssets = value.multiasset().get(policy);
      const assetNames = policyAssets.keys();
      for (let k = 0; k < assetNames.len(); k++) {
        const assetPolicy = Buffer.from(policy.to_bytes()).toString("hex"); // hex encoded policy
        const assetNamestr = Buffer.from(
          assetNames.get(k).name(),
          "hex"
        ).toString(); // utf8 encoded asset name
        const quantity = policyAssets.get(assetNames.get(k)).to_str(); // asset's quantity
        //console.log(assetPolicy, , assetNamestr, quantity);
        amount.push({
          unit: `${assetPolicy}${toHex(assetNamestr)}`,
          quantity: `${quantity}`,
        });
      }
    }
    //console.log(amount);
    return amount;
  }
}

export async function sendAda(
  serverAddress,
  serverPrvKeys,
  address,
  lovelaces
) {
  const protocolParameters = await initTx();

  const reciverAddress = CardanoWasm.Address.from_bech32(address);

  const utxos = await getUtxos(serverAddress);
  const value = CardanoWasm.Value.new(
    CardanoWasm.BigNum.from_str(`${lovelaces}`)
  );
  const outPut = CardanoWasm.TransactionOutput.new(reciverAddress, value);
  const outputs = CardanoWasm.TransactionOutputs.new();
  outputs.add(outPut);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize
  );
  const inputs = await CoinSelection.randomImprove(utxos, outputs);

  let configBuilder = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(
      CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),

        CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
      )
    )
    .pool_deposit(CardanoWasm.BigNum.from_str(protocolParameters.poolDeposit))
    .key_deposit(CardanoWasm.BigNum.from_str(protocolParameters.keyDeposit))
    .max_tx_size(protocolParameters.maxTxSize)
    .max_value_size(protocolParameters.maxValSize)
    .coins_per_utxo_word(
      CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
    );
  //console.log(configBuilder.build());

  const txBuilder = CardanoWasm.TransactionBuilder.new(configBuilder.build());

  inputs.input.forEach((utxo) => {
    //console.log(utxo);
    const input = utxo.input();
    //console.log(input.address(), input, input.value());
    //console.log(txBuilder);
    txBuilder.add_input(
      CardanoWasm.Address.from_bech32(serverAddress),
      input,
      utxo.output().amount()
    );
  });

  txBuilder.add_output(outPut);

  txBuilder.add_change_if_needed(
    CardanoWasm.Address.from_bech32(serverAddress)
  );

  const txBody = txBuilder.build();

  const tx = CardanoWasm.Transaction.new(
    txBody,
    CardanoWasm.TransactionWitnessSet.new()
  );

  try {
    const txHash = CardanoWasm.hash_transaction(tx.body());
    const witnesses = tx.witness_set();

    const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, serverPrvKeys);
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
      return submitionHash;
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.log(error);
    return { error: error.info || error.toString() };
  }
}
