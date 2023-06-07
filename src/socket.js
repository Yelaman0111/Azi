const { shuffle } = require("./utils");
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
      let room = await Room.findByIdAndUpdate(
        { _id: data.roomId },
        {
          $addToSet: { players: [user?.id] },
        },
        { new: true }
      ).populate("players");

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
      if (room.players.length > 1 && game?.status != GAME_STATE.IN_PROGRESS) {
        // если попали в эти условие, значит за столом два игрока
        // раздаем на двух игроков

        //Создаем карты
        let cardItems = ["A", "K", "Q", "J", "10", "9", "8", "7", "6"];
        let cardMast = ["S", "H", "D"];
        //создаем колоду
        let stack = [];
        cardItems.forEach((cardItem) => {
          cardMast.forEach((cardMast) => {
            stack.push(cardItem + cardMast);
          });
        });

        // Перемешиваем колоду
        shuffle(stack);

        // Раздаем карты
        let hands = [];
        for (let i = 0; i < room.players.length; i++) {
          let hand = [];
          for (let j = 0; j < 3; j++) {
            hand.push(stack.pop());
          }
          hands.push(hand);
        }

    // Message.updateMany({chat: req.params.chatId}, { $addToSet: { readBy: req.session.user._id } })

        let place = await Place.findById(room.place);

       await  User.updateMany({_id: {$in: room.players}}, {$inc: {balance: -place.minBet}});

        // Создаем новую игру
        let newGame = await Game.create({
          players: room.players,
          hands: hands,
          status: GAME_STATE.IN_PROGRESS,
          trumpCard: stack.pop(),
          room: room,
          temki: [0],
          bank: room.players.length * place.minBet
        });

        // выдаем козырную карту
        // io.to(data.roomId).emit("kozir", newGame.trumpCard, newGame._id, newGame.bank, room.players);

        //  спрашиваем у второго игрока будет ли он темнить ,
        io.to(data.roomId).emit("temka", newGame.players[1]._id, newGame._id, newGame.bank, room.players);
      }
    });

    // Прием ставок в темную
    socket.on("stavka v temku", async (data)=> {
      console.log("kto to zatemnil")
      // Нашли игрока который темнит
      const user = jwt.decode(data.user, secret);
      //Находим текущую игру, добавляем темку, увеличиваем банк
      let game = await Game.findByIdAndUpdate(
        { _id: data.gameId },
        {
          $addToSet: { temki: [data.stavka] },
          $inc: { bank: 100}
        },
        { new: true }
      ).populate("players");
      // находим индекс текущекого игрока, для проверки последний ли это игрок
      let currentPlayerPosition = game.players.findIndex( player => player._id == user.id);

      console.log(currentPlayerPosition)

      // если это последний игрок, то темки закрываются, показываем всем их карты, начинаем прием ставок
      if(currentPlayerPosition+1 >=  game.players.length){

        console.log("Temki konec" + game.room)

        // let temki = game.temki;

        // console.log(temki.length);

        // определяем кто должен ставить ставку, если все игроки темнили (кроме раздающего), то ставит раздающий, если не все, то ставит тот кто не темнил 
        // ПЕРЕДЕЛАТЬ 
        let playerToMove = game.players.length === game.temki.length ? 0: game.temki.length + 1 ;
        

        // надо узнать максимальную темку

        let maxTemka = Math.max(game.temki) * 2;

        console.log(Math.max(game.temki))
        io.to(data.roomId).emit("stavki v temku prinyaty", game.hands, game.bank, 
        game.players, game.players[playerToMove], game.trumpCard, maxTemka );      

      }else{
        console.log("temki dalshe")
        //  спрашиваем у след игрока темку
      }
     
    })


















    socket.on("leave room", async (data) => {
      console.log("leave" + data.roomId);
      const user = jwt.decode(data.user, secret);
      console.log("user " + user.id);
      socket.leave(data.roomId);

      let room = await Room.findByIdAndUpdate(
        { _id: data.roomId },
        {
          $pull: { players: user.id },
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
