const { validationResult } = require("express-validator");
const Place = require("../schemas/PlaceSchema");

class placeController {
  async createPlace(req, res, next) {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Creation error", errors });
      }

      const { name, minBet, maxBet } = req.body;
      const candidate = await Place.findOne({ name });

      if (candidate) {
        return res.status(400).json({ message: "Place exists" });
      }

      const place = new Place({
        name,
        minBet,
        maxBet,
      });
      place.save();

      return res.json({ messge: "place created", place: place });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: "Creation error" });
    }
  }

  async getAllPlaces(req, res, next) {
    try {
      const places = await Place.find();
      res.json({ places });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: "error" });
    }
  }

  async deletePlace(req, res, next) {
    try {
      await Place.findOneAndDelete({ _id: req.params.id });
      res.status(204).json({ message: "deleted" });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: "error" });
    }
  }

  async updatePlace(req, res, next) {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Creation error", errors });
      }

      const { name, minBet, maxBet } = req.body;
      const candidate = await Place.findOne({ name });

      if (candidate) {
        return res.status(400).json({ message: "Place exists" });
      }
      let place = await Place.findOneAndUpdate(
        { _id: req.params.id },
        { name, minBet, maxBet },
        { new: true }
      );
      res.status(200).json({ place: place });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: "error" });
    }
  }
}

module.exports = new placeController();
