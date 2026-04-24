require('dotenv').config()
const express = require("express");
const cors = require("cors")
const authRouter = require("./routes/authRoutes");
const superAdminRouter = require("./routes/superAdminRoutes");
const userRouter = require("./routes/userRoutes");
const doctorRouter = require("./routes/doctorRoutes");

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.get("/root", (req,res)=>{
    res.send("backend root");
})

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/super-admin', superAdminRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/doctors', doctorRouter);

app.listen(process.env.PORT, ()=>{
    console.log("Backend is listening");
})