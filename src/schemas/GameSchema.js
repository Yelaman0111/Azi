const { Schema, model } = require("mongoose");

const GameSchema = new Schema(
  {
    players: [{ type: Schema.Types.ObjectId, ref: "User" }],// игроки
    hands: [[{ type: String }]],// раздача, у кого какие карты
    status: { type: Number, require: true }, // 1 - в процессе 2-завершена
    trumpCard: { type: String },// козырь - должна быть карта
    temki: [{ type: String }],// ставки в темную
    stavki: [{ type: String }],// ставки
    bank: { type: Number },// общий банк
    firstMove: [{ type: String }],// первый ход
    secondMove: [{ type: String }],// второй ход
    thirdMove: [{ type: String }],// третий ход
    firstToMove: { type: Schema.Types.ObjectId, ref: "User" }, //чей первый ход
    winnerFirst: { type: Schema.Types.ObjectId, ref: "User" }, // победитель первой раздачи
    winnerSecond: { type: Schema.Types.ObjectId, ref: "User" }, // победитель второй раздачи
    winnerTherd: { type: Schema.Types.ObjectId, ref: "User" }, // победитель третей раздачи
    winner: { type: Schema.Types.ObjectId, ref: "User" }, // победитель
    room: { type: Schema.Types.ObjectId, ref: "Room" }, // комната к которой связана игра
  },
  { timestamps: true }
);

module.exports = model("Game", GameSchema);


// {
//   playerId: 1,
//   hand: [1,2,3],
//   temka: 0,
//   stavka: 100,

// }