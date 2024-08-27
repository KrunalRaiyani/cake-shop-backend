const express = require("express");
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Submit order
router.post("/", auth, async (req, res) => {
  const { items, totalAmount, status, address, productStatus } = req.body;
  console.log(req.body);
  try {
    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      status,
      address,
      productStatus,
    });
    await order.save();
    res.status(201).send(order);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all orders for user
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate(
      "items.product"
    );
    res.send(orders);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get order by ID for user
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) {
      return res.status(404).send({ msg: "Order not found" });
    }
    res.send(order);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
