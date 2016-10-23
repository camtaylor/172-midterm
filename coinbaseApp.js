var fs = require('fs');
var request = require('request');
var csv = require('csv');
var repl = require('repl');
var FILENAME = "orders.csv";
var COINBASEAPI = "https://coinbase.com/api/v1/currencies/exchange_rates";
var ORDERLIST = []

var cli = repl.start({
  prompt: 'Coinbase>',
  eval: function( cmd, context, file, callback ) {  
    runCommand( cmd, function( result ) { 
      callback(null, result); });
  },
  writer: function( output ) { return output; }
});


var csv2console = function(csvfile) {
  var parser = csv.parse(); //create the parser
  parser.on('readable',function(){
  while(row = parser.read()) {
      console.log(row.join("\t"));
   }
  });
  parser.on('error', function(err){  console.log(err.message);  });
  fs.createReadStream(csvfile).pipe(parser); //Open file as stream and pipe it to parser
};

var buildfn = function(csvfile, data) {
    fs.writeFileSync(csvfile, data);
    csv2console(csvfile);
};


function makeOrder( orderType, amount , currency) {
  if (isNaN(amount)){
    return "No amount specified";
  }
  ORDERLIST.push(
    {
      message : orderType.concat(" ", amount, " ", currency),
      time : new Date().toString(),
      status : 'UNFILLED'
    }
  );
  orderConfirmation = "Order to " + orderType + " " + amount + " BTC queued";
  if ( currency ){
    return "Order to " + orderType + " " + amount + " " + currency + " worth of BTC queued";
  }
  else{
    return orderConfirmation;
  }
}


function listOrders(){
  var orderOutput = "=== CURRENT ORDERS ===\n";
  for ( order in ORDERLIST ){
    order = ORDERLIST[order];
    orderOutput += order.time + " : " + order.message + " : " + order.status;
    orderOutput += "\n";
  }
  if ( ORDERLIST.length > 0){
    buildfn(FILENAME, orderOutput);
  }
  else {
    orderOutput = "No orders have been placed";
  }
}


function runCommand( cmd, callback) {
  /*

    Function to execute commands.

    Args:
      (String) cmd: Command entered by the user
      (function) callback: Function to return output to the user
  */
  
  var tokenizedCommand = cmd.trim().split(" ");
  switch( tokenizedCommand[0] ){
    case "BUY":
    case "SELL":
      if (tokenizedCommand.length == 3){
          currency = tokenizedCommand[2];
          var exchangeRates;
          request( COINBASEAPI, function( error, response, body ){
          if (!error && response.statusCode == 200) {
            var exchangeJSON = JSON.parse(body);
            var fromBTC = exchangeJSON[tokenizedCommand[2]+"_to_btc"];
            var toBTC = exchangeJSON["btc_to_"+tokenizedCommand[2]];
            if (fromBTC && toBTC){
              callback(makeOrder.apply(this, tokenizedCommand) + " @ " + toBTC + " BTC/" + currency + " ("+fromBTC+" BTC)");

            }
            else{
              callback("Unrecognized currency. Order failed.");
            }
          }
          else {
            callback("");
          }
        });
      }
      else{
        callback(makeOrder.apply(this, tokenizedCommand));
      }
      break;
    case "ORDERS":
      listOrders();
      break;
    default:
      callback("Command was not understood.");
  }

}
