class Deck {
  #cards = [];
  trumpCard = "";

  constructor() {
    this.#createCards();
    this.#shuffle();
    this.#takeTrumpCard();
  }

  getHands(playersCount) {
    const hands = [1, 2, 3];
    playersCount.forEach(() => {
      const hand = [];
      for (let j = 0; j < 3; j++) {
        hand.push(this.#cards.pop());
      }
      hands.push(hand);
    });
    return hands;
  }

  #takeTrumpCard() {
    this.trumpCard = this.#cards.pop();
  }

  #createCards() {
    const cardItems = ["A", "K", "Q", "J", "T", "9", "8", "7", "6"];
    const cardMast = ["S", "H", "D"];

    cardItems.forEach((cardItem) => {
      cardMast.forEach((cardMast) => {
        this.#cards.push(cardItem + cardMast);
      });
    });
  }

  #shuffle() {
    const array = this.#cards;
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }
}

module.exports = { Deck };
