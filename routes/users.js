const express = require("express");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (req.body.isAdmin) {
      return res
        .status(403)
        .send({ msg: "Cannot register as admin through this route." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .send({ msg: "User already registered with this email." });
    }

    const user = new User({ name, email, password });
    await user.save();
    const token = user.generateAuthToken();
    res.status(201).send({ msg: "User registered successfully.", token });
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

router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );

    if (user.isAdmin) {
      return res
        .status(403)
        .send({ msg: "Access denied: Admins cannot log in via this route." });
    }

    const token = user.generateAuthToken();
    res.send({ token });
  } catch (error) {
    res.status(400).send({ msg: "Login failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  res.send(req.user);
});

module.exports = router;
