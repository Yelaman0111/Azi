const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const controller = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/",
  [
    check("place", "Invalid username").notEmpty(),
    authMiddleware,
  ],
  controller.create
);
router.delete("/:id", authMiddleware, controller.delete);
router.get("/:place", authMiddleware, controller.getRoomsByPlaceId);

module.exports = router;
