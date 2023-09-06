const BigNumber = require('bignumber.js');
const Web3 = require('web3')
const DSA = require('dsa-connect');
const axios = require('axios');
const tokens = require('./tokensinfo.json');
var opener = require('opener');
opener('https://defi.instadapp.io/');

//---------------------------------------------------------------------------------------------------------------------------------------------------
const filteredTokens = Object.keys(tokens).reduce((acc, key) => {if (tokens[key].type === "token") { acc[key] = tokens[key]; } return acc;  }, {});
//---------------------------------------------------------------------------------------------------------------------------------------------------
/*
1. Get an access to the liquidity to know which token to borrow
2. Borrow token say token0 = WETH
3. SWAP token0 = WETH for any token , say token1 = WBTC , loop on different exchanges to get the max amount of tokens taking into account slippage and gas
4. SWAP back token1 = WBTC for WETH with looping on different exchanges to get the max amount of tokens 
5. PayBack the loan
*/
//console.log(tokens['usdc']);
//-------------------------------------------------------------------------------------------------------------------------------
const fs = require('fs');
const { Console } = require('console');
fs.writeFileSync('logconnect4.csv', '');

const loanTokens = ['eth','weth','wbtc','dai','usdt','usdc'];
exchanges =['paraswap','1inch','kyperswap']
var ExchangeNameStep1,ExchangeNameStep2,ExchangeNameStep3,maxStep1,maxStep2,maxStep3;
var connector1,connector2,connector3,connectorMethod1,connectorMethod2,connectorMethod3;
let web3;
var ProfitThershold;
//-------------------------------------------------------------------------------------------------------------------------------
const WEB3URL = "https://eth-mainnet.g.alchemy.com/v2/qeLVpRxnMsU8bfSHsqJ-DhNDLqnmM6_4";
let dsa , account , id = 36620 , address , version , chainId = 1  , DSAAddress="0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa";
const creator_address = "0x939500605131f423cA733544aA1D66149a731B23";
const created_address = "0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa";
const instaIndex = "0x2971adfa57b20e5a416ae5a708a8655a9c74f723";


