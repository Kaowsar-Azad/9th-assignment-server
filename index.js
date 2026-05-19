const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const app = express()
app.use(cors())
dotenv.config()
app.use(express.json()) ;
const port = process.env.port || 3137 ; 



const uri = process.env.MONGODB_URL;
  

 const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    )


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
  const  token  = authorization?.split(' ')[1];
  if(!token) {
    return res.status(401).json({message : "Unauthorized"})
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    const { payload } = await jwtVerify(token, JWKS)
    req.user = payload;
    next()
  } catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({message : "Unauthorized"})
  }

  
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
   
    const bd = client.db("petdb")
    const petCollection = bd.collection("petDetails")
    const enrollmentCollection = bd.collection("enrollments")
    
     app.get('/courses',  async (req, res) => {

      const { search } = req.query ;
      let cursor ;
      if(search) {
        cursor = petCollection.find({
         $or : [
          {instructor: {$regex : search, $options : 'i'}},
          { title: { $regex : search, $options : 'i' } }
         ]
        })
      }
      else{
         cursor = petCollection.find();
      }

      
      const result = await cursor.toArray()
      console.log(result);
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

     app.get('/enrollments/:id', verifyToken, async (req, res) => {
       try {
         const { id } = req.params;
         const query = { userId: id };
         const result = await enrollmentCollection.find(query).toArray();
         res.send(result);
       } catch (error) {
         console.error("Error fetching enrollments:", error);
         res.status(500).send({ message: "Internal server error" });
       }
     });
     
          app.patch('/enrollments/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const enrollmentData = req.body;
      
      const course = await petCollection.findOne({ _id: new ObjectId(id) });
      if (!course) {
        return res.status(404).json({ message: "Course not found" }); 
      }
     
      
      
      await petCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { enrollCount: 1 },
          $set: {
            lastEnrolledAt: new Date()
          }
        }
      );

      const result = await enrollmentCollection.insertOne({
        ...enrollmentData, 
        enrolledAt: new Date()
      });

      res.send(result);
     });

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
