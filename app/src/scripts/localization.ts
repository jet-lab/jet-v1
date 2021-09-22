import type { Locale } from '../models/JetTypes';
import { GEOBANNED, LOCALE, PREFERRED_LANGUAGE } from '../store';

// Get user's preferred language from browser
// Use fallback if not
export const getLocale = async (): Promise<void> => {
  let locale: Locale | null;
  let language = window.navigator.languages[1];
  let preferredLanguage = localStorage.getItem('jetPreferredLanguage');
  if (!Object.keys(dictionary).includes(language)) {
    language = 'en';
  }
  if (preferredLanguage) {
    language = preferredLanguage;
  }

  try {
    const resp = await fetch('https://ipinfo.io/json?token=46ceefa5641a93', {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });

    locale = await resp.json();
    geoBannedCountries.forEach(c => {
      if (!locale?.country || c.code === locale?.country) {
  // If country is Ukraine, checks if first two digits
  // of the postal code further match Crimean postal codes.
        if (locale?.country === "UA") {
          const ifCrimea: string = locale?.postal.toString().substring(0, 2);
          ifCrimea === ("95" || "96" || "97" || "98") ? GEOBANNED.set(true) : null
        } else {
          GEOBANNED.set(true);
        }
      }
    });

    // Set language and locale
    PREFERRED_LANGUAGE.set(language);
    LOCALE.set(locale ?? null);
  } catch (err) {
    console.log(err);
  }

  return;
};

// Update language store and preference
export const updateLanguage = (language: string): void => {
  PREFERRED_LANGUAGE.set(language);
  localStorage.setItem('jetPreferredLanguage', language);
};

// Banned countries
export const geoBannedCountries = [
  {
    country: "Afghanistan",
    code: "AF"
  }, 
  {
    country: "Crimea (Ukraine)",
    code: "UA"
  }, 
  {
    country: "Cuba",
    code: "CU"
  }, 
  {
    country: "Democratic Republic of Congo",
    code: "CD"
  }, 
  {
    country: "Iran",
    code: "IR"
  }, 
  {
    country: "Iraq",
    code: "IQ"
  }, 
  {
    country: "Libya",
    code: "LY"
  }, 
  {
    country: "North Korea",
    code: "KP"
  }, 
  {
    country: "Sudan",
    code: "SD"
  }, 
  {
    country: "Syria",
    code: "SY"
  },
  {
    country: "Tajikistan",
    code: "TJ"
  },
  {
    country: "Venezuela",
    code: "VE"
  }
];

