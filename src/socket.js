const { Deck } = require("./lib/deck");
const Game = require("./schemas/GameSchema");
const Room = require("./schemas/RoomSchema");
const User = require("./schemas/UserSchema");
const jwt = require("jsonwebtoken");
const { secret } = require("./config");
const { GAME_STATE } = require("./constants/index");
const Place = require("./schemas/PlaceSchema");

module.exports = function startSocketServer(io) {
  io.on("connection", (socket) => {
    //Зайти в комнату
    socket.on("room", async (data) => {
      //достаем пользователя кто заходит
      const user = jwt.decode(data.user, secret);
      // Добавляем в бд в комнату

      console.log("socket id  :" + socket.id);
      console.log("user  :" + user.id);
      console.log("socket id  :" + socket.id);

      let room = await Room.findByIdAndUpdate(
        { _id: data.roomId },
        {
          $addToSet: { players: [user.id], playersSocketId: [socket.id] },
        },
        { new: true }
      ).populate("players");

      // console.log(room);
      // добавляем в сокет комнату
      socket.join(data.roomId);

      // Ищем последнюю игру в комнате
      let game = await Game.findOne(
        { room: room._id },
        {},
        { sort: { createdAt: -1 } }
      );

      let players = room.players; // количество игроков в комнате

      // передаем всем игроков в комнате
      io.to(data.roomId).emit("playersInRoom", players);

      // Проверить сколько человек в комнате
      // Если больше одного Проверить есть ли текущая игра в комнате
      if (room.players.length > 1 && game.status != GAME_STATE.IN_PROGRESS) {
        // если попали в эти условие, значит за столом два игрока
        // раздаем на двух игроков

        const deck = new Deck();

        let hands = deck.getHands(room.players.length);

        let place = await Place.findById(room.place);

        await User.updateMany(
          { _id: { $in: room.players } },
          { $inc: { balance: -place.minBet } }
        );

        // Добавить всем игрокам ставки
        let stavkiZero = [];
        room.players.forEach(player => {
          stavkiZero.push(0);
        });

        // Создаем новую игру
        let newGame = await Game.create({
          players: room.players,
          hands: hands,
          status: GAME_STATE.IN_PROGRESS,
          trumpCard: deck.trumpCard,
          room: room,
          temki: [0],
          stavki: stavkiZero,
          bank: room.players.length * place.minBet,
        });

        // выдаем козырную карту
        // io.to(data.roomId).emit("kozir", newGame.trumpCard, newGame._id, newGame.bank, room.players);

        //  спрашиваем у второго игрока будет ли он темнить ,
        io.to(data.roomId).emit(
          "temka",
          newGame.players[1]._id,
          newGame._id,
          newGame.bank,
          room.players
        );
      }
    });

    // Прием ставок в темную
    socket.on("stavka v temku", async (data) => {
      console.log("kto to zatemnil");
      // Нашли игрока который темнит
      const user = jwt.decode(data.user, secret);
      //Находим текущую игру, добавляем темку, увеличиваем банк
      let game = await Game.findByIdAndUpdate(
        { _id: data.gameId },
        {
          $addToSet: { temki: [data.stavka] },
          $inc: { bank: 100 },
        },
        { new: true }
      )
        .populate("players")
        .populate("room");
      // находим индекс текущекого игрока, для проверки последний ли это игрок
      let currentPlayerPosition = game.players.findIndex(
        (player) => player._id == user.id
      );

      console.log(currentPlayerPosition);

      // если это последний игрок, то темки закрываются, показываем всем их карты, начинаем прием ставок
      if (currentPlayerPosition + 1 >= game.players.length) {
        console.log("Temki konec" + game.room);

        // let temki = game.temki;

        // console.log(temki.length);

        // определяем кто должен ставить ставку, если все игроки темнили (кроме раздающего), то ставит раздающий, если не все, то ставит тот кто не темнил
        // ПЕРЕДЕЛАТЬ

        let indexOfLastNonZeroTemka = game.temki.findLastIndex(
          (temka) => temka != 0
        );
        console.log(indexOfLastNonZeroTemka);

        let playerToMove =
          game.players.length === indexOfLastNonZeroTemka + 1
            ? 0
            : indexOfLastNonZeroTemka + 1;

        // надо узнать максимальную темку

        let maxTemka = Math.max(...game.temki) * 2;

        console.log(Math.max(...game.temki));

        let room = await Room.findById(data.roomId).populate("players");

        console.log(game.room._id.toString());

        game.players.forEach((player1, i) => {
          console.log("aleert " + player1._id);
          let currentPlayerPositionInRoom = room.players.findIndex(
            (player) => player._id.toString() == player1._id
          );
          console.log(room.playersSocketId[currentPlayerPositionInRoom]);
          console.log(game.hands[i]);

          io.to(room.playersSocketId[currentPlayerPositionInRoom]).emit(
            "hand",
            game.hands[i]
          );
        });

        io.to(data.roomId).emit(
          "stavki v temku prinyaty",
          game.bank,
          game.players,
          game.players[playerToMove],
          game.trumpCard,
          maxTemka
        );
      } else {
        console.log("temki dalshe");
        // io.to(data.roomId).emit("temka", game.players[currentPlayerPosition+1]._id, game._id, game.bank, game.players);

        //  спрашиваем у след игрока темку
      }
    });

    socket.on("stavka", async (data) => {
      const user = jwt.decode(data.user, secret);

      if (data.stavka === 0) {
        // убираем игрока из игры
        // удаляем его темки и ставки
        // удаляем его hand
      }

      let game = await Game.findById(data.gameId).populate("players");

      console.log(data);
    });

    socket.on("leave room", async (data) => {
      console.log("roomId " + data.roomId);
      console.log("user " + data.user);
      const user = jwt.decode(data.user, secret);
      console.log("user " + user.id);
      socket.leave(data.roomId);

      let roomForUpdate = await Room.findById(data.roomId).populate("players");

      let currentPlayerPosition = roomForUpdate.players.findIndex(
        (player) => player._id == user.id
      );

      console.log(currentPlayerPosition);

      let socketId = roomForUpdate.playersSocketId[currentPlayerPosition];

      console.log("leave socket" + socketId);
      // console.log(socketId);
      let room = await Room.findByIdAndUpdate(
        { _id: data.roomId },
        {
          $pull: { players: user.id, playersSocketId: socketId },
        },
        { new: true }
      ).populate("players");

      if (room.players.length < 2) {
        await Game.findOneAndUpdate(
          { room: room._id, status: GAME_STATE.IN_PROGRESS },
          { status: GAME_STATE.FINISHED },
          { sort: { createdAt: -1 } }
        );
      }
      socket.to(data.roomId).emit("leave room", room.players);
    });
  });
};
