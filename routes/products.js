const express = require("express");
const Product = require("../models/Product");
const { auth, admin } = require("../middleware/auth");
const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.send(products);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
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

// Admin: Create product
router.post("/", auth, admin, async (req, res) => {
  const { name, description, price, stock, category, image } = req.body;
  try {
    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      image,
    });
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Update product
router.patch("/:id", auth, admin, async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ msg: "Product not found" });
    }
    updates.forEach((update) => (product[update] = req.body[update]));
    await product.save();
    res.send(product);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Admin: Delete product
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).send({ msg: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