// Dictionary of UI text throughout Jet
export const dictionary: any = {
  // English
  en: {
    language: "English",
    loading: {
      transactions: "Sending Transactions...",
      connectingWallet: "Connecting Wallet..."
    },
    nav: {
      cockpit: "Cockpit",
      settings: "Settings",
      collapse: "Collapse",
      getCopilotSuggestion: "Get Copilot Suggestion",
      disconnectWallet: "Disconnect Wallet"
    },
    cockpit: {
      title: "Cockpit",
      asset: "Asset",
      detail: "Detail",
      native: "Native",
      totalValueLocked: "Locked Market Value",
      totalBorrowed: "Total Borrowed",
      availableLiquidity: "Available Liquidity",
      amountDeposited: "Deposited",
      amountBorrowed: "Borrowed",
      depositRate: "Deposit Rate",
      borrowRate: "Borrow Rate",
      airdrop: "Airdrop",
      totalDepositedValue: "Your Deposited Value",
      totalBorrowedValue: "Your Borrowed Value",
      yourRatio: "Your C-Ratio",
      collateralizationRatio: "Collateralization Ratio",
      noInputAmount: "Enter amount.",
      adjustedCollateralization: "Adjusted C-Ratio",
      deposit: "Deposit",
      walletBalance: "Wallet Balance",
      noDepositAmount: "Enter amount",
      notEnoughAsset: "Not enough {{ASSET}}.",
      withdraw: "Withdraw",
      availableFunds: "Available Funds",
      lessFunds: "Not enough funds",
      borrow: "Borrow",
      maxBorrowAmount: "Maximum Borrow",
      assetIsCurrentDeposit: "You've deposited {{ASSET}} and therefore can't borrow it.",
      noLiquidity: "Not enough liquidity.",
      minCRatio: "This will put your position at our minimum collateralization ratio, therefore placing your account in liquidation territory. Are you sure?",
      belowMinRatio: "You are undercollateralized. Deposit or repay your debt to avoid liquidation.",
      subjectToLiquidation: "This trade lowers your collateralization ratio to {{NEW-C-RATIO}}%, which makes you subject to liquidation. There is also an origination fee of {{ORIGINATION FEE}}% attached to this loan. Would you still like to borrow?",
      confirm: "Confirm",
      repay: "Repay",
      amountOwed: "Amount Owed",
      oweLess: "You owe less.",
      geobanned: "Jet Protocol is not available in your region.",
      noMarket: "We were unable to initialize the Jet marketplace.",
      txSuccess: "Success! Your {{TRADE ACTION}} of {{AMOUNT AND ASSET}} was received. Check out the transaction on the <a href='{{EXPLORER LINK}}' class='text-gradient' target='_blank' style='margin: unset; font-weight: bold;'>explorer</a>.",
      txFailed: "Transaction failed. Not sure what went wrong, please try again later or contact us.",
      max: "Max",
      assetIsCurrentBorrow: "You've borrowed {{ASSET}} and therefore can't deposit it.",
      belowMinCRatio: "You are undercollateralized. Deposit or repay your debt to avoid liquidation.",
      search: "Search Market..",
      noBalanceForDeposit: "You have no {{ASSET}} in your wallet to deposit.",
      noDepositsForBorrow: "You must deposit collateral in order to borrow.",
      noDepositsForWithdraw: "You have not deposited any {{ASSET}} to withdraw.",
      noDebtForRepay: "You don't owe any {{ASSET}}.",
      rejectTrade: "This trade would lower your collateralization ratio to {{NEW-C-RATIO}}%, which would be below our minimum ratio of {{JET MIN C-RATIO}}.",
      insufficientLamports: "You are depositing all your SOL leaving you no lamports for transaction fees! Please try again with a slightly lower input amount."
    },
    settings: {
      title: "Settings",
      wallet: "Wallet",
      connect: "Connect",
      worldOfDefi: "Connect your wallet to the world of DeFi.",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      language: "Language"
    },
    reserveDetail: {
      reserveSize: "Reserve Size",
      availableLiquidity: "Available Liquidity",
      utilisationRate: "Utilisation Rate",
      viewHistory: "View History",
      totalBorrowed: "Total Borrowed",
      maximumLTV: "Maximum LTV",
      liquidationPremium: "Liquidation Premium",
      tradeAsset: "Trade {{ASSET}}",
      minimumCollateralizationRatio: "Minimum C-Ratio"
    },
    copilot: {
      name: "Copilot",
      header: "Hey, Copilot here.",
      okay: "Okay",
      suggestions: {
        unhealthy: {
          overview: "Your account is unhealthy.",
          detail: "Your Collateralization Ratio (your total deposited value divided by your total borrowed value) is {{C-RATIO}}% which is {{RATIO BELOW AMOUNT}}% less than Jet marketplace's minimum collateralization ratio of {{JET MIN C-RATIO}}%.",
          solution: "In order to correct your position, you can deposit more collateral, but I suggest you repay your debt in the Cockpit.",
          actionText: "Go To Cockpit"
        },
        warning: {
          tenPercent: {
            overview: "You are dangerously close to liquidation.",
            detail: "Your Collateralization Ratio (your total deposited value divided by your total borrowed value) is {{C-RATIO}}% which is within 10% of Jet marketplace's minimum collateralization ratio of {{JET MIN C-RATIO}}%.",
            solution: "In order to avoid liquidation, you can deposit more collateral.",
            actionText: "Deposit"
          },
          twentyPercent: {
            overview: "Keep an eye on your collateralization ratio.",
            detail: "Your Collateralization Ratio (your total deposited value divided by your total borrowed value) is {{C-RATIO}}% which is less than 20% above Jet marketplace's minimum collateralization ratio of {{JET MIN C-RATIO}}%.",
            solution: "Raise your collateralization ratio to healthy levels of 20% or more by depositing more collateral.",
            actionText: "Deposit"
          }
        },
        deposit: {
          overview: "{{BEST DEPOSIT RATE NAME}} is lookin' good right now.",
          detail: "<b class='bold'>{{BEST DEPOSIT RATE ABBREV}}</b> has the best deposit <b class='bold'>rate</b> in the market right now at <b class='bold'>{{DEPOSIT RATE}}%</b>, and your account is in good standing so we recommend adding some collateral by depositing a portion of your <b class='bold'>{{USER BALANCE}} {{BEST DEPOSIT RATE ABBREV}}</b>.",
          actionText: "Let's Do It"
        },
        healthy: {
          overview: "Skies are clear.",
          detail: "Your account is in good standing and is healthily over-collateralized, let me take a look at the market and see if I can suggest some good moves for you. Check back with me later!"
        }
      },
      alert: {
        failed: "Mayday!",
        success: "Success!",
        airdropSuccess: "We have Airdropped you {{UI AMOUNT}} {{RESERVE ABBREV}}. Please refresh the app to see your new balance.",
        refresh: "Refresh",
        originationFee: "There is a fee of {{ORIGINATION FEE}}% attached to this loan.",
        headsup: "Heads up!"
      }
    }
  },
  // Mandarin
  zh: {
    language: "中文",
    loading: {
      transactions: "交易发送中。。。",
      connectingWallet: "钱包连结中。。。"
    },
    nav: {
      cockpit: "驾驶舱",
      settings: "设定",
      collapse: "缩起",
      getCopilotSuggestion: "获取副驾驶建议",
      disconnectWallet: "断开钱包"
    },
    cockpit: {
      title: "驾驶舱",
      asset: "资产",
      detail: "详细",
      native: "原生",
      totalValueLocked: "总锁仓量",
      totalBorrowed: "借贷总额",
      availableLiquidity: "可用流动性",
      amountDeposited: "存款金额",
      amountBorrowed: "借贷金额",
      depositRate: "存款率",
      borrowRate: "借贷率",
      airdrop: "Airdrop",
      totalDepositedValue: "存款总价值",
      totalBorrowedValue: "借贷总额",
      yourRatio: "您的质押率",
      collateralizationRatio: "质押率",
      noInputAmount: "输入金额",
      adjustedCollateralization: "调整过质押率",
      deposit: "存款",
      walletBalance: "你的钱包余额",
      noDepositAmount: "输入金额",
      notEnoughAsset: "{{ASSET}} 不够",
      withdraw: "取款",
      availableFunds: "可用资产",
      lessFunds: "资产不够",
      borrow: "借贷",
      maxBorrowAmount: "最高可借贷金额",
      assetIsCurrentDeposit: "您已存入 {{ASSET}}，因此无法借用。",
      noLiquidity: "流动性不足",
      minCRatio: "这将使您的头寸处于我们的最低抵押率，从而使您的账户处于清算区域。 你确定吗？",
      belowMinRatio: "您已低于最小质押率。请多存一些抵押物或偿还一些债务",
      subjectToLiquidation: "您这个交易会降低质押率到 {{NEW-C-RATIO}}% 比 Jet 要求的质押率还低 从而使您的账户处于清算区域。你确定吗？",
      confirm: "确认",
      repay: "偿还",
      amountOwed: "以借贷金额",
      oweLess: "借贷金额减少",
      geobanned: "您住的地方不尊许您用 Jet Protocol。",
      noMarket: "我们没办法开启Jet的交易市场",
      txSuccess: "成功了! 我们收到您的 {{AMOUNT AND ASSET}} {{TRADE ACTION}}。您可以在這查看您的交易 <a href='{{EXPLORER LINK}}' class='text-gradient' target='_blank' style='margin: unset; font-weight: bold;'>explorer</a>。",
      txFailed: "交易失败。失败原因不太清楚， 请您再试一次或是跟我们联系。",
      max: "全部",
      assetIsCurrentBorrow: "你已经借了{{ASSET}} 所以无法存入此资产。",
      belowMinCRatio: "您已低于最小质押率。请多存一些抵押物或偿还一些债务。",
      search: "搜索市场",
      noBalanceForDeposit: "您钱包里没有任何 {{ASSET}} 来存款.",
      noDepositsForBorrow: "您需要存抵押物才能再借款",
      noDepositsForWithdraw: "您没有存任何 {{ASSET}} 来提款.",
      noDebtForRepay: "您不欠任何 {{ASSET}}.",
      rejectTrade: "这个交易手续会降低您的质押率到 {{NEW-C-RATIO}}%, 而且会比我们的对低质押率限制 {{JET MIN C-RATIO}} 还低.",
      insufficientLamports: "You are depositing all your SOL leaving you no lamports for transaction fees! Please try again with a slightly lower input amount."
    },
    settings: {
      title: "设定",
      wallet: "钱包",
      connect: "连结",
      worldOfDefi: "连结到 DeFi 世界",
      theme: "模式",
      light: "明亮",
      dark: "黑暗",
      language: "语言"
    },
    reserveDetail: {
      reserveSize: "储备规模",
      availableLiquidity: "可用流动性",
      utilisationRate: "使用率",
      viewHistory: "查看历史",
      totalBorrowed: "总借贷金额",
      maximumLTV: "最高LTV",
      liquidationPremium: "清算溢价",
      tradeAsset: "交易 {{ASSET}}",
      minimumCollateralizationRatio: "最低质押率限制"
    },
    copilot: {
      name: "副驾驶",
      header: "嘿 我是你的副驾驶。",
      okay: "Okay",
      suggestions: {
        unhealthy: {
          overview: "您的帐号健康度不良",
          detail: "您的质押率 {{C-RATIO}}% 比 Jet 要求的质押率还低 {{RATIO BELOW AMOUNT}}%。Jet 要求的最低质押率是 {{JET MIN C-RATIO}}%",
          solution: "为了更正您的仓位，您可以存入更多的抵押品，但我建议您在 '驾驶舱' 中偿还您的债务。",
          actionText: "去驾驶舱"
        },
        warning: {
          tenPercent: {
            overview: "小心 您快被清算了！",
            detail: "您的质押率 {{C-RATIO}}% 比 Jet 要求的质押率还低 10%。Jet 要求的质押率是 {{JET MIN C-RATIO}}%",
            solution: "为了避免您被清算 我建议您多存一点抵押物",
            actionText: "再存抵押物"
          },
          twentyPercent: {
            overview: "注意您的质押率！",
            detail: "您的质押率 {{C-RATIO}}% 比 Jet 要求的质押率还低 20%。Jet 要求的质押率是 {{JET MIN C-RATIO}}%",
            solution: "多存一点抵押物来增加你的质押率，将您的质押率提高到 20% 或更高的健康水平",
            actionText: "再存抵押物"
          }
        },
        deposit: {
          overview: "{{BEST DEPOSIT RATE NAME}} 看起来不错",
          detail: "<b class='bold'>{{BEST DEPOSIT RATE ABBREV}}</b> 现在有市场上最高的 <b class='bold'>借贷率</b>。您的帐号健康度不错 我建议您多存一点您的 <b class='bold'>{{USER BALANCE}} {{BEST DEPOSIT RATE ABBREV}}</b>。",
          actionText: "再存抵押物"
        },
        healthy: {
          overview: "天气晴朗",
          detail: "您的帐号现在健康度不错 我去看看现在的市场 看可不可您做几个建议"
        }
      },
      alert: {
        failed: "失败了!",
        success: "成功了!",
        airdropSuccess: "我们已经寄给您 {{AMOUNT}} {{RESERVE ABBREV}}。请更新您到网页。",
        refresh: "更新网页",
        originationFee: "这笔贷款会收取 {{ORIGINATION FEE}}% 发起费用.",
        headsup: "小心!"
      }
    }
  },
  //Russian
  ru: {
    language: "Русский",
    loading: {
      transactions: "Транзакции отправляются...",
      connectingWallet: "Кошелёк подключается..."
    },
    nav: {
      cockpit: "Кабина",
      settings: "Настройки",
      collapse: "Свернуть",
      getCopilotSuggestion: "Get Copilot Suggestion",
      disconnectWallet: "Disconnect Wallet"
    },
    cockpit: {
      title: "Кабина",
      asset: "Актив",
      detail: "Подробнее",
      native: "Базовая",
      totalValueLocked: "Зарезервированная рыночная стоимость",
      totalBorrowed: "Общая сумма займов",
      availableLiquidity: "Доступная ликвидность",
      amountDeposited: "Депозит",
      amountBorrowed: "Займ",
      depositRate: "ГПД депозита",
      borrowRate: "ГПС займа",
      airdrop: "Airdrop",
      totalDepositedValue: "Сумма ваших депозитов",
      totalBorrowedValue: "Сумма ваших займов",
      yourRatio: "Ваш КО",
      collateralizationRatio: "Коэффициент обеспечения",
      noInputAmount: "Введите сумму.",
      adjustedCollateralization: "Скорректированный КО",
      deposit: "Пополнить",
      walletBalance: "Баланс кошелька",
      noDepositAmount: "Введите сумму",
      notEnoughAsset: "Недостаточно {{ASSET}}.",
      withdraw: "вывести",
      availableFunds: "Доступные средства",
      lessFunds: "Недостаточно средств",
      borrow: "Занять",
      maxBorrowAmount: "Максимальный займ",
      assetIsCurrentDeposit: "Вы предоставили {{ASSET}} и вы не можете занять его же.",
      noLiquidity: "Недостаточно ликвидности.",
      minCRatio: "Это действие приведёт к тому, что ваша позиция достигнет минимума коэффициента обеспечения, и ваш счёт может быть подвергнут ликвидации. Вы уверены?",
      belowMinRatio: "У вас недостаточно средств в залоге. Пополните залог или верните долг чтобы избежать ликвидации.",
      subjectToLiquidation: "Эта сделка понизит ваш коэффициент обеспечения до {{NEW-C-RATIO}}%, после чего ваш счёт может быть подвергнут ликвидации. Вы всё-равно хотите занять?",
      confirm: "Подтвердить",
      repay: "Вернуть",
      amountOwed: "Сумма долга",
      oweLess: "Вы должны меньше.",
      geobanned: "Jet протокол не доступен в вашем регионе.",
      noMarket: "площадка Jet не смогла запуститься.",
      txSuccess: "Успез! Ваш(а) {{TRADE ACTION}} на {{AMOUNT AND ASSET}} получен(а). Проверить транзакцию в <a href='{{EXPLORER LINK}}' class='text-gradient' target='_blank' style='margin: unset; font-weight: bold;'>обозревателе</a>.",
      txFailed: "Транзакция не прошла. Мы не уверены, что пошло не так. Попробуйте еще раз позже или свяжитесь с нами.",
      max: "Max",
      assetIsCurrentBorrow: "Вы одолжили {{ASSET}}, поэтому не можете его внести на депозит",
      belowMinCRatio: "У вас недостаточно средств в залоге. Пополните залог или верните долг чтобы избежать ликвидации.",
      search: "Поиск валюты",
      noBalanceForDeposit: "У Вас нету {{ASSET}} в кошельке, чтобы внести на депозит",
      noDepositsForBorrow: "Вы должны предоставить залог, чтобы вы могли занять.",
      noDepositsForWithdraw: "Вы не внесли на депозит {{ASSET}} чтобы вывести",
      noDebtForRepay: "Вы не дожны {{ASSET}}.",
      rejectTrade: "Сделка понизит ваш коэфициент залог {{NEW-C-RATIO}}%, что будет ниже минимального уровня {{JET MIN C-RATIO}}",
      insufficientLamports: "You are depositing all your SOL leaving you no lamports for transaction fees! Please try again with a slightly lower input amount."
    },
    settings: {
      title: "Настройки",
      wallet: "Кошелёк",
      connect: "Подключиться",
      worldOfDefi: "Подключить ваш кошелек к миру DeFi.",
      theme: "Тема",
      light: "Светлая",
      dark: "Тёмная",
      language: "Язык"
    },
    reserveDetail: {
      reserveSize: "Размер резерва",
      availableLiquidity: "Доступная ликвидность",
      utilisationRate: "Коэффициент использования",
      viewHistory: "Показать историю",
      totalBorrowed: "Всего занято",
      maximumLTV: "Максимальный КДЗ",
      liquidationPremium: "Ликвидационная надбавка",
      tradeAsset: "Торговать {{ASSET}}",
      minimumCollateralizationRatio: "Минимальный КО"
    },
    copilot: {
      name: "Второй пилот",
      header: "Привет от второго пилота.",
      okay: "Хорошо",
      suggestions: {
        unhealthy: {
          overview: "Ваш счёт нездоров.",
          detail: "Ваш коэффициент обеспечения (сумма вашего залога поделённая на сумму ваших займов) сейчас {{C-RATIO}}%, что на {{RATIO BELOW AMOUNT}}% меньше, чем минимальный КО {{JET MIN C-RATIO}}% на торговой площадке Jet.",
          solution: "Чтобы исправить ваше положение, вы можете внести больше залога, но я вам рекомендую лучше вернуть долг в Кабине.",
          actionText: "Перейти в Кабину"
        },
        warning: {
          tenPercent: {
            overview: "Вы опасно близки к ликвидации.",
            detail: "Ваш коэффициент обеспечения (сумма вашего залога поделённая на сумму ваших займов) сейчас {{C-RATIO}}%, что в пределах 10% минимального КО {{JET MIN C-RATIO}}% на торговой площадке Jet.",
            solution: "Чтобы избежать ликвидации, вы можете пополнить ваш залог.",
            actionText: "Пополнить"
          },
          twentyPercent: {
            overview: "Уделите внимание вашему коэффициенту обеспечения.",
            detail: "Ваш коэффициент обеспечения (сумма вашего залога поделённая на сумму ваших займов) сейчас {{C-RATIO}}%, что менее чем на 20% выше минимального КО {{JET MIN C-RATIO}}% на торговой площадке Jet.",
            solution: "Повысьте ваш коэффициент обеспечения до здорового уровня 20% или более посредством пополнения вашего залога.",
            actionText: "Пополнить"
          }
        },
        deposit: {
          overview: "{{BEST DEPOSIT RATE NAME}} в данный момент выглядит неплохо.",
          detail: "<b class='bold'>{{BEST DEPOSIT RATE ABBREV}}</b> сейчас предлагает лучшую <b class='bold'>ГПД (годовую процентную доходность)</b> депозита на рынке в <b class='bold'>{{DEPOSIT RATE}}%</b>, и ваш счёт находится в хорошем состоянии, так что мы рекомендуем пополнить ваш залог, используя часть вашего <b class='bold'>{{USER BALANCE}} {{BEST DEPOSIT RATE ABBREV}}</b>.",
          actionText: "Полетели"
        },
        healthy: {
          overview: "Небо чистое.",
          detail: "Ваш счёт в хорошем состоянии и имеет здоровый уровень залога, так что я просмотрю рынок и попробую предложить вам какие-то хорошие варианты. Загляните сюда еще раз попозже!"
        }
      },
      alert: {
        failed: "Неудача!",
        success: "Успех!",
        airdropSuccess: "Вы получили Airdrop {{UI AMOUNT}} {{RESERVE ABBREV}}. Пожалуйста, обновите страницу чтобы увидеть новый баланс.",
        refresh: "Обновить",
        originationFee: "Этот займ выдается с комиссией {{ORIGINATION FEE}}%",
        headsup: "Heads up!"
      }
    }
  },
  //Turkish
  tr: {
    language: "Türkçe",
    loading: {
      transactions: "İşleminiz yapılıyor...",
      connectingWallet: "Cüzdan bağlanıyor..."
    },
    nav: {
      cockpit: "Kokpit",
      settings: "Ayarlar",
      collapse: "Kollaps",
      getCopilotSuggestion: "Get Copilot Suggestion",
      disconnectWallet: "Disconnect Wallet"
    },
    cockpit: {
      title: "Kokpit",
      asset: "Varlık",
      detail: "Detay",
      native: "Özgün",
      totalValueLocked: "Kilitli Piyasa Değeri",
      totalBorrowed: "Toplam Ödünç Alınan",
      availableLiquidity: "Uygun Likidite",
      amountDeposited: "Yatırılan",
      amountBorrowed: "Ödünç alınmış",
      depositRate: "Yatırma APY'si",
      borrowRate: "Borç alma APY'si",
      airdrop: "Airdrop",
      totalDepositedValue: "Yatırılan varlık değeriniz",
      totalBorrowedValue: "Ödünç Aldığınız Varlık",
      yourRatio: "C-Oranınız",
      collateralizationRatio: "Teminat Oranı",
      noInputAmount: "Miktar girin",
      adjustedCollateralization: "Düzeltilmiş C-Oranı",
      deposit: "Yatırma",
      walletBalance: "Cüzdan Bakiyesi",
      noDepositAmount: "Miktar girin",
      notEnoughAsset: "Yeterli {{ASSET}} yok.",
      withdraw: "Çekim",
      availableFunds: "Kullanılabilir Fonlar",
      lessFunds: "Yeterli fon yok",
      borrow: "Borç al",
      maxBorrowAmount: "Maksimum Borç",
      assetIsCurrentDeposit: "{{ASSET}} yatırdığınız için ödünç alamazsınız.",
      noLiquidity: "Yeterli likidite yok.",
      minCRatio: "Bu işlem, pozisyonunuzu minimum teminat oranına alacaktır. Dolayısıyla hesabınız, likidasyon bölgesine girecektir. Bu işlemi yapmayı istediğinize emin misiniz?",
      belowMinRatio: "Yeterli teminata sahip değilsiniz. Likidasyondan kaçınmak için para yatırın veya borcunuzu geri ödeyin.",
      subjectToLiquidation: "Bu işlem, likidasyon oranınızı %{{NEW-C-RATIO}} 'ya düşürür ve bu da sizi likidasyona tabi kılar. Yine de ödünç almak ister misin?",
      confirm: "Onayla",
      repay: "Geri öde",
      amountOwed: "Borçlu Tutar",
      oweLess: "Daha az borçlusun.",
      geobanned: "Jet Protocol bölgenizde kullanılamıyor.",
      noMarket: "Jet pazaryerini başlatamadık.",
      txSuccess: "Başarılı! {{AMOUNT AND ASSET}} tutarındaki  {{TRADE ACTION}} alındı. <a href='{{EXPLORER LINK}}' class='text-gradient' target='_blank' style='margin: unset; font-weight: bold;'>explorer</a>'da işleme göz atın.",
      txFailed: "İşlem başarısız. Neyin yanlış gittiğinden emin değilim, lütfen daha sonra tekrar deneyin veya bizimle iletişime geçin.",
      max: "Maksimum",
      assetIsCurrentBorrow: "{{ASSET}} ödünç aldınız ve bu nedenle yatıramazsınız.",
      belowMinCRatio: "Teminatınız yetersiz. Likidasyondan kaçınmak için para yatırın veya borcunuzu geri ödeyin.",
      search: "Pazar arama..",
      noBalanceForDeposit: "You have no {{ASSET}} in your wallet to deposit.",
      noDepositsForBorrow: "Ödünç almak için teminat yatırmanız gerekiyor.",
      noDepositsForWithdraw: "You have not deposited any {{ASSET}} to withdraw.",
      noDebtForRepay: "You don't owe any {{ASSET}}.",
      rejectTrade: "This trade would lower your collateralization ratio to {{NEW-C-RATIO}}%, which would be below our minimum ratio of {{JET MIN C-RATIO}}.",
      insufficientLamports: "You are depositing all your SOL leaving you no lamports for transaction fees! Please try again with a slightly lower input amount."
    },
    settings: {
      title: "Ayarlar",
      wallet: "Cüzdan",
      connect: "Bağlan",
      worldOfDefi: "Cüzdanınızı DeFi dünyasına bağlayın.",
      theme: "Tema",
      light: "Aydınlık",
      dark: "Karanlık",
      language: "Dil"
    },
    reserveDetail: {
      reserveSize: "Rezerv Büyüklüğü",
      availableLiquidity: "Mevcut Likidite",
      utilisationRate: "Kullanım Oranı",
      viewHistory: "İşlem geçmişini görüntüle",
      totalBorrowed: "Toplam Borç",
      maximumLTV: "Maksimum Borç-Değer Oranı",
      liquidationPremium: "Premium Likidasyon",
      tradeAsset: "{{ASSET}} Ticareti",
      minimumCollateralizationRatio: "Minimum C-Ratio"
    },
    copilot: {
      name: "Yardımcı Pilot",
      header: "Yardımcı pilot burada.",
      okay: "Okay",
      suggestions: {
        unhealthy: {
          overview: "Hesabınız sağlıksız.",
          detail: "Teminat Oranınız (toplam yatırdığınız değerin toplam ödünç aldığınız değere oranı) %{{C-RATIO}} olup, Jet pazarının minimum teminatlandırma oranı olan %{{JET MIN C-RATIO}} değerinden %{{RATIO BELOW AMOUNT}} daha düşüktür.",
          solution: "Pozisyonunuzu doğrultmak için daha fazla teminat yatırabilirsiniz ancak borcunuzu Kokpit'te ödemenizi öneririm.",
          actionText: "Kokpite Git"
        },
        warning: {
          tenPercent: {
            overview: "Tehlikeli bir şekilde likidasyona yakınsınız.",
            detail: "Teminat Oranınız (toplam yatırdığınız değerin toplam ödünç aldığınız değere bölümü) %{{C-RATIO}} olup, Jet pazarının minimum teminatlandırma oranı olan %{{JET MIN C-RATIO}} %10'luk kısım içindedir.",
            solution: "Likidasyondan kaçınmak için daha fazla teminat yatırabilirsiniz.",
            actionText: "Yatırma"
          },
          twentyPercent: {
            overview: "Teminat oranınıza dikkat edin.",
            detail: "Teminat Oranınız (toplam yatırdığınız değerin toplam ödünç aldığınız değere bölümü) %{{C-RATIO}} 'dur ve bu, Jet pazarının minimum teminatlandırma oranı olan %{{JET MIN C-RATIO}} 'nın %20 üzerindedir.",
            solution: "Daha fazla teminat yatırarak teminatlandırma oranınızı, sağlıklı olarak kabul edilen %20 veya daha yüksek seviyelere çıkartın.",
            actionText: "Yatırma"
          }
        },
        deposit: {
          overview: "{{BEST DEPOSIT RATE NAME}} şu anda iyi görünüyor.",
          detail: "<b class='bold'>{{BEST DEPOSIT RATE ABBREV}}</b> şu anda piyasadaki en iyi mevduata sahip <b class='bold'>APY (Yıllık Yüzde Getiri)</b> <b class='bold'>%{{DEPOSIT RATE}}</b> ve hesabınız iyi durumda olduğundan, <b class='bold'>{{USER BALANCE}}</b> hesabınızdaki varlıkların bir kısmını yatırarak bir miktar teminat eklemenizi öneririz <b class='bold'>{{BEST DEPOSIT RATE ABBREV}}</b>.",
          actionText: "Haydi uçalım"
        },
        healthy: {
          overview: "Gökler açık",
          detail: "Hesabınız iyi durumda ve sağlıklı bir şekilde fazla teminatlandırılmış durumda, piyasaya bir göz atıp sizin için iyi hamleler önerebilecek miyim bir bakayım. Daha sonra tekrar kontrol edin!"
        }
      },
      alert: {
        failed: "İmdat!",
        success: "Başarılı!",
        airdropSuccess: "Size {{UI AMOUNT}} {{RESERVE ABBREV}} değerindeki varlığı Airdrop'la gönderdik. Yeni bakiyenizi görmek için lütfen uygulamayı yenileyin.",
        refresh: "Yenile",
        originationFee: "There is a fee of {{ORIGINATION FEE}}% attached to this loan.",
        headsup: "Heads up!"
      }
    }
  }
};

