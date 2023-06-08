const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RoomSchema = new Schema(
  {
    players: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: [playersLimit, "{PATH} exceeds the limit of 6"],
    },
    playersSocketId:  [{ type: String }],
    place: { type: Schema.Types.ObjectId, ref: "Place" },
  },
  { timestamps: true }
);
function playersLimit(val) {
  return val.length <= 6 && val.length > 0;
}

var Room = mongoose.model("Room", RoomSchema);
module.exports = Room;
