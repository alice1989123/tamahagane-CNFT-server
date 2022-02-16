import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {
  ForgeWeapon,
  getMetadata,
  getWalletBalance,
  sendingCards,
  blockFrostReq,
  MarketData,
  getUtxos,
  getWalletData,
} from "./Lib/Wallet.mjs";
import { registerSell } from "./Database/Activesells.mjs";
import { registerNFT } from "./Database/NFTsRegistry.mjs";
import { isNFTlegit } from "./BlockChainListener/Utils.mjs";
import * as assets from "./Constants/assets.mjs";
import { isRecipeComplete_ } from "./BlockChainListener/Utils.mjs";

dotenv.config();

const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

app.get("/", function (req, res) {
  res.send("We are burning the tokens");
});

app.post("/", function (req, res) {
  //console.log(req.body);
  res.send("this is your address");
});

app.post("/api/assetss", async function (req, res) {
  try {
    const balance = await getWalletBalance(req.body.address);
    //console.log(req.body);
    //console.log(balance);
    res.send(balance);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/assetss/info", async function (req, res) {
  try {
    const metadata = await getMetadata(req.body.asset);
    res.send(metadata);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/buy_cards", async function (req, res) {
  try {
    const addressBench32_1 = req.body.address;
    const balance = req.body.balance;
    const utxos = req.body.utxos;
    const buyOption = req.body.buyOption;
    const txHash = req.body.txHash;
    console.log(addressBench32_1, balance, utxos, buyOption);

    const response = await sendingCards(
      addressBench32_1,
      balance,
      utxos,
      buyOption,
      txHash
    );
    res.send(response);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/forge-weapon", async function (req, res) {
  try {
    const addressBench32_1 = req.body.address;
    const balance = req.body.balance;
    const utxos = req.body.utxos;
    let tokensToBurn = req.body.tokensToBurn;
    const nFTtoForge = req.body.nFTtoForge;
    const type = nFTtoForge.class;
    tokensToBurn = tokensToBurn.filter((x) => isNFTlegit(x)); //we checks if tokens are legit
    console.log(tokensToBurn);
    const asset = assets.materials
      .filter((x) => !!x.recipe)
      .concat(assets.weapons)
      .filter((x) => `${x.value}` == `${nFTtoForge.value}`)[0];
    //console.log(isRecipeComplete_(tokensToBurn, asset));
    if (isRecipeComplete_(tokensToBurn, asset)) {
      let count;
      try {
        count = await registerNFT(nFTtoForge.value);
      } catch (e) {
        console.log(e);
      }
      const name = `${nFTtoForge.value}${count}`;
      //console.log(name);

      const response = await ForgeWeapon(
        addressBench32_1,
        balance,
        utxos,
        {
          assets: [{ name: name, quantity: "1" }],
          metadatas: {
            [name]: {
              description: "An official NFT of the Metahagane-CNFT game.",
              type: type,
              files: [
                {
                  mediaType: "img.png",
                  src: `ipfs://${nFTtoForge.img}`,
                },
              ],
              image: `ipfs://${nFTtoForge.img}`,
              mediaType: "img.png",
            },
          },
        },

        tokensToBurn
      );
      res.send(response);
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/api/blockfrost/params", async function (req, res) {
  try {
    const getParams = async () => {
      try {
        const latestURL =
          "https://cardano-testnet.blockfrost.io/api/v0/blocks/latest";
        const paramsURL =
          "https://cardano-testnet.blockfrost.io/api/v0/epochs/latest/parameters";

        const p = await blockFrostReq(paramsURL);
        const l = await blockFrostReq(latestURL);
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
          slot: parseInt(l.slot),
        };
      } catch (e) {
        console.log(e);
      }
    };
    const response = await getParams();

    res.send(response);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/register_sell", async function (req, res) {
  try {
    //console.log(req);
    const txHash = req.body.txHash;
    const price = req.body.price;
    const address = req.body.address;

    const status = await registerSell(txHash, price, address);
    res.send(status);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/filter", async function (req, res) {
  try {
    //console.log(req.body.marketaddress);
    const marketaddress = req.body.marketaddress;
    const filteredata = await MarketData(marketaddress);

    res.send(filteredata);
  } catch (e) {
    console.log(e);
  }
});

app.post("/api/utxos", async function (req, res) {
  try {
    console.log(req);

    const address = req.body.address;

    const utxos = await getWalletData(address);
    //console.log(utxos);
    res.send(utxos);
  } catch (e) {
    console.log(e);
  }
});
