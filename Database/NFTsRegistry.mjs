import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const user = process.env.DB_USER;
const pw = process.env.DB_KEY;

const uri = `mongodb+srv://${user}:${pw}@cluster0.eshcn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority&socketTimeoutMS=360000&`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export async function registerNFT(name) {
  //We connecto to DB
  let result;
  try {
    await client.connect();
    const db = client.db("Metahagane");
    const regestry = db.collection(name);
    const result = await regestry.findOne({});

    if (!result) {
      await regestry.insertOne({});
    }
  } catch (e) {
    console.log(e);
  }
  try {
    const db = client.db("Metahagane");
    const regestry = db.collection(name);
    await regestry.updateOne({}, { $inc: { count: 1 } });
    result = await regestry.findOne({});
    result = result.count;
    //console.log(result);
  } finally {
    await client.close();
  }
  return result;
}
