interface ErrCodeList {
  [index: string] : [string, string]
}

const programErrCodeList: ErrCodeList = {
  '300': [ 'ArithmeticError', 'failed to perform some math operation safely' ],
  '301':
   [ 'InvalidOracle', 'oracle account provided is not valid' ],
  '302': [
    'NoFreeReserves',
    'no free space left to add a new reserve in the market'
  ],
  '303': [
    'NoFreeObligation',
    'no free space left to add the new loan or collateral in an obligation'
  ],
  '304': [
    'UnregisteredPosition',
    "the obligation account doesn't have any record of the loan or collateral account"
  ],
  '305': [
    'InvalidOraclePrice',
    'the oracle price account has an invalid price value'
  ],
  '306': [
    'InsufficientCollateral',
    'there is not enough collateral deposited to borrow against'
  ],
  '307': [
    'SimultaneousDepositAndBorrow',
    'cannot both deposit collateral to and borrow from the same reserve'
  ],
  '308': [ 'ObligationHealthy', 'cannot liquidate a healthy position' ],
  '309': [
    'ObligationUnhealthy',
    'cannot perform an action that would leave the obligation unhealthy'
  ],
  '310': [
    'ExceptionalReserveState',
    'reserve requires special action; call refresh_reserve until up to date'
  ],
  '311': [
    'InvalidAmountUnits',
    'the units provided in the amount are not valid for the instruction'
  ],
  '312': [
    'InvalidDexMarketMints',
    "the tokens in the DEX market don't match the reserve and lending market quote token"
  ],
  '313': [
    'InvalidMarketAuthority',
    "the market authority provided doesn't match the market account"
  ],
  '314': [
    'InvalidLiquidationQuoteTokenAccount',
    'the quote token account provided cannot be used for liquidations'
  ],
  '315': [
    'ObligationAccountMismatch',
    "the obligation account doesn't have the collateral/loan registered"
  ],
  '316': [ 'UnknownInstruction', 'unknown instruction' ],
  '317': [
    'Disallowed',
    'current conditions prevent an action from being performed'
  ],
  '318': [
    'LiquidationSwapSlipped',
    'the actual slipped amount on the DEX trade exceeded the threshold configured'
  ],
  '319': [
    'CollateralValueTooSmall',
    'the collateral value is too small for a DEX trade'
  ],
  '320': [
    'LiquidationLowCollateral',
    'the collateral returned by the liquidation is smaller than requested'
  ],
  '321': [
    'NotSupported',
    'this action is currently not supported by this version of the program'
  ]
}

//Take the
export const translateAndPrintErrorCode = (errCode: string): string => {
  console.error(`Program Error Code: ${errCode} - ${programErrCodeList[errCode][0]} - ${programErrCodeList[errCode][0]}`);
  return `Program Error Code: ${errCode} - ${programErrCodeList[errCode][0]} - ${programErrCodeList[errCode][0]}`;
};

//get the custom program error code if there's any in the error message and return parsed error code hex to number string
export const getErrorCode = (errMessage: string): string => {
  const index = errMessage.indexOf('custom program error:');
  if(index == -1) {
    return ('No error code explanation'); 
  } else {
    console.log(errMessage.substring(index + 22,  index + 28).replace(' ', ''))
    return `${parseInt(errMessage.substring(index + 22,  index + 28).replace(' ', ''), 16)}`
  }
}