const slippage = "1";
const timeout = 100000;
const oneInchAPI = "lLrDi3gJR547F8EDGdZFA1xLtR24kSbH";
//-------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------
async function GetMyAccounts() {
   web3 = new Web3(new Web3.providers.HttpProvider(WEB3URL));
 // web3.eth.defaultAccount = "0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa";

  //dsa = await new DSA({web3: web3,  mode: "browser",  id : "36620" , privateKey: "3a73862a666e1dff3b110ec9a860d20e31cc98edad5ec3c57df3bdcb5fc0a6e3" },chainId);
 // dsa = await new DSA({web3: web3,  mode: "browser" , privateKey :  "3a73862a666e1dff3b110ec9a860d20e31cc98edad5ec3c57df3bdcb5fc0a6e3"});
 // dsa = await new DSA({web3: web3,  mode: "browser" , privateKey :"3a73862a666e1dff3b110ec9a860d20e31cc98edad5ec3c57df3bdcb5fc0a6e3" });
  dsa = await new DSA({web3: web3,   publicKey : creator_address,   privateKey :"" }, chainId);


    await dsa.setInstance(id);
    //dsa.origin = instaIndex;
    //console.log(dsa);
    //console.log(await dsa.config);
    
} 
//----------------------------------------------------------------------------------------------------------------------------------
function getCurrentDateTimeFormatted() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
//----------------------------------------------------------------------------------------------------------------------------------
async function swap(loanAmount , token0 , token1 , token2 , token0Decimals , token1Decimals , token2Decimals , token0Symbol , token1Symbol , token2Symbol){
    let profit;
    let para1,para2,para3;
    let  oneInch1 , oneInch2 , oneInch3;

    let paraResult1 , paraResult2, paraResult3;
    let oneInchResult1 , oneInchResult2 , oneInchResult3;

    let byteData1 , byteData2, byteData3;
  
  const loanAmountInWei =  new BigNumber(loanAmount).times(10**token0Decimals).toFixed(0);  
  const route =  7 // balancer route: https://docs.instadapp.io/flashloan/docs#routes
  const flashloanFee = 0.05 // 5bps
  const flashloanAmountWithFee = new BigNumber(loanAmountInWei).times(100 + flashloanFee).dividedBy(100).toFixed(0)    

    try {
        
        para1= 0 ;para2= 0 ;para3= 0 ;
        oneInch1 = 0 ; oneInch2 = 0 ; oneInch3= 0 ;
        maxStep1 = 0; maxStep2 = 0; maxStep3 = 0;
        const parawSwapUrl1 = `https://api.instadapp.io/defi/mainnet/paraswap/v5/swap?sellToken=${token0}&buyToken=${token1}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${loanAmountInWei}`
        const oneInchUrl1 = `https://api.instadapp.io/defi/mainnet/1inch/v5/swap?sellToken=${token0}&buyToken=${token1}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${loanAmountInWei}`

        paraResult1  = await axios.get(parawSwapUrl1 ,  {timeout: timeout });
        para1 =   await paraResult1.buyTokenAmount;
     
        const { data: oneInchResult1 } = await axios.get(oneInchUrl1, {timeout: timeout });
        oneInch1 = oneInchResult1.buyTokenAmount;
     
        if(para1 > oneInch1 ) {maxStep1=para1;ExchangeNameStep1="para"; connector1 = "PARASWAP-V5-A"; connectorMethod1 = "swap"; byteData1 = paraResult1.calldata;}
        else if(para1 < oneInch1 ) {maxStep1=oneInch1;ExchangeNameStep1="OneInch"; connector1 = "1INCH-V5-A"; connectorMethod1 = "sell"; byteData1 = oneInchResult1.calldata;}
        else {maxStep1=oneInch1;ExchangeNameStep1="OneInch";connector1 = "1INCH-V5-A"; connectorMethod1 = "sell";byteData1 = oneInchResult1.calldata;}
   
        //-----------------------------------------------------------------------------------------------------------------------------------------
        const parawSwapUrl2 = `https://api.instadapp.io/defi/mainnet/paraswap/v5/swap?sellToken=${token1}&buyToken=${token2}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${maxStep1}`
        const oneInchUrl2 = `https://api.instadapp.io/defi/mainnet/1inch/v5/swap?sellToken=${token1}&buyToken=${token2}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${maxStep1}`

        const { data: paraResult2 } = await axios.get(parawSwapUrl2,   {timeout: timeout });
        para2 =   await paraResult2.buyTokenAmount;
        
        const { data: oneInchResult2 } = await axios.get(oneInchUrl2,    {timeout: timeout });
        oneInch2 = oneInchResult2.buyTokenAmount;
     
     
        if(para2 > oneInch2 ) {maxStep2=para2;ExchangeNameStep2="para"; connector2 = "PARASWAP-V5-A"; connectorMethod2 = "swap";byteData2 = paraResult2.calldata;}
        else if(para2 < oneInch2 ) {maxStep2=oneInch2;ExchangeNameStep2="OneInch"; connector2 = "1INCH-V5-A"; connectorMethod2 = "sell";byteData2 = oneInchResult2.calldata;}
        else {maxStep2=oneInch2;ExchangeNameStep2="OneInch";connector2 = "1INCH-V5-A"; connectorMethod2 = "sell";byteData2 = oneInchResult2.calldata;}

//---------------------------------------------------------------------------------------------------------------------------------------------------
        const parawSwapUrl3 = `https://api.instadapp.io/defi/mainnet/paraswap/v5/swap?sellToken=${token2}&buyToken=${token0}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${maxStep2}`
        const oneInchUrl3 =   `https://api.instadapp.io/defi/mainnet/1inch/v5/swap?sellToken=${token2}&buyToken=${token0}&dsaAddress=0x17B332dA07BFF9E03d2f5825C41a823CED54b6Fa&slippage=1&sellAmount=${maxStep2}`


        const { data: paraResult3 } = await axios.get(parawSwapUrl3,   {timeout: timeout });
        para3 =   await paraResult3.buyTokenAmount;

        const { data: oneInchResult3 } = await axios.get(oneInchUrl3,  {timeout: timeout });
        oneInch3 = oneInchResult3.buyTokenAmount;

      

        if(para3 > oneInch3 ) {maxStep3=para3;ExchangeNameStep3="para";connector3 = "PARASWAP-V5-A"; connectorMethod3 = "swap";byteData3 = paraResult3.calldata;}
        else if(para3 < oneInch3 ) {maxStep3=oneInch3;ExchangeNameStep3="OneInch";connector3 = "1INCH-V5-A"; connectorMethod3 = "sell";byteData3 = oneInchResult3.calldata;}
        else {maxStep3=oneInch3;ExchangeNameStep3="OneInch";connector3 = "1INCH-V5-A"; connectorMethod3 = "sell"; byteData3 = oneInchResult3.calldata;}
//---------------------------------------------------------------------------------------------------------------------------------------------------
const profitFee = 1; 
ProfitThershold = new BigNumber(loanAmountInWei).times(100 + profitFee).dividedBy(100).toFixed(0)
//Create the Spell , take the flashloan , perform the arbitrage and payback the loan
const result2 = token0 + "  Loan Amount: " +  loanAmountInWei + "  ProfitThershold: " + ProfitThershold + "  maxStep3: " + maxStep3  ;
console.log(result2) ;


if (parseInt(maxStep3) >= parseInt(ProfitThershold)){
try {
  console.log(loanAmountInWei , "->" , maxStep1 , "->" , maxStep2 , "->" , maxStep3 , "-----" , flashloanAmountWithFee , "-------" , ProfitThershold);
  let spells = dsa.Spell();
  const swapId1 = "1";
  spells.add({"connector": connector1, method: connectorMethod1 , args: [token1, token0, parseInt(loanAmountInWei), parseInt(maxStep1), byteData1, 0]});
  const swapId2 = "1";
  spells.add({"connector": connector2, method: connectorMethod2 , args: [token2, token1, parseInt(maxStep1), parseInt(maxStep2), byteData2, 0]});
  const swapId3 = "1";
  spells.add({"connector": connector3, method: connectorMethod3 , args: [token0, token2, parseInt(maxStep2), parseInt(maxStep3), byteData3, 0]});
  spells.add({ connector: 'INSTAPOOL-C',   method: 'flashPayback',   args: [token0, flashloanAmountWithFee, 0, 0],});
  const spellsCalldata = dsa.instapool_v2.encodeFlashCastData(spells);
  let flashloanWrappedSpells = dsa.Spell();
  
  flashloanWrappedSpells.add({connector: 'INSTAPOOL-C',method: 'flashBorrowAndCast', args: [ token0 , loanAmountInWei, route, spellsCalldata, "0x"],})
  console.log("----------------------------");
  console.log(spells);

 let estimateGas = await dsa.estimateCastGas(flashloanWrappedSpells);
 console.log("----------------------------");
 console.log(dsa);
 //await dsa.setInstance(36620);
 const gasPrice = web3.eth.gasPrice();
 const tx_hash = await dsa.cast(flashloanWrappedSpells, {gasPrice: web3.utils.toWei(gasPrice, 'wei')} );
 console.log(tx_hash)
}
catch(error){
  console.log("The new Error", error);
}  

}    

//----------------------------------------------------------------------------------------------------------------------------------------------------
const step3 =  (new BigNumber(maxStep3).div(10**token0Decimals)).toString();      
profit = step3 - loanAmount   ;

const formattedDateTime = getCurrentDateTimeFormatted();

const result = formattedDateTime + "," + loanAmount +  "," + token0Symbol +","  + ExchangeNameStep1 + "," +  maxStep1 + "," 
                                                           + token1Symbol + "," + ExchangeNameStep2 + "," +  maxStep2 + "," 
                                                           + token2Symbol + "," + ExchangeNameStep3 + ","  + maxStep3 + "," + 
                                                            "Step3" + "," + step3 +  "," + "Profit" + "," + profit;

fs.appendFileSync('logconnect4.csv', result + "\n");
    }
    catch (error){
        console.log(error)
    }
return profit;
}
//--------------------------------------------------------------------------------------------------------------------------------
async function readCombinationsFromFile() {
    try {
      const fileContents = await fs.promises.readFile('stepsEth.txt', 'utf8');
      const combinations =  fileContents.split(',,').map(entry => JSON.parse(entry));
      return combinations;
    } catch (error) {
      console.error('Error reading combinations from file:', error);
      return [];
    }
  }
//--------------------------------------------------------------------------------------------------------------------------------
async function main(){
    GetMyAccounts();
    const combinations = await readCombinationsFromFile();
    while(true){
        for (const combination of combinations) {
            const {token0: token0, token1: token1, token2: token2 , token0Symbol : token0Symbol , token1Symbol : token1Symbol , token2Symbol : token2Symbol , token0Decimals : token0Decimals , token1Decimals: token1Decimals , token2Decimals: token2Decimals} = combination;
            if(token0Symbol.includes("ETH")) loanAmount = 10;
            else if (token0Symbol.includes("BTC")) loanAmount = 1;
            else if (token0Symbol.includes("USD")) loanAmount = 5000;
            else if (token0Symbol==='DAI') loanAmount = 5000;
            else loanAmount = 5000;
            const profit = await swap(loanAmount , token0 , token1 , token2 , token0Decimals , token1Decimals , token2Decimals , token0Symbol , token1Symbol , token2Symbol);

        }

    }
}
//-------------------------------------------------------------------------------------------------------------------------------------
main()
