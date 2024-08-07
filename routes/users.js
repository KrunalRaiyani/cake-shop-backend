const express = require("express");
const User = require("../models/User");
const { auth } = require("../middleware/auth"); // Adjusted import to include only the 'auth' middleware
const router = express.Router();

// Register user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (req.body.isAdmin) {
      return res
        .status(403)
        .send({ error: "Cannot register as admin through this route." });
    }

    const user = new User({ name, email, password });
    await user.save();
    const token = user.generateAuthToken();
    res.status(201).send({
      user: { _id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).send({
        error: `A user with the email ${error.keyValue.email} already exists.`,
      });
    } else {
      res.status(400).send(error);
    }
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );

    // Check if the user is an admin
    if (user.isAdmin) {
      return res
        .status(403)
        .send({ error: "Access denied: Admins cannot log in via this route." });
    }

    const token = user.generateAuthToken();
    // Send only the token
    res.send({ token });
  } catch (error) {
    res.status(400).send({ error: "Login failed" });
  }
});

// Get user profile
router.get("/me", auth, async (req, res) => {
  res.send(req.user);
});

module.exports = router;
