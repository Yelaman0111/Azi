const { validationResult } = require("express-validator");
const { secret } = require("../config");
const jwt = require("jsonwebtoken");

const Place = require("../schemas/PlaceSchema");
const Room = require("../schemas/RoomSchema");

class roomController {
  async create(req, res, next) {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Creation error", errors });
      }
      const { place, name } = req.body;
      const token = req.headers.authorization.split(" ")[1];
      const user = jwt.decode(token, secret);

      Room.create({
        place: place,
        players: [user.id],
      }).then(async (room) => {
        await Place.findByIdAndUpdate(
          { _id: place },
          {
            $addToSet: { rooms: [room] },
          },
          { new: true }
        );

        return res.json({ messge: "room created", room: room });
      });
    } catch (e) {}
  }

  async getRoomsByPlaceId(req, res, next) {
    try {
      const { place } = req.body;

      const rooms = await Room.find({ place: req.params.place });
      res.json({ rooms: rooms });
    } catch (e) {}
  }

  async delete(req, res, next) {
    try {
      let room = await Room.findOne({ _id: req.params.id });

      await Place.findByIdAndUpdate(
        { _id: room.place },
        {
          $pull: { rooms: room._id },
        }
      );

      await Room.findOneAndDelete({ _id: req.params.id }).then(async () => {
        return res.status(204);
      });

    } catch (e) {
      console.log(e);
      res.status(400).json({ message: "error" });
    }
  }
}

module.exports = new roomController();
