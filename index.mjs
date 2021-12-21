import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {
  ForgeWeapon,
  getMetadata,
  getWalletBalance,
  sendingCards,
} from "./Lib/Wallet.mjs";
dotenv.config();

const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(cors());

app.listen(80, () => {
  console.log(`server is running on port ${PORT}`);
});

app.get("/", function (req, res) {
  res.send("We are burning the tokens");
});

app.post("/", function (req, res) {
  console.log(req.body);
  res.send("this is your address");
});

app.post("/api/assetss", async function (req, res) {
  try {
    const balance = await getWalletBalance(req.body.address);
    console.log(req.body);
    console.log(balance);
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
    const tokensToBurn = req.body.tokensToBurn;
    const nFTtoForge = req.body.nFTtoForge;

    const response = await ForgeWeapon(
      addressBench32_1,
      balance,
      utxos,
      {
        assets: [{ name: nFTtoForge.value, quantity: "1" }],
        metadatas: {
          [nFTtoForge.value]: {
            description: "weapon",
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
  } catch (e) {
    console.log(e);
  }
});
