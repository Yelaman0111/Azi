const { Deck } = require("./lib/deck");
const Game = require("./schemas/GameSchema");
const Room = require("./schemas/RoomSchema");
const User = require("./schemas/UserSchema");
const jwt = require("jsonwebtoken");
const { secret } = require("./config");
const { GAME_STATE } = require("./constants/index");
const Place = require("./schemas/PlaceSchema");
const test = require("../utils/test");

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

      if (
        room.players.length > 1 &&
        (!game || game.status != GAME_STATE.IN_PROGRESS)
      ) {
        // если попали в эти условие, значит за столом два игрока
        // раздаем на двух игроков

        const deck = new Deck();

        let hands = deck.getHands(room.players);

        let place = await Place.findById(room.place);

        await User.updateMany(
          { _id: { $in: room.players } },
          { $inc: { balance: -place.minBet } }
        );

        // Добавить всем игрокам ставки
        let stavkiZero = [];
        room.players.forEach((player) => {
          stavkiZero.push(place.minBet);
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
          room.players,
          newGame.stavki
        );
      } else {
        // если игроков больше 2х
        // показать всех игроков, козырь, банк, карты на столе
      }
    });

    // Прием ставок в темную
    socket.on("stavka v temku", async (data) => {
      console.log("kto to zatemnil");

      // Нашли игрока который темнит
      const user = jwt.decode(data.user, secret);
      //Находим текущую игру, добавляем темку, увеличиваем банк
      const game1 = await Game.findById(data.gameId).populate("players");
      const currentPlayerPosition = game1.players.findIndex(
        (player) => player._id == user.id
      );

      const stavkaQuery = `stavki.${currentPlayerPosition}`;

      const stavka1 =
        parseInt(game1.stavki[currentPlayerPosition]) +
        parseInt(data.stavka) * 2;
      console.log();
      let game = await Game.findByIdAndUpdate(
        { _id: data.gameId },
        {
          $addToSet: { temki: [data.stavka] },
          // $addToSet: { stavki: [data.stavka*2] },
          $set: { [stavkaQuery]: stavka1 },

          $inc: { bank: data.stavka },
        },
        { new: true }
      )
        .populate("players")
        .populate("room");
      // находим индекс текущекого игрока, для проверки последний ли это игрок
      // let currentPlayerPosition = game.players.findIndex(
      //   (player) => player._id == user.id
      // );

      console.log(currentPlayerPosition);

      // если это последний игрок, то темки закрываются, показываем всем их карты, начинаем прием ставок
      if (currentPlayerPosition + 1 >= game.players.length) {
        console.log("Temki konec" + game.room);

        // let temki = game.temki;

        console.log(game.temki.length);

        // определяем кто должен ставить ставку, если все игроки темнили (кроме раздающего), то ставит раздающий, если не все, то ставит следующий после последнего темнящего
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

        let maxTemka = Math.max(...game.stavki);

        console.log(Math.max(...game.temki));

        let room = await Room.findById(data.roomId).populate("players");

        console.log(game.room._id.toString());

        game.players.forEach(async (player1, i) => {
          console.log("aleert " + player1._id);
          const playerId = player1._id.toString();
          let currentPlayerPositionInRoom = room.players.findIndex(
            (player) => player._id.toString() == player1._id
          );
          // console.log(room.playersSocketId[currentPlayerPositionInRoom]);

          console.log(playerId);

          await User.findByIdAndUpdate(playerId, {
            $inc: { balance: -game.temki[currentPlayerPositionInRoom] },
          });

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
          game.stavki,
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

      const game1 = await Game.findById(data.gameId).populate("players");
      const currentPlayerPosition = game1.players.findIndex(
        (player) => player._id == user.id
      );

      if (data.stavka === 0) {
        // убираем игрока из игры
        // удаляем его и ставки
        // удаляем его hand
        console.log("stavka  0");
        console.log("data.gameId " + data.gameId);

        const playerUnsetIndex = `players.${currentPlayerPosition}`;
        const playerHandUnsetIndex = `hands.${currentPlayerPosition}`;
        const playerStavkaUnsetIndex = `stavki.${currentPlayerPosition}`;

        await Game.findByIdAndUpdate(
          data.gameId,
          {
            $unset: {
              [playerUnsetIndex]: 1,
              [playerHandUnsetIndex]: 1,
              [playerStavkaUnsetIndex]: 1,
            },
          },
          { new: true }
        );
        const game = await Game.findByIdAndUpdate(
          data.gameId,
          {
            $pull: {
              players: null,
              hands: null,
              stavki: null,
            },
          },
          { new: true }
        );
        if (game.players.length < 2) {
          // отстался один игрок, назначить победителем, выбать банк, начать новую игру

          // const user = User.findByIdAndUpdate;
          io.to(data.roomId).emit("winner", game.bank);
        } else {
          //  проверить все ли ставки равны, если нет продолжить прием ставок
        }
        console.log(game);
      } else {
        console.log("Stavka > 0");
        console.log("currentPlayerPosition " + currentPlayerPosition);
        console.log("data.stavka " + data.stavka);
        const stavkaQuery = `stavki.${currentPlayerPosition}`;
        const stavka1 =
          parseInt(game1.stavki[currentPlayerPosition]) + parseInt(data.stavka);

        const game = await Game.findByIdAndUpdate(
          data.gameId,
          {
            $set: { [stavkaQuery]: stavka1 },
            $inc: { bank: data.stavka },
          },
          { new: true }
        ).populate("players");

        // проверить уровнялись ли ставки, если да, то начинаем игру,
        // если нет, то продолжаем прием ставок

        const playerNextToMoveIndex =
          game.players.length === currentPlayerPosition + 1
            ? 0
            : currentPlayerPosition + 1;

        console.log(currentPlayerPosition);
        console.log(playerNextToMoveIndex);
        console.log(game.players[playerNextToMoveIndex]);
        const allEqual = (arr) => arr.every((v) => v === arr[0]);

        if (allEqual(game.stavki)) {
          io.to(data.roomId).emit(
            "move",
            game.players[playerNextToMoveIndex],
            game.stavki,
            game.bank,
            game.firstMove
          );
        } else {
          io.to(data.roomId).emit(
            "next stavka",
            game.players[playerNextToMoveIndex],
            game.stavki,
            game.bank,
            Math.max(...game.stavki)
          );
        }
      }

      // console.log(data);
    });

    // game start
    socket.on("makeMove", async (data) => {
      console.log(data.card);
      const user = jwt.decode(data.user, secret);

      const game1 = await Game.findById(data.gameId).populate("players");
      const currentPlayerPosition = game1.players.findIndex(
        (player) => player._id == user.id
      );
      const firstMoveQuery = `firstMove.${currentPlayerPosition}`;

      const game = await Game.findByIdAndUpdate(
        data.gameId,
        { $addToSet: { firstMove: [data.card] } },
        { new: true }
      ).populate("players");

      const playerNextToMoveIndex =
        game.players.length === currentPlayerPosition + 1
          ? 0
          : currentPlayerPosition + 1;

      if (game.firstMove.length < game.players.length) {
        console.log(game.players[playerNextToMoveIndex]);
        io.to(data.roomId).emit(
          "move",
          game.players[playerNextToMoveIndex],
          game.stavki,
          game.bank,
          game.firstMove
        );
      } else {
        console.log(game.firstMove);
        console.log(game.trumpCard);
        const biggestCard = test.calculateWinner(
          game.firstMove,
          game.trumpCard.slice(-1)
        );

        let firstWinnerIndex = 0;
        game.hands.forEach((element, index) => {
          if (element.includes(biggestCard)) {
            firstWinnerIndex = index;
          }
        });

        await Game.findByIdAndUpdate(data.gameId, {
          $set: { winnerFirst: game.players[firstWinnerIndex] },
        });

        io.to(data.roomId).emit(
          "move2",
          game.players[firstWinnerIndex],
          game.firstMove
        );

        console.log(biggestCard);
        console.log(firstWinnerIndex);
        console.log("считай победителя");
      }
    });

    socket.on("makeMove2", async (data) => {
      console.log("makeMove2");
      console.log(data.card);
      const user = jwt.decode(data.user, secret);

      const game1 = await Game.findById(data.gameId).populate("players");
      const currentPlayerPosition = game1.players.findIndex(
        (player) => player._id == user.id
      );
      const firstMoveQuery = `firstMove.${currentPlayerPosition}`;

      const game = await Game.findByIdAndUpdate(
        data.gameId,
        { $addToSet: { secondMove: [data.card] } },
        { new: true }
      ).populate("players");

      const playerNextToMoveIndex =
        game.players.length === currentPlayerPosition + 1
          ? 0
          : currentPlayerPosition + 1;

      if (game.secondMove.length < game.players.length) {
        console.log(game.players[playerNextToMoveIndex]);
        io.to(data.roomId).emit(
          "move2",
          game.players[playerNextToMoveIndex],
          game.stavki
        );
      } else {
        console.log(game.firstMove);
        console.log(game.trumpCard);
        const biggestCard = test.calculateWinner(
          game.secondMove,
          game.trumpCard.slice(-1)
        );

        let secondWinnerIndex = 0;
        game.hands.forEach((element, index) => {
          if (element.includes(biggestCard)) {
            secondWinnerIndex = index;
          }
        });

        await Game.findByIdAndUpdate(data.gameId, {
          $set: { winnerSecond: game.players[secondWinnerIndex] },
        });

        io.to(data.roomId).emit("move3", game.players[secondWinnerIndex]);

        console.log(biggestCard);
        console.log(secondWinnerIndex);
        console.log("считай победителя");
      }
    });

    socket.on("makeMove3", async (data) => {
      console.log("makeMove3");
      console.log(data.card);
      const user = jwt.decode(data.user, secret);

      const game1 = await Game.findById(data.gameId).populate("players");
      const currentPlayerPosition = game1.players.findIndex(
        (player) => player._id == user.id
      );
      // const firstMoveQuery = `firstMove.${currentPlayerPosition}`;

      const game = await Game.findByIdAndUpdate(
        data.gameId,
        { $addToSet: { thirdMove: [data.card] } },
        { new: true }
      ).populate("players");

      const playerNextToMoveIndex =
        game.players.length === currentPlayerPosition + 1
          ? 0
          : currentPlayerPosition + 1;

      if (game.thirdMove.length < game.players.length) {
        console.log(game.players[playerNextToMoveIndex]);
        io.to(data.roomId).emit(
          "move3",
          game.players[playerNextToMoveIndex],
          game.stavki
        );
      } else {
        console.log(game.firstMove);
        console.log(game.trumpCard);
        const biggestCard = test.calculateWinner(
          game.thirdMove,
          game.trumpCard.slice(-1)
        );

        let therdWinnerIndex = 0;
        game.hands.forEach((element, index) => {
          if (element.includes(biggestCard)) {
            therdWinnerIndex = index;
          }
        });

        await Game.findByIdAndUpdate(data.gameId, {
          $set: { winnerTherd: game.players[therdWinnerIndex] },
        });

        // io.to(data.roomId).emit(
        //   "move3",
        //   game.players[secondWinnerIndex] ,
        // );

        console.log(biggestCard);
        console.log(therdWinnerIndex);
        console.log("считай победителя");
      }
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

      // let socketId = roomForUpdate.playersSocketId[currentPlayerPosition];

      // console.log("leave socket" + socketId);
      // console.log(socketId);
      const playerUnsetIndex = `players.${currentPlayerPosition}`;
      const playersSocketUnsetIndex = `playersSocketId.${currentPlayerPosition}`;

      await Room.findByIdAndUpdate(
        { _id: data.roomId },
        {
          $unset: {
            [playerUnsetIndex]: 1,
            [playersSocketUnsetIndex]: 1,
          },
        },
        { new: true }
      ).populate("players");
      const room = await Room.findByIdAndUpdate(
        data.roomId,
        {
          $pull: {
            players: null,
            playersSocketId: null,
          },
        },
        { new: true }
      );
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
