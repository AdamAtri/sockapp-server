const {assert} = require('chai');
const rv = require('../game/roll-validator');

describe('RollValidator', function() {

  describe('#validateCard', function() {
    it ('should return "shooter" for [bb, ii, gg, bi] and their uppercase cognates.', function() {
      let rolls = [
        ['b', 'b'], ['B', 'i'], ['I', 'b'], ['g', 'G'], ['G', 'G'], ['B','B'], ['i','i'], ['I', 'B']
      ];
      rolls.forEach(r => {
        assert.equal('shooter', rv.validateCard(r), `expected ${r} to return "shooter"`);
      });
    });
    it ('should return "bingo" for [nn, oo, ff, fo] and their uppercase cognates.', function() {
      let rolls = [
        ['f', 'f'], ['FREE', 'o'], ['O', 'f'], ['N', 'n'], ['o', 'O'], ['N','N'], ['F','F'], ['free', 'free']
      ];
      rolls.forEach(r => {assert.equal('bingo', rv.validateCard(r), `expected ${r} to return "bingo"`);});
    });
    it ('should return "no-draw" for anything that isn\'t a shooter or bingo.', function() {
      let rolls = [
        ['f', 'b'], ['FREE', 'G'], ['O', 'i'], ['N', 'B'], ['o', 'B'], ['N','F'], ['F','i'], ['free', 'n']
      ];
      rolls.forEach(r => {assert.equal('no-draw', rv.validateCard(r), `expected ${r} to return "no-draw"`);});
    });
  });

  describe('#isWinner', function() {
    let mockgame = {type: 'single-line'};
    it('should return "TRUE" if a "shooter" is rolled on a single-line game.', function() {
      assert.isTrue(rv.isWinner(mockgame, ['b', 'b']));
    });
    it('should return "TRUE" if a "bingo" is rolled on a single-line game.', function() {
      assert.isTrue(rv.isWinner(mockgame, ['free', 'o']));
    });
    it('should return "FALSE" if a "no-draw" is rolled on a single-line game.', function() {
      assert.isFalse(rv.isWinner(mockgame, ['free', 'b']));
    });
    it('should return "FALSE" if a "shooter" or a "bingo" is rolled on a NON single-line game.', function() {
      mockgame.type = 'corners';
      assert.isFalse(rv.isWinner(mockgame, ['free', 'o']));
      assert.isFalse(rv.isWinner(mockgame, ['b', 'b']));
    });
  });

  describe('#updateWinners', function() {
    let cardMap;
    let shooter_roll = ['b', 'b']; // shooter winner
    let bingo_roll = ['n', 'n']; // bingo winner
    let mockgame = {
      type: 'single-line',
      cards: [
        {
          card: 'shooter',
          amt: 100,
          commission: 5,
          userId: '123456',
          result: null
        },
        {
          card: 'bingo',
          amt: 100,
          commission: 5,
          userId: '123457',
          result: null
        },
        {
          card: 'bingo',
          amt: 50,
          commission: 2.5,
          userId: '123458',
          result: null
        }
      ]
    };
    it ('should return a function when provided rollData and a validation type (card / bonus)', function() {
      cardMap = rv.updateWinners(shooter_roll, 'card'); // shooter wins
      assert.isFunction(cardMap);
    });
    it ('if "shooter" wins, cardMap should update shooter cards with winnings information.', function() {
      let mappedCards = mockgame.cards.map(cardMap);
      assert.notEqual(mappedCards, mockgame.cards);
      assert.equal(mappedCards[0].result, 205);
      assert.equal(mappedCards[1].result, 'collected');
      assert.equal(mappedCards[2].result, 'collected');
    });
    it ('should update bingo cards with winnings information if "bingo" wins.', function() {
      cardMap = rv.updateWinners(bingo_roll, 'card'); // bingo wins
      let mappedCards = mockgame.cards.map(cardMap);
      assert.notEqual(mappedCards, mockgame.cards);
      assert.equal(mappedCards[0].result, 'collected');
      assert.equal(mappedCards[1].result, 205);
      assert.equal(mappedCards[2].result, 102.5);
    });
  });
});
