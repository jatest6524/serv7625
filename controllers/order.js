import { asyncError } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/error.js";
import { stripe } from "../server.js";

export const processPayment = asyncError(async (req, res, next) => {
    const { totalAmount } = req.body;

    const { client_secret } = await stripe.paymentIntents.create({
        amount: Number(totalAmount * 100),
        currency: "USD",
    });

    res.status(200).json({
        success: true,
        client_secret,
    });
});

// Create Order
export const createOrder = asyncError(async (req, res, next) => {
    const {
        shippingInfo,
        orderItems,
        paymentMethod,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingCharges,
        totalAmount,
    } = req.body;

    // Validate stock before creating the order
    for (let i = 0; i < orderItems.length; i++) {
        const product = await Product.findById(orderItems[i].product);
        if (product.stock < orderItems[i].quantity) {
            res.status(400).json({
                success: false,
                message: "Insufficient stock for one or more products.",
            });
            return; // Stop further execution
        }
    }

    try {
        const order = await Order.create({
            user: req.user._id,
            shippingInfo,
            orderItems,
            paymentMethod,
            paymentInfo,
            itemsPrice,
            taxPrice,
            shippingCharges,
            totalAmount,
        });

        // Update stock only after order creation is successful
        for (let i = 0; i < orderItems.length; i++) {
            const product = await Product.findByIdAndUpdate(
                orderItems[i].product,
                { $inc: { stock: -orderItems[i].quantity } },
                { new: true } // Return the updated product document
            );
        }

        res.status(201).json({
            success: true,
            message: "Order Placed Successfully",
        });
    } catch (error) {
        // Handle any errors during order creation or stock updates
        console.log("Processing Error")
        next(error);
    }
});

// Get Admin Order
export const getAdminOrders = asyncError(async (req, res, next) => {
    const orders = await Order.find({});

    res.status(200).json({
        success: true,
        orders,
    });
});

export const getMyOrders = asyncError(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id });

    res.status(200).json({
        success: true,
        orders,
    });
});

export const getOrderDetails = asyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) return next(new ErrorHandler("Order Not Found", 404));

    res.status(200).json({
        success: true,
        order,
    });
});

export const proccessOrder = asyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order Not Found", 404));

    if (order.orderStatus === "Preparing") order.orderStatus = "Shipped";
    else if (order.orderStatus === "Shipped") {
        order.orderStatus = "Delivered";
        order.deliveredAt = new Date(Date.now());
    } else return next(new ErrorHandler("Order Already Delivered", 400));

    await order.save();

    res.status(200).json({
        success: true,
        message: "Order Processed Successfully",
    });
});