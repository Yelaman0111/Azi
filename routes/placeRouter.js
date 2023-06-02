const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const controller = require("../controllers/placeController");
const roleMiddleware = require("../middleware/roleMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/",
  [
    check("name", "Invalid username").notEmpty(),
    check("minBet", "Invalid minBet").notEmpty(),
    check("maxBet", "Invalid maxBet").notEmpty(),
    roleMiddleware(["ADMIN"]),
  ],
  controller.createPlace
);
router.get("/", authMiddleware, controller.getAllPlaces);
router.delete("/:id", roleMiddleware(["ADMIN"]), controller.deletePlace);
router.put(
  "/:id",
  [
    check("name", "Invalid username").notEmpty(),
    check("minBet", "Invalid minBet").notEmpty(),
    check("maxBet", "Invalid maxBet").notEmpty(),
    roleMiddleware(["ADMIN"]),
  ],
  controller.updatePlace
);

module.exports = router;
