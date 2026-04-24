require('dotenv').config()
const express = require("express");
const cors = require("cors")
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiters");
const authRouter = require("./routes/authRoutes");
const superAdminRouter = require("./routes/superAdminRoutes");
const userRouter = require("./routes/userRoutes");
const doctorRouter = require("./routes/doctorRoutes");
const availabilityRouter = require("./routes/availabilityRoutes");
const slotRouter = require("./routes/slotRoutes");
const patientRouter = require("./routes/patientRoutes");
const appointmentRouter = require("./routes/appointmentRoutes");
const tokenRouter = require("./routes/tokenRoutes");
const receptionRouter = require("./routes/receptionRoutes");
const dashboardRouter = require("./routes/dashboardRoutes");
const searchRouter = require("./routes/searchRoutes");

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use("/api", apiLimiter);
app.use((req, res, next) => {
    logger.info("Incoming request", {
        method: req.method,
        path: req.path,
    });
    next();
});

app.get("/root", (req,res)=>{
    res.send("backend root");
})

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/super-admin', superAdminRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/doctors', doctorRouter);
app.use('/api/v1', availabilityRouter);
app.use('/api/v1', slotRouter);
app.use('/api/v1/patients', patientRouter);
app.use('/api/v1/appointments', appointmentRouter);
app.use('/api/v1/tokens', tokenRouter);
app.use('/api/v1/reception', receptionRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/search', searchRouter);

app.use(errorHandler);

app.listen(process.env.PORT, ()=>{
    logger.info("Backend is listening", { port: process.env.PORT });
})