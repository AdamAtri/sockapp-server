// Roll Validation

module.exports = (function() {

  'use strict';

  const
    SHOOTER = ['BB', 'II', 'GG', 'BI', 'IB'],
    BINGO = ['NN', 'OO', 'FF', 'FO', 'OF'];

  const rollValidator = {

    // Expects `roll` to be an array of two dice rolls: ['b', 'i']
    validateCard: function(roll) {
      if (SHOOTER.indexOf(roll.join('').toUpperCase()) > -1) return 'shooter';
      if (BINGO.indexOf(roll.map(r => r.toUpperCase() === 'FREE' ? 'F' : r)
                            .join('')
                            .toUpperCase()
                        ) > -1) return 'bingo';
      return 'no-draw';
    },

    isWinner: function isWinner(game, rollData) {
      let card = this.validateCard(rollData);
      if (card === 'no-draw') return false;
      if (game.type === 'single-line' && card !== 'no-draw') return true;
      // TODO: evaluate other game types
      return false;
    },

    updateWinners: function(rollData, type) {
      let multiplier = type === 'card' ? 2 :
                       type === 'bonus' ? 5 : 0;
      let card = this.validateCard(rollData);
      return function(bet) {
        let isWinner = bet.card === card;
        bet.result = isWinner ? (bet.amt * multiplier) : 'collected';
        if (type === 'card' && isWinner) bet.result += bet.commission || 0;
        return bet;
      };
    }
  };

  return rollValidator;
})();
