import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { response } from "express";

dotenv.config();

dotenv.config();

const user = process.env.DB_USER;
const pw = process.env.DB_KEY;

const uri = `mongodb+srv://${user}:${pw}@cluster0.eshcn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export async function registerTransaction(transactions, collection) {
  //We connecto to DB
  client.connect(function (err, db) {
    if (err) throw err;
    const dbo = db.db("Tamahagane");

    //First we erase previuos register of that NFT since it may be sold at another price before.

    //console.log(myobj);

    dbo
      .collection(`${collection}`)
      .insertMany(transactions, { ordered: false }, function (err, res) {
        if (err) throw err;
        console.log(
          `The new transactions have been registered In the collection ${collection}`
        );
        db.close();
        client.close;
        return null;
      });
  });
}

export async function getRegisteredTx(collection) {
  let result;
  try {
    await client.connect();
    const database = client.db("Tamahagane");
    const transactions = await database.collection(`${collection}`);

    const cursor = await transactions.find();
    result = await cursor.toArray();

    if (!result) {
      console.log("No documents found!");
    }
  } finally {
    await client.close();
    return result;
  }
}

//console.log(await getRegisteredTx());
//console.log(await getIpfsHash(277));
