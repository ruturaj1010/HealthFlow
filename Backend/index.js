require('dotenv').config()
const express = require("express");
const cors = require("cors")
const { connectDB } = require("./DB/db");
const userRouter = require("./routers/userRouter");

const app = express();

connectDB();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.get("/root", (req,res)=>{
    res.send("backend root");
})

app.get('/users', userRouter);

app.listen(process.env.PORT, ()=>{
    console.log("Backend is listening");
})