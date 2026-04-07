const mongoose = require('mongoose');

module.exports = connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Database connected succesfully");

    } catch (error) {
        console.log("ERROR IN DB", error.message)
    }
}