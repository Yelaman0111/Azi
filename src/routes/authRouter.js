const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const controller = require("../controllers/authController");
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post(
  "/registration",
  // [
  //   check("username", "Invalid username").notEmpty(),
  //   check("password", "Invalid password").isLength({ min: 4 }),
  // ],
  controller.registration
);
router.post("/login", controller.login);
router.get("/users", authMiddleware, controller.getUsers);
router.get("/me", authMiddleware, controller.getMe);
router.get("/users2", roleMiddleware(["ADMIN"]), controller.getUsers);

module.exports = router;
