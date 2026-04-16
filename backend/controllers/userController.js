const User = require("../models/User");
const bcrypt = require("bcryptjs");

const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9._]{4,15}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const emailRegex = /^\S+@\S+\.\S+$/;

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({ message: "Server error fetching profile." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body || {};

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const noFieldsProvided =
      username === undefined &&
      email === undefined &&
      password === undefined &&
      confirmPassword === undefined;

    if (noFieldsProvided) {
      return res.status(400).json({ message: "No fields provided for update." });
    }

    let newUsername = username;
    let newEmail = email;

    if (newUsername !== undefined) {
      newUsername = newUsername.trim().toLowerCase();

      if (!newUsername) {
        return res.status(400).json({ message: "Username cannot be empty." });
      }

      if (!usernameRegex.test(newUsername)) {
        return res.status(400).json({
          message:
            "Username must be 4-15 characters, contain only letters, numbers, underscore or dot, and include at least one letter.",
        });
      }

      if (newUsername !== user.username) {
        const existingUsername = await User.findOne({ username: newUsername });
        if (existingUsername) {
          return res.status(409).json({ message: "Username is already taken." });
        }
      }

      user.username = newUsername;
    }

    if (newEmail !== undefined) {
      newEmail = newEmail.trim().toLowerCase();

      if (!newEmail) {
        return res.status(400).json({ message: "Email cannot be empty." });
      }

      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      if (newEmail !== user.email) {
        const existingEmail = await User.findOne({ email: newEmail });
        if (existingEmail) {
          return res.status(409).json({ message: "Email is already in use." });
        }
      }

      user.email = newEmail;
    }

    const passwordProvided =
      password !== undefined || confirmPassword !== undefined;

    if (passwordProvided) {
      if (!password || !confirmPassword) {
        return res.status(400).json({
          message: "Both password and confirmPassword are required to change password.",
        });
      }

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include at least one uppercase letter, one number, and one special character.",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Server error updating profile." });
  }
};

module.exports = { getProfile, updateProfile };