// Definitions of various terminology
export const definitions: any = {
  en: {
    collateral: {
      term: "Collateral",
      definition: "The asset deposited with the protocol to secure a loan."
    },
    debt: {
      term: "Debt",
      definition: "The value of the loan that is owed or due to the Protocol."
    },
    collateralizationRatio: {
      term: "Collateralization Ratio Or C-Ratio",
      definition: "The value of your collateral divided by the value of your debt. You are required to over-collateralize your loan, i.e. the fair market value of your deposited assets must exceed the value of the amount you are allowed to borrow. This provides for a reduction because the Protocol may seize this collateral in order to recoup the value of the loan in the event of default on a loan. See also, Maximum LTV."
    },
    adjustedCollateralizationRatio: {
      term: "Adjusted Collateralization Ratio",
      definition: "A real-time representation of what your collateralization ratio would potentially be if the current trade is submitted."
    },
    depositRate: {
      term: "Deposit Interest Rate",
      definition: "The instantaneous interest rate being earned by depositors. This rate is expressed in annualized form, does not reflect the effects of compounding, and is inclusive of any protocol fees that may be in place. The rate changes as the utilization ratio of the deposited asset changes."
    },
    borrowRate: {
      term: "Borrow Interest Rate",
      definition: "The instantaneous interest rate being paid by borrowers. This rate is expressed in annualized form, does not reflect the effects of compounding, and is inclusive of any protocol fees that may be in place. The rate changes as the utilization ratio of the borrowed asset changes."
    },
    maximumLtv: {
      term: "Maximum LTV",
      definition: "The maximum ratio of a loan allowed by the Protocol. The Loan-to-value ratio (LTV), is a measure of risk used by the Jet Protocol when deciding how large of a loan to approve. Your LTV represents the relationship between the size of the loan you take out and the value of the property that secures the loan. See also, Collateralization Ratio."
    },
    utilisationRate: {
      term: "Utilization Ratio",
      definition: "The fraction of a reserve’s assets that have been borrowed. For example, if the USDC reserve is worth $100,000,and the amount owed to the reserve by borrowers is $65,000, then the utilization ratio is 65%. There would be $35,000 available for further borrowing."
    },
    availLiquidity: {
      term: "Liquidity",
      definition: "The efficiency or ease with which an asset can be converted into stablecoins without affecting the asset’s market price."
    },
    liquidationPremium: {
      term: "Liquidation Premium",
      definition: "Additional collateral is delivered to liquidators who repay the debt of accounts that have fallen below the minimum collateralization ratio. The dollar value of this additional collateral is equal to the Liquidation Premium times the dollar value of the repaid debt. The additional collateral is paid from the account of the user being liquidated."
    }
  },
  zh: {
    collateral: {
      term: "抵押物",
      definition: "您存在Jet的资产以保障您的借贷款。 您必须要过度抵押您的借贷款。 您存在Jet的资产市场价值必须要比您的借贷款还高"
    },
    debt: {
      term: "债务",
      definition: "您在Jet借的贷款价值"
    },
    collateralizationRatio: {
      term: "质押率",
      definition: "您的抵押品价值除以您的债务价值。 您必须要超额抵押您的借贷款。 您存在Jet的资产市场价值必须要比您的借贷款还高。因为Jet可能会扣押这些抵押品，以便在贷款违约的情况下收回贷款价值。 另请参阅最大 LTV。"
    },
    adjustedCollateralizationRatio: {
      term: "调整后的质押率",
      definition: "如果這筆交易成功後的实时质押率"
    },
    depositRate: {
      term: "存款率",
      definition: "存款人赚取的即时利率。 该费率以年化形式表示，不反映复利的影响，并且包括可能存在的任何协议费用。 费率变化会随着存入资产利用率而变化。"
    },
    borrowRate: {
      term: "借贷率",
      definition: "借款人支付的即时利率。 该费率以年化形式表示，不反映复利的影响，并且包括可能存在的任何协议费用。 利率变化会随着借入资产利用率而变化。"
    },
    maximumLtv: {
      term: "最高LTV",
      definition: "贷款价值比（loan to value,简写LTV）是指贷款金额和抵押品价值的比例。 是Jet使用的一种风险度量来决定批准的贷款规模。 您的 LTV 代表您贷款的规模与为贷款提供担保的财产价值之间的关系。 您可以去查看质押率。"
    },
    utilisationRate: {
      term: "使用率",
      definition: "已借用储备资产的比例。 例如，如果 USDC 的储备资产价值 100,000 美元，借款人以借用 65,000 美元，则利用率为 65%。 剩下的 35,000 美元可用于进一步借款。"
    },
    availLiquidity: {
      term: "可用流动性",
      definition: "资产可以在不影响其市场价格的情况下转换为现成现金的效率或容易程度，或以反映其内在价值的价格在市场上快速买卖"
    },
    liquidationPremium: {
      term: "清算溢价",
      definition: "清算溢价是向清算人提供额外的抵押物，清算人偿还低于最低抵押率的账户债务。此额外抵押物的美元价值等于清算溢价乘以已偿还债务的美元价值。 额外的抵押物从被清算用户的账户中支付。"
    }
  },
  ru: {
    collateral: {
      term: "Залог",
      definition: "Актив, который вы предоставляете нам для обеспечения вашего займа. В случае невыполнения обязательств, Jet протокол конфискует и использует этот актив, чтобы возместить стоимость вашего займа."
    },
    debt: {
      term: "Долг",
      definition: "Сумма, которую вы должны, или которая подлежит возврату Jet протоколу."
    },
    collateralizationRatio: {
      term: "Коэффициент обеспечения или КО",
      definition: "Стоимость вашего залога, разделенная на стоимость вашего долга. Вы должны предоставить залог больше, чем размер вашего долга, то есть справедливая рыночная стоимость ваших активов в залоге должна превышать сумму, которую вам разрешено брать в долг."
    },
    adjustedCollateralizationRatio: {
      term: "Скорректированный коэффициент обеспечения",
      definition: "Прогноз в реальном времени того, каким примерно будет ваш коэффициент обеспечения, если будет совершена текущая сделка."
    },
    depositRate: {
      term: "ГПД депозита",
      definition: "Общая сумма процентов, которые вы зарабатываете на депозитном счете за один год, при условии, что вы не добавляете и не снимаете средства в течение всего года. Годовая процентная доходность (ГПД) включает вашу процентную ставку и частоту начисления сложных процентов, то есть процент, который вы зарабатываете на свою основную сумму, плюс проценты с вашей прибыли."
    },
    borrowRate: {
      term: "ГПС займа",
      definition: "Годовая процентная ставка (ГПС), взимаемая по займу сроком на один год. При этом учитывается эффект начисления сложных процентов в течение периода займа, что означает, что он отражает проценты, и также начисления на ранее накопленные проценты."
    },
    maximumLtv: {
      term: "Максимальный КДЗ",
      definition: "Коэффициент долг/залог (КДЗ) - мера риска, используемая программой Jet при принятии решения об утверждении размера займа. Коэффициент вашего долга к залогу (КДЗ) представляет собой отношение между размером займа, который вы берете, и стоимостью имущества (залога), обеспечивающего займ. См. также: коэффициент обеспечения."
    },
    utilisationRate: {
      term: "Коэффициент использования",
      definition: "Фактически используемая часть потенциального выхода этой пары ликвидности в рамках программы Jet. Это функция от общей заёмной стоимости по отношению к размеру резерва."
    },
    availLiquidity: {
      term: "Ликвидность",
      definition: "Эффективность или легкость, с которой актив можно конвертировать в наличные деньги, не влияя на его рыночную цену, или быстро купить или продать на рынке по цене, отражающей его внутреннюю стоимость."
    },
    liquidationPremium: {
      term: "Ликвидационная надбавка",
      definition: "Процент (%) надбавки к дефициту обеспечения займа, применяемый к ликвидационной стоимости пользовательского залога."
    }
  },
//Turkish
  tr: {
    collateral: {
      term: "Teminat",
      definition: "Borcunuzu güvence altına almak için bize yatırdığınız varlık. Borcunuzun temerrüde düşmesi durumunda, Jet kredinin değerini geri alabilmek için bu teminatı alacaktır."
    },
    debt: {
      term: "Borç",
      definition: "Jet Protokolü'ne borçlu olunan veya ödenmesi gereken kredi tutarı"
    },
    collateralizationRatio: {
      term: "Teminatlandırma Oranı veya C-Oranı",
      definition: "Teminatınızın değeri, borcunuzun değerine bölünür. Borcunuzu fazla teminat altına almanız gerekmektedir. Yani yatırılan varlıklarınızın piyasa değeri, ödünç almanıza izin verilen tutarın değerini aşmalıdır."
    },
    adjustedCollateralizationRatio: {
      term: "Düzeltilmiş Teminat Oranı",
      definition: "Mevcut işlemin gerçekleşmesi halinde teminatlandırma oranınızın potansiyel olarak ne olacağının gerçek zamanlı bir temsili."
    },
    depositRate: {
      term: "Yatırma APY'si",
      definition: "Tüm yıl boyunca para eklemediğinizi veya çekmediğinizi varsayarsak, bir mevduat hesabında bir yıl boyunca kazandığınız toplam faiz tutarı. Yıllık yüzde getirisi (APY), faiz oranınızı ve anaparanızdan kazandığınız faiz artı kazançlarınızın faizi olan bileşik faiz sıklığını içerir."
    },
    borrowRate: {
      term: "Borç APR'si",
      definition: "Bir yıl boyunca bir krediye uygulanan yıllık yüzde oranı (APR). Bu, kredi döneminde bileşik faizin etkisini hesaba katar, yani daha önce birikmiş faizle kazanılan faizi de yansıtır."
    },
    maximumLtv: {
      term: "Maksimum LTV",
      definition: "Kredi-değer oranı, Jet programı tarafından ne kadar büyük bir kredinin onaylanacağına karar verirken kullanılan bir risk ölçüsüdür. Kredi-değer oranınız (LTV), aldığınız kredinin büyüklüğü ile krediyi güvence altına alan varlıkların değeri arasındaki ilişkiyi temsil eder. Ayrıca bakınız: teminatlandırma oranı."
    },
    utilisationRate: {
      term: "Kullanım Oranı",
      definition: "Likidite çiftinin Jet programı içindeki potansiyel getirisini fiilen kullanılan miktarı. Bu, rezerv büyüklüğüne karşı toplam ödünç alınan değerin bir fonksiyonudur."
    },
    availLiquidity: {
      term: "Likidite",
      definition: "Bir varlığın piyasa fiyatını etkilemeden hazır nakde dönüştürülebilmesi veya gerçek değerini yansıtan bir fiyattan piyasada hızla alınıp satılabilmesinin etkinliği veya kolaylığı."
    },
    liquidationPremium: {
      term: "Premium Likidasyon",
      definition: "Kullanıcının varlıklarına likidasyon sırasında uygulanan teminat açığındaki (%) artış"
    }
  }
}