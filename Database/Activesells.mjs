import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { response } from "express";

dotenv.config();

const user = process.env.DB_USER;
const pw = process.env.DB_KEY;

const uri = `mongodb+srv://${user}:${pw}@cluster0.eshcn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export async function registerSell(unit, price, address) {
  //We connecto to DB
  client.connect(function (err, db) {
    if (err) throw err;
    var dbo = db.db("Tamahagane");

    //First we erase previuos register of that NFT since it may be sold at another price before.

    const activeSells = dbo.collection("activeSells");

    async function erase() {
      try {
        const query = { unit: unit };

        const deleted = await activeSells.deleteMany(query);
        console.log("Deleted " + deleted.deletedCount + " documents");
      } catch (e) {
        console.log(e);
      }
    }

    erase();

    var myobj = {
      unit: unit,
      price: price,
      address: address,
      date: Date.now(),
    };
    //console.log(myobj);

    dbo.collection("activeSells").insertOne(myobj, function (err, res) {
      if (err) throw err;
      console.log("The new sell has been registered In the database");
      db.close();
      return response;
    });
  });
}

export async function getActiveSells() {
  let activeSells = [];
  try {
    await client.connect();
    const database = client.db("Tamahagane");
    const movies = database.collection("activeSells");
    // query for movies that have a runtime less than 15 minutes
    const query = {};
    const options = {
      // sort returned documents in ascending order by title (A->Z)
      //sort: { date: 1 },
      // Include only the `title` and `imdb` fields in each returned document
      //projection: { _id: 0, id: 1 },
    };
    const cursor = movies.find(query, options);
    // print a message if no documents were found
    if ((await cursor.count()) === 0) {
      console.log("No documents found!");
    }
    // replace console.dir with your callback to access individual elements
    await cursor.forEach((dir) =>
      activeSells.push({
        unit: dir.unit,
        price: dir.price,
        address: dir.address,
      })
    );
  } finally {
    await client.close();
  }
  return activeSells;
}

const sales = await getActiveSells().catch(console.dir);
console.log(sales);
