import type { Market, User, } from '../models/JetTypes';
import { COPILOT, MARKET, USER } from '../store';
import { currencyFormatter } from "./util";
import { dictionary } from './localization';

let market: Market;
let user: User;
MARKET.subscribe(data => market = data);
USER.subscribe(data => user = data);

// Check user's trade and offer Copilot warning
export const checkTradeWarning = (inputAmount: number, adjustedRatio: number, submitTrade: Function): void => {
  // If user is bettering their position, submit trade either way
  if (adjustedRatio < user.obligation().colRatio) {
    // Depositing
    if (user.tradeAction === 'deposit') {
      // Depositing all SOL leaving no lamports for fees, reject
      const lamportPadding = 0.02;
      if (market.currentReserve?.abbrev === 'SOL' && inputAmount <= user.maxInput()
        && (user.walletBalance() - lamportPadding) <= inputAmount) {
        COPILOT.set({
          suggestion: {
            good: false,
            detail: dictionary[user.preferredLanguage].cockpit.insufficientLamports
          }
        });
      }
    // Borrowing
    } else if (user.tradeAction === 'borrow') {
      // and within danger of liquidation
      if (adjustedRatio >= market.minColRatio && adjustedRatio <= market.minColRatio + 0.2) {
        COPILOT.set({
          suggestion: {
            good: false,
            detail: dictionary[user.preferredLanguage].cockpit.subjectToLiquidation
              .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1)),                        
            action: {
              text: dictionary[user.preferredLanguage].cockpit.confirm,
              onClick: () => submitTrade()
            }
          }
        });
      }
      // and below minimum ratio
      if (adjustedRatio < market.minColRatio 
        && adjustedRatio < user.obligation().colRatio) {
        COPILOT.set({
          suggestion: {
          good: false,
          detail: dictionary[user.preferredLanguage].cockpit.rejectTrade
            .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1))
            .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
          }
        });
      }
    }
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
  if (user.obligation().borrowedValue && (user.obligation().colRatio < market?.minColRatio)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.preferredLanguage].copilot.suggestions.unhealthy.overview,
        detail: dictionary[user.preferredLanguage].copilot.suggestions.unhealthy.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.obligation().colRatio * 100, false, 1))
          .replaceAll('{{RATIO BELOW AMOUNT}}', Math.abs(Number(currencyFormatter((market.minColRatio - user.obligation().colRatio) * 100, false, 1))))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100),
        solution: dictionary[user.preferredLanguage].copilot.suggestions.unhealthy.solution,
        action: {
          onClick: () => USER.update(user => {
            user.warnedOfLiquidation = true;
            return user;
          })
        } 
      }
    });
  } else if (bestReserveDepositRate?.depositRate && !user.assets.tokens[bestReserveDepositRate.abbrev].walletTokenBalance?.amount.isZero()) {
    USER.update(user => {
      market.currentReserve = bestReserveDepositRate;
      return user;
    })
    COPILOT.set({
      suggestion: {
        good: true,
        overview: dictionary[user.preferredLanguage].copilot.suggestions.deposit.overview
          .replaceAll('{{BEST DEPOSIT RATE NAME}}', bestReserveDepositRate.name),
        detail: dictionary[user.preferredLanguage].copilot.suggestions.deposit.detail
          .replaceAll('{{BEST DEPOSIT RATE ABBREV}}', bestReserveDepositRate.abbrev)
          .replaceAll('{{DEPOSIT RATE}}', (bestReserveDepositRate.depositRate * 100).toFixed(2))
          .replaceAll('{{USER BALANCE}}', currencyFormatter(user.assets.tokens[bestReserveDepositRate.abbrev].walletTokenBalance.uiAmountFloat, false, 2))
      }
    });
  } else if (user.obligation().borrowedValue && (user.obligation().colRatio > market?.minColRatio && user.obligation().colRatio <= market?.minColRatio + 10)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.preferredLanguage].copilot.warning.tenPercent.overview,
        detail: dictionary[user.preferredLanguage].copilot.warning.tenPercent.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.obligation().colRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
      }
    });
  } else if (user.obligation().borrowedValue && (user.obligation().colRatio >= market?.minColRatio + 10 && user.obligation().colRatio <= market?.minColRatio + 20)) {
    COPILOT.set({
      suggestion: {
        good: false,
        overview: dictionary[user.preferredLanguage].copilot.warning.twentyPercent.overview,
        detail: dictionary[user.preferredLanguage].copilot.warning.twentyPercent.detail
          .replaceAll('{{C-RATIO}}', currencyFormatter(user.obligation().colRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', market.minColRatio * 100)
      }
    });
  } else {
    COPILOT.set({
      suggestion: {
        good: true,
        overview: dictionary[user.preferredLanguage].copilot.suggestions.healthy.overview,
        detail: dictionary[user.preferredLanguage].copilot.suggestions.healthy.detail
      }
    });
  }
};