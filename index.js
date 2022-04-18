const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json())
const bcrypt = require('bcrypt');
const secret = "abcfghk79685";
let options = {
    origin:"*"
}

app.use(cors(options))

const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
require('dotenv').config({ path: './secure.env' })
const URL = process.env.URL;

const httpServer = createServer(app);
const io = new Server(httpServer, { cors :{
    origin :"*",
} });



// api for portfolio to store the messages and email in separate database kathir guvi portfolio website backend

app.post("/sendmessage",async function(req,res){
    
    try {
     
        let connection = await mongoClient.connect(URL);
        let db = connection.db("portfolio");
        await db.collection("users").insertOne(req.body);
        res.send("sucessfully send")
        connection.close();
    } catch (error) {
        console.log(error)
    }
   })

app.post("/register",async function(req,res){
    
    try {
        let salt = await bcrypt.genSalt(10);
        let hash =await bcrypt.hash(req.body.password,salt);
        req.body.password=hash;
        let connection = await mongoClient.connect(URL);
        let db = connection.db("chatapp");
        let user = await db.collection("users").findOne({email:req.body.email}) 
        if(user){
           res.status(401).json({message:"no user present"}) 
        }else {
           await db.collection("users").insertOne(req.body);
           res.json({message:"sucessfully registered"})
        } 
       
        connection.close();
      
    } catch (error) {
        console.log(error)
    }
   })

//   login for customer


   app.post("/login",async function(req,res){

    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("chatapp");
        await db.collection("users").findOneAndUpdate({email:req.body.email},{$set: {isloggedin: true}});
        let user = await db.collection("users").findOne({email:req.body.email})
        if(user){
            let passwordresult = await bcrypt.compare(req.body.password,user.password)
           
            if(passwordresult){
                let token = jwt.sign({userid:user._id},secret,{expiresIn: "1h"})
               
                user.tokens=token;
                res.json(user)
              
            }else{
              
                res.status(401).json({message:"user id or password invalid"})
            }
        }else{
            res.status(401).json({message:"no user present"})
        }
    } catch (error) {
        console.log(error)
    }
})


// api for logout


app.post("/logout/:email",async function(req,res){

    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("chatapp");
        await db.collection("users").findOneAndUpdate({email:req.params.email},{$set: {isloggedin: false}});
        res.send("loggedout sucessfully")
        connection.close()
      } catch (error) {
        console.log(error)
    }
})


//  api for update password

app.put("/forgot-password",async function(req,res){
    
    try {
        let salt = await bcrypt.genSalt(10);
        let hash =await bcrypt.hash(req.body.password,salt);
        req.body.password=hash;
        let connection =  await mongoClient.connect(URL);
        let db = connection.db("chatapp");
        let user = await db.collection("users").findOne({email:req.body.email});
        if(user){
            let user = await db.collection("users").findOneAndUpdate({email:req.body.email},{$set: {password: hash}});
            res.send("password updated")
        }else{
            res.send("No user exists")
        }
       
        connection.close()
      
    } catch (error) {
        console.log(error)
    }

})


// get users from data
// get the products from database
app.get("/getuser", async function (req, res) {

    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("chatapp");
        let users = await db.collection("users").find({}).toArray()
        connection.close();
        res.send(users)
     
    } catch (error) {
        console.log(error)
    }
})

io.on("connection", (socket) => {
    console.log(`user connected: ${socket.id}`)
    
    socket.on("join_room",(data)=>{
        socket.join(data)
        console.log(data)
        console.log(`user with id : ${socket.id} joined room ${data}`)
    })
    
    socket.on("send_message",(data)=>{
      
       socket.to(data.room).emit("receive_message",data)
    })

    socket.on("disconnect",()=>{
        console.log(`user disconnectd ${socket.id}`)
    })
     
});

httpServer.listen(process.env.PORT || 3001,()=>{
    console.log("server listening")
});
