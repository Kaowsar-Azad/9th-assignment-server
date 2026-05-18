const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
app.use(cors())
dotenv.config()
const port = process.env.port || 3137 ; 



const uri = process.env.MONGODB_URL;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger= (req, res, next) => {
  next()
}

const verifyToken= async (req, res, next) => {
  const {authorization} = req.headers;
  next()
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
   
    const bd = client.db("petdb")
    const petCollection = bd.collection("petDetails")
    
     app.get('/courses',  async (req, res) => {
      const cursor = petCollection.find();
      const result = await cursor.toArray()
      res.send(result)
     })

     app.get('/card',  async (req, res) => {
      const cursor = petCollection.find().limit(4);
      const result = await cursor.toArray()
      res.send(result)
     })


     app.get('/courses/:id',logger , verifyToken, async (req, res) => {
      
      const {id} = req.params ;
      const query = {_id : new ObjectId(id)} ;
      const result = await petCollection.findOne(query)
      res.send(result)
     })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
