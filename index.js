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
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const JWKS = createRemoteJWKSet(
      new URL(`${clientUrl}/api/auth/jwks`)
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
   //  await client.connect();
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
   
    const bd = client.db("petdb")
    const petCollection = bd.collection("petDetails")
    const enrollmentCollection = bd.collection("enrollments")
    
     app.get('/courses',  async (req, res) => {
      const { search, category } = req.query;
      const filters = [];

      if (category) {
        const categories = category.split(',').map(c => c.trim()).filter(Boolean);
        if (categories.length > 0) {
          filters.push({ species: { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) } });
        }
      }

      if (search) {
        filters.push({
          $or: [
            { petName: { $regex: search, $options: 'i' } },
            { species: { $regex: search, $options: 'i' } },
            { breed: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { instructor: { $regex: search, $options: 'i' } },
          ],
        });
      }

      const query = filters.length ? { $and: filters } : {};
      const result = await petCollection.find(query).toArray();
      res.send(result);
     })

     app.post('/courses', async (req, res) => {
       const newCourse = req.body;
       const result = await petCollection.insertOne(newCourse);
       res.send(result);
     })


     app.get('/card',  async (req, res) => {
      const cursor = petCollection.find().limit(6);
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

      const ownerEmail = course.ownerEmail?.toLowerCase().trim();
      const userEmail = (
        req.user?.email || enrollmentData.studentEmail || '').toLowerCase().trim();

      if (ownerEmail && userEmail && ownerEmail === userEmail) {
        return res.status(403).json({
          message: "You cannot adopt a pet you listed yourself.",
        });
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

     app.get('/enrollments/pet/:petId', verifyToken, async (req, res) => {
       try {
         const { petId } = req.params;
         const query = { courseId: petId };
         const result = await enrollmentCollection.find(query).toArray();
         res.send(result);
       } catch (error) {
         res.status(500).send({ message: "Internal server error" });
       }
     });

     app.patch('/enrollments/update/:enrollmentId', verifyToken, async (req, res) => {
       try {
         const { enrollmentId } = req.params;
         const { status } = req.body;
         if (!['Approved', 'Rejected'].includes(status)) {
           return res.status(400).json({ message: "Invalid status" });
         }
         const result = await enrollmentCollection.updateOne(
           { _id: new ObjectId(enrollmentId) },
           { $set: 
            { status, updatedAt: new Date() } }
         );
         res.send(result);
       } catch (error) {
         res.status(500).send({ message: "Internal server error" });
       }
     });

     app.delete('/enrollments/cancel/:enrollmentId', verifyToken, async (req, res) => {
       try {
         const { enrollmentId } = req.params;
            const result = await enrollmentCollection.deleteOne({ _id: new ObjectId(enrollmentId) });
         res.send(result);
       } catch (error) {
         res.status(500).send({ message: "Internal server error" });
       }
     });

     app.patch('/courses/update/:id', verifyToken, async (req, res) => {
       try {
         const { id } = req.params;
         const updateData = req.body;
         const userEmail = req.user?.email?.toLowerCase().trim();
         const pet = await petCollection.findOne({ _id: new ObjectId(id) });
         if (!pet) return res.status(404).json({ message: "Pet not found" });
         if (pet.ownerEmail?.toLowerCase().trim() !== userEmail) {
           return res.status(403).json({ message: "You are not the owner of this pet." });
         }
         delete updateData._id;
         const result = await petCollection.updateOne(
           { _id: new ObjectId(id) },
           { $set: { ...updateData, updatedAt: new Date() } }
         );
         res.send(result);
       } catch (error) {

         res.status(500).send({ message: "Internal server error" });
       }
     });

     app.delete('/courses/delete/:id', verifyToken, async (req, res) => {
       try {
         const { id } = req.params;
         const userEmail = req.user?.email?.toLowerCase().trim();

         const pet = await petCollection.findOne({ _id: new ObjectId(id) });
         if (!pet) return res.status(404).json({ message: "Pet not found" });
         
         if (pet.ownerEmail?.toLowerCase().trim() !== userEmail) {
           return res.status(403).json({ message: "You are not the owner of this pet." });
         }
         const result = await petCollection.deleteOne({ _id: new ObjectId(id) });
         res.send(result);
       } catch (error) {
         res.status(500).send({ message: "Internal server error" });
       }
     });



    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
