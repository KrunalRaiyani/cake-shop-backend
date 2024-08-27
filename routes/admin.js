const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { auth, admin } = require("../middleware/auth");
const router = express.Router();

// Register admin
router.post("/register", async (req, res) => {
  const { name, email, password, isAdmin } = req.body;
  try {
    if (isAdmin !== true) {
      return res
        .status(403)
        .send({ msg: "Cannot register as user through this route." });
    }

    const user = new User({ name, email, password, isAdmin: true });
    await user.save();
    const token = user.generateAuthToken();
    res.status(201).send({
      user: { _id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).send({
        msg: `A user with the email ${error.keyValue.email} already exists.`,
      });
    } else {
      res.status(400).send(error);
    }
  }
});

// Login admin
router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );

    if (!user.isAdmin) {
      return res.status(403).send({
        msg: "Access denied: Only admins can log in via this route.",
      });
    }

    const token = user.generateAuthToken();
    res.send({ token });
  } catch (error) {
    res.status(400).send({ msg: "Login failed" });
  }
});

// Admin: Get all orders
router.get("/orders", auth, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product");
    res.send(orders);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Get order by ID
router.get("/orders/:id", auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product");

    if (!order) {
      return res.status(404).send({ msg: "Order not found" });
    }

    res.send(order);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Update order status
router.patch("/orders/:id", auth, admin, async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ msg: "Order not found" });
    }
    updates.forEach((update) => (order[update] = req.body[update]));
    await order.save();
    res.send(order);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Get all products
router.get("/products", auth, admin, async (req, res) => {
  try {
    const products = await Product.find();
    res.send(products);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Get product by ID
router.get("/products/:id", auth, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ msg: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Dashboard data
router.get("/dashboard", auth, admin, async (req, res) => {
  try {
    // Define all possible order statuses
    const statuses = ["pending", "inProgress", "complete", "canceled"];

    // Get the count of orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert aggregation result to a dictionary with status as keys
    const ordersByStatusCount = ordersByStatus.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Ensure that all statuses are included in the response
    const ordersByStatusWithDefaults = statuses.reduce((acc, status) => {
      acc[status] = ordersByStatusCount[status] || 0;
      return acc;
    }, {});

    // Calculate total orders
    const totalOrders = Object.values(ordersByStatusWithDefaults).reduce(
      (sum, count) => sum + count,
      0
    );

    // Add totalOrders if it's different from the count of completed orders
    if (totalOrders !== ordersByStatusWithDefaults.complete) {
      ordersByStatusWithDefaults.totalOrders = totalOrders;
    }

    // Get the total number of products
    const totalProducts = await Product.countDocuments();

    // Get products by category
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format productsByCategory as an array of objects
    const formattedProductsByCategory = productsByCategory.map((category) => ({
      category: category._id,
      orders: category.count,
    }));

    // Get low stock products
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } });

    // Get total revenue from all completed orders
    const totalRevenue = await Order.aggregate([
      { $match: { status: "complete" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Get the last 10 orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email")
      .populate("items.product");

    // Construct the response object
    const dashboardData = {
      ordersByStatus: ordersByStatusWithDefaults,
      totalProducts,
      productsByCategory: formattedProductsByCategory,
      lowStockProducts: lowStockProducts.length,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      recentOrders,
    };

    res.send(dashboardData);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
