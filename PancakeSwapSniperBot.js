
// Don't use on tokens with anti-bot measures you will get taxed 99% or blacklisted. Best to use with tokens with no tax and no anti-bot measures.
// You need a node with Websocket endpoint sign up at getBlock.io they have 40k free requests per day. 
// 40k is not much this bot will burn that much very quickly, you will have to buy more requests.
// Best to start bot 30 secs to 60 secs before launch 
// Use at your own risk

const ethers = require('ethers');
require('dotenv').config();

const addresses = {
	WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
	recipient: process.env.recipient,
	buyContract: '0xDC56800e179964C3C00a73f73198976397389d26',

	contractCreator: '', // Contract creator, the owner of the contract you can find it on bscscan
	contractAddress: '' // Token address
}
const mnemonic = process.env.mnemonic;



const investmentAmount = '0.05';

/**
* False means that liquidity is already added and the token developer (contract owner) needs to call a function to start trading token 
* we need to find out what function he is going to call can find on bscscan. 
* True means we can buy token when liquidity is added trading is open when liquidity is added.
*/
const tradeIsEnabled = false; 

// Triggers that contract developer might use to launch token ex setTradingEnabled
const triggers =
	[
		'openTrade',
		'addLiquidityETH',
		'setMarketingFee',
		'setLiquidityFee',
		'setMaxTxLimit',
		'enableTrading',
		'setTradingIsEnabled',
		'setMaxTx',
		'openTrading',
		'tradingStatus',
		'SetupEnableTrading',
		'updateTradingEnabled',
		'setTradingEnabled',
		'setBuyFee'
	];

// Possible functions that contract owner might call, you will need to look at token contract and find out what function needs to be called to launch token 
// and paste function signature below and paste function name above.
const triggersABI = [
	'function openTrade()',
	'function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline)',
	'function setMarketingFee(uint256 value)',
	'function setLiquidityFee(uint256 value)',
	'function setMaxTxLimit(uint256 maxLimitPercent)',
	'function enableTrading()',
	'function setTradingIsEnabled(bool _enabled)',
	'function setMaxTx(uint256 maxTx)',
	'function openTrading(uint256 _deadBlocks)',
	'function tradingStatus(bool _status)',
	'function SetupEnableTrading()',
	'function updateTradingEnabled(bool _enabled)',
	'function setTradingEnabled( bool _enabled,uint256 _deadline,uint256 _launchtax)',
	'function setBuyFee(uint16 taxReflection,uint16 marketing,uint16 dev,uint16 RnD)'
]


const myGasLimit = 2100000;
const mygasPriceForApproval = ethers.utils.parseUnits('5', 'gwei');

const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
const wsProvider = new ethers.providers.WebSocketProvider(process.env.wsNode);
const account = wallet.connect(wsProvider);

let tokenIn, tokenOut;
tokenIn = addresses.WBNB;
tokenOut = addresses.contractAddress;
const amountIn = ethers.utils.parseUnits(investmentAmount, 'ether');

let pancakeAbi = [
	'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
	'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)'
];
const pancakeRouter = new ethers.Contract(
	addresses.pancakeRouter,
	pancakeAbi,
	account
);

let tokenAbi = [
	'function approve(address spender, uint amount) public returns(bool)',
	'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)',
	'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)',
	'function balanceOf(address account) external view returns (uint256)',
	'function decimals() external view returns (uint8)',
	'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)',
	'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)',
	'event Transfer(address indexed from, address indexed to, uint amount)',
	'function transfer(address to, uint amount) returns (bool)',
	'function buyTokens(address tokenAddress, address to) payable'
];

let contract = new ethers.Contract(addresses.contractAddress, tokenAbi, account);
let tokenInter = new ethers.utils.Interface(triggersABI);
const buyContract = new ethers.Contract(addresses.buyContract, tokenAbi, account);


async function buy(gas) {
	try {
		
			const tx = await buyContract.buyTokens(tokenOut, addresses.recipient,
				{
					value: amountIn.toString(),
					gasPrice: gas,
					gasLimit: myGasLimit

				});
			const receipt = await tx.wait();
			console.log("Buy transaction hash: ", receipt.transactionHash);
			approve();
		
	} catch (err) {
		console.log(err);
	}

}


const approve = async () => {
	const valueToapprove = ethers.constants.MaxUint256;
	const tx = await contract.approve(
		pancakeRouter.address,
		valueToapprove,
		{
			gasPrice: mygasPriceForApproval,
			gasLimit: 210000
		}
	);
	console.log('After Approve');
	const receipt = await tx.wait();
	console.log('Transaction receipt');
	console.log(receipt.transactionHash);
	process.exit();

}

const init = function () {
	wsProvider.on("Pending", (tx) => {
		wsProvider.getTransaction(tx).then(function (transaction) {
			if (transaction != null) {
				
				// Trading is enabled we can scan for dev transaction for liquidity. 
				// This wont work if dev had presale on dxsale, pinksale etc
				if (tradeIsEnabled) {
					if (transaction.from == addresses.contractCreator && transaction.to == pancakeRouter.address) {
						console.log(tx);
						
						// we need to copy the developers gas price so we are not too early and transaction wont fail
						let gas = transaction.gasPrice;
						buy(gas);
					}
				} else {
					// Trading is not enabled and liquidity is already added we need to scan for dev transaction to open trade.
					try {
						const decodes = tokenInter.parseTransaction({ data: transaction.data, value: transaction.value });
						if (transaction.from == addresses.contractCreator && triggers.includes(decodes.name)) {
							console.log(tx);
							// we need to copy the developers gas price so we are not too early and transaction wont fail 
							let gas = transaction.gasPrice;
							buy(gas);
						}
					} catch (e) {
					
					}
				}
			}
		}).catch(function (e) {
			console.log(e);
		});
	});
}
init();




