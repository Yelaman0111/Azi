/* Simple Hello World in Node.js */
console.log("Hello World");

// const move = ["TD", "AS", "7D", "6S"];

// const trumpCard = "H";

// calculateWinner(move, trumpCard);

function calculateWinner(move, trumpCard) {
  const cardItems = ["6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  let cardMast = ["S", "H", "D"];
  cardMast = cardMast.filter((item) => item !== trumpCard);
  cardMast = cardMast.filter((item) => item !== move[0].split("")[1]);
  cardMast.push(move[0].split("")[1]);
  cardMast.push(trumpCard);

  console.log(cardMast);

  let biggestCard = "";
  const biggestCardArray = ["", ""];
  move.forEach((element, index) => {
    const oneMove = element.split("");

    let biggestCardPosition = cardItems.indexOf(biggestCardArray[0]);
    let biggestCardmastPosition = cardMast.indexOf(biggestCardArray[1]);
    let currentCardPosition = cardItems.indexOf(oneMove[0]);
    let currentCardMastPosition = cardMast.indexOf(oneMove[1]);
    // console.log("biggestCard " + biggestCardPosition)
    // console.log("currentCard " + oneMove[0])
    // console.log("currentCardMastPosition " + currentCardMastPosition)
    console.log("element" + element);
    console.log("currentCardMastPosition" + currentCardMastPosition);
    console.log("biggestCardmastPosition" + biggestCardmastPosition);

    if (currentCardMastPosition >= biggestCardmastPosition) {
      if (
        currentCardPosition > biggestCardPosition ||
        (currentCardMastPosition == 2 && biggestCardmastPosition !== 2)
      ) {
        biggestCardArray[0] = oneMove[0];
        biggestCardArray[1] = oneMove[1];
        biggestCard = biggestCardArray.join("");
        console.log(biggestCard);
      }
    }
  });
  console.log(biggestCard);
  return biggestCard;
}

module.exports = { calculateWinner };
