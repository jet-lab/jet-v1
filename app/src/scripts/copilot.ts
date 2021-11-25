import type { Market, User } from '../models/JetTypes';
import { COPILOT, MARKET, USER } from '../store';
import { currencyFormatter } from "./util";
import { dictionary } from './localization';

let market: Market;
let user: User;
MARKET.subscribe(data => market = data);
USER.subscribe(data => user = data);

// Check user's trade and offer Copilot warning
export const checkTradeWarning = (inputAmount: number, adjustedRatio: number, submitTrade: Function): void => {
  // Depositing all SOL leaving no lamports for fees, inform and reject
  if (user.tradeAction === 'deposit' && market.currentReserve?.abbrev === 'SOL'
    && inputAmount >= (user.walletBalances[market.currentReserve.abbrev] - 0.02)) {
    COPILOT.set({
      suggestion: {
        good: false,
        detail: dictionary[user.language].cockpit.insufficientLamports
      }
    });
  // Borrowing and within danger of liquidation
  } else if (user.tradeAction === 'borrow' && adjustedRatio <= market.minColRatio + 0.02) {
    // not below min-ratio, warn and allow trade
    if (adjustedRatio >= market.minColRatio) {
      COPILOT.set({
        suggestion: {
          good: false,
          detail: dictionary[user.language].cockpit.subjectToLiquidation
            .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1)),                        
          action: {
            text: dictionary[user.language].cockpit.confirm,
            onClick: () => submitTrade()
          }
        }
      });
    }
    // below minimum ratio, inform and reject
    if (adjustedRatio < market.minColRatio 
      && adjustedRatio < user.position.colRatio) {
      COPILOT.set({
        suggestion: {
        good: false,
        detail: dictionary[user.language].cockpit.rejectTrade
          .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
        }
      });
    }
  // If user is withdrawing between 125% and 130%, allow trade but warn them
  } else if (user.tradeAction === 'withdraw' && adjustedRatio > 0 && adjustedRatio <= market.programMinColRatio + 0.05) {
    COPILOT.set({
      suggestion: {
        good: false,
        detail: dictionary[user.language].cockpit.subjectToLiquidation
          .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1))
          .replaceAll('borrow', 'withdraw'),                        
        action: {
          text: dictionary[user.language].cockpit.confirm,
          onClick: () => submitTrade()
        }
      }
    });
  // Otherwise, submit trade
  } else {
    submitTrade();
  }
};

// Generate suggestion for user based on their current position and market data
export const generateCopilotSuggestion = (): void => {
  if (!market || !user.assets) {
    COPILOT.set(null);
    return;
  }

  let bestReserveDepositRate = market.reserves.SOL;

  // Find best deposit Rate
  if (market.reserves) {
    for (let a in market.reserves) {
      if (market.reserves[a].depositRate > bestReserveDepositRate.depositRate) {
        bestReserveDepositRate = market.reserves[a];
      }
    };
  }

  // Conditional AI for suggestion generation
  if (user.position.borrowedValue && (user.position.colRatio < market?.minColRatio)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.language].copilot.suggestions.unhealthy.overview,
        detail: dictionary[user.language].copilot.suggestions.unhealthy.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.position.colRatio * 100, false, 1))
          .replaceAll('{{RATIO BELOW AMOUNT}}', Math.abs(Number(currencyFormatter((market.minColRatio - user.position.colRatio) * 100, false, 1))))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100),
        solution: dictionary[user.language].copilot.suggestions.unhealthy.solution,
      }
    });
  } else if (bestReserveDepositRate?.depositRate && !user.assets.tokens[bestReserveDepositRate.abbrev].walletTokenBalance?.isZero()) {
    MARKET.update(market => {
      market.currentReserve = bestReserveDepositRate;
      return market;
    });
    COPILOT.set({
      suggestion: {
        good: true,
        overview: dictionary[user.language].copilot.suggestions.deposit.overview
          .replaceAll('{{BEST DEPOSIT RATE NAME}}', bestReserveDepositRate.name),
        detail: dictionary[user.language].copilot.suggestions.deposit.detail
          .replaceAll('{{BEST DEPOSIT RATE ABBREV}}', bestReserveDepositRate.abbrev)
          .replaceAll('{{DEPOSIT RATE}}', (bestReserveDepositRate.depositRate * 100).toFixed(2))
          .replaceAll('{{USER BALANCE}}', currencyFormatter(user.assets.tokens[bestReserveDepositRate.abbrev].walletTokenBalance.uiAmountFloat, false, 2))
      }
    });
  } else if (user.position.borrowedValue && (user.position.colRatio > market?.minColRatio && user.position.colRatio <= market?.minColRatio + 10)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.language].copilot.warning.tenPercent.overview,
        detail: dictionary[user.language].copilot.warning.tenPercent.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.position.colRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
      }
    });
  } else if (user.position.borrowedValue && (user.position.colRatio >= market?.minColRatio + 10 && user.position.colRatio <= market?.minColRatio + 20)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.language].copilot.warning.twentyPercent.overview,
        detail: dictionary[user.language].copilot.warning.twentyPercent.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.position.colRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
      }
    });
  } else {
    COPILOT.set({
      suggestion: {
        good: true,
        overview: dictionary[user.language].copilot.suggestions.healthy.overview,
        detail: dictionary[user.language].copilot.suggestions.healthy.detail
      }
    });
  }
};