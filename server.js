import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import cloudinary from "cloudinary";
import Stripe from "stripe";

// Load environment variables
config();

// Init Express
const app = express();

// Init Stripe
export const stripe = new Stripe(process.env.STRIPE_API_SECRET);

// Init Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to MongoDB Atlas using mongoose
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log("Connected to MongoDB Atlas successfully!");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    });


// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        origin: [process.env.FRONTEND_URI_1, process.env.FRONTEND_URI_2, process.env.LOCALHOST],
    })
);

// Routes
app.get("/", (req, res, next) => {
    res.send("Working");
});

// Import and use Routers
import userRouter from "./routes/user.js";
import productRouter from "./routes/product.js";
import orderRouter from "./routes/order.js";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/order", orderRouter);

// Error Middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
