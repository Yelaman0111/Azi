const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PlaceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    minBet: { type: Number, required: true, trim: true},
    maxBet: { type: Number, required: true, trim: true},
    rooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
  },
  { timestamps: true }
);

var Place = mongoose.model("Place", PlaceSchema);
module.exports = Place;
