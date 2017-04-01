var io;
var gameSocket;

//FOR SOME HARDCODED INFORMATION SEARCH: HARD CODED
//SEND CARDS TO CZAR

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;

  gameSocket.emit('connected', { message: "You are connected!" });
  // Host Events
  gameSocket.on('hostCreateNewGame', hostCreateNewGame);
  gameSocket.on('hostRoomFull', hostPrepareGame);
  gameSocket.on('changeHostView', changeHostView);
  gameSocket.on('changePlayerView', changePlayerView);
  gameSocket.on('findPlayersCards', findPlayersCards);
  // gameSocket.on('setCzar', setCzar);
  gameSocket.on('selectRoundWinner', selectRoundWinner);
  gameSocket.on('findCzar', findCzar);
  // gameSocket.on('cardsToJudge', cardsToJudge);
  // gameSocket.on('playerHideButton', changePlayerStatus);
  gameSocket.on('sendCardsToCzar', sendCardsToServer);
  // gameSocket.on('hostCountdownFinished', hostStartGame);
  // gameSocket.on('hostNextRound', hostNextRound);

  // Player Events
  gameSocket.on('playerJoinGame', playerJoinGame);
  // gameSocket.on('playerAnswer', playerAnswer);
  // gameSocket.on('playerRestart', playerRestart);
}

game = {
  databaseId: null,
  gameId: null,
  hostSocketId: null,
  players: [],
  currentBlackCard: null,
  whiteCardsRequired: 10,
  cardsToPick: 1,
  currentRound: 1,
  cardsToJudge: [],
  pointsToWin: 2,
  winner: null,
  isStarted: false,
  isNewGame: false,
  isOver: false,
}

player = {
  playerName: null,
  socketId: null,
  playerScore: null,
  cardsInHand: [],
  cardsToPick: null,
  isCzar: false,
  isReady: false
}

var numPlayers = 3;
/* ****************************************
*                                         *
*       ON CREATE A NEW GAME CLICK        *
*                                         *
**************************************** */

//search abc to find things I need to remove from my code;
function randomNumber(){
  var randomNumber = ( Math.random() * 100000 ) | 0;
  return randomNumber;
}

// The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
  // Create a unique Socket.IO Room
  var thisGameId = randomNumber();
  // Join the Room and wait for the players
  this.join(thisGameId.toString());

  myObj = {[thisGameId]: {gameId: thisGameId, hostSocketId: this.id, gameIsReady: true}}
  gameObject = myObj[thisGameId];
  // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
  this.emit('newGameCreated', gameObject);
  game.hostSocketId = this.id;  //abc
  console.log('Host Is Prepping Game: ', gameObject);
};

/* ****************************
*                             *
*       Player FUNCTIONS      *
*                             *
**************************** */

// A player clicked the 'START GAME' button.
// Attempt to connect them to the room that matches the gameId entered by the player.
// data Contains data entered via player's input - playerName and gameId.
var playerArray = []; //abc, I don't know what to do to replace this...

function playerJoinGame(player, dynamicObject) {
  var room = gameSocket.adapter.rooms[player.gameId]; //the room that the player is joining
  var playerName = player.playerName;
  var maxRoomSize = numPlayers + 1;

  if( room != undefined && room.length <= maxRoomSize){ //check the room to see if it exists and whether or not it is full.
    console.log('The room exists! Entering room ', player.gameId,'.');
    // Attach the socket id to the data object.
    //updating the player Object for my own sanity
    player.mySocketId = this.id;
    player.playerName = playerName;
    player.playerScore = 0;
    player.cardsInHand = [];
    player.isCzar = false;
    player.isReady = false;
    player.isRoundWinner = false;
    player.isGameWinner = false;
    // Join the room
    this.join(player.gameId);
    //adds the new player to the players array.
    game.players.push(player); //abc
    playerArray.push(player);

    console.log('PlayersArray', playerArray);
    if (room.length == maxRoomSize){
      console.log('GAME IS READY TO START', room.sockets);
      hostPrepareGame();
    }
    // Emit an event notifying the clients that the player has joined the room.
    io.sockets.in(player.gameId).emit('playerJoinedRoom', player, game, playerArray);
  } else if (room == undefined){ //The room does not exist.
    console.log('The cake is a lie.');
    this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
  } else if (room.length > maxRoomSize){ //The room is full.
    this.emit('errorAlert', {message: "Sorry, but this room is full!"})
  }
}

function hostPrepareGame(data) {
  game.gameId = game.players[0].gameId;
  var data = {
    hostSocketId : game.hostSocketId,
    gameId : game.gameId,
    players : game.players
  };
  console.log('HOST PREP DATA BBY', data);
  beginNewGame();
}

function beginNewGame(data) {
  game.isStarted = true;
  console.log('new game beginning');
  //spin up host view
  // socket.emit('changeHostView', hostSocketId)
  changeHostView();
  // socket.emit('changeHostView', self.host.hostSocketId);
  //loop through player sockets to find player socket ID information, and update their view specifically
  for (var i = 0; i < game.players.length; i++) {
    playerSocketId = game.players[i].mySocketId;
    changePlayerView(playerSocketId);
  }
}

function changeHostView(){
  console.log('at host view?', game.hostSocketId);
  data = {
    hostGameTemplate: true,
    isStarted: true
  }
  io.to(game.hostSocketId).emit('changeHostView', data, game);
}

function changePlayerView(playerSocketId){
  data = {
    playerGameTemplate: true,
    playerJoining: false
  }
  io.to(playerSocketId).emit('changePlayerView', data);
}

function findPlayersCards(playersObject){
  game.players = playersObject;
  //players object is all 4 players
  //loop through these players to find their socket and cards in hand
  for (var i = 0; i < playersObject.length; i++) {
    //cards in 'this' players hand.
    var cards = playersObject[i].cardsInHand;
    //'this' players socketId
    var playerSocketId = playersObject[i].mySocketId;
    //'this' players playerNameupdatePlayerView
    var name = playersObject[i].playerName
    //emit these cards specifically to this player
    io.to(playerSocketId).emit('dealWhiteCards', {playersObject: playersObject[i]});
    // io.to(playerSocketId).emit('dealWhiteCards', {playerCards: cards, playerName: name, playersObject: playersObject[i]});
  }
}


function sendCardsToServer(playerCards, playerObject){
  game.databaseId = playerCards[0].databaseId;
  console.log('PlayerCards', playerCards, 'playerObject', playerObject);
  var numberOfSelectedCards = checkCardsInHand(playerCards);
  var cardsToPick = game.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
  //if the player has selected ther right number of cards their card is added to the cardsToJudge array
  if (numberOfSelectedCards == cardsToPick) {
    // nextPlayer(player); //sends white cards, and sets the next player.
    whiteCardsToSend(playerCards, playerObject);
    //this updates the czar view if everyone has played.
    if (game.cardsToJudge.length == 1){ //HARD CODED
      var cardsToJudge = game.cardsToJudge;
      var gameId = game.gameId;
      var player = data;
      io.sockets.in(gameId).emit('czarCards', cardsToJudge);
      // socket.emit('cardsToJudge', self.host);
      //clear any placeholder cards
    }
  }
}

//~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
function whiteCardsToSend(playerCards, playerObject){
  for (var i = 0; i < game.players.length; i++) { //loops through the players (server)
    if (game.players[i].mySocketId == playerObject.mySocketId) { //finds the correct socket/player
      // console.log('beforesplice', playerObject.cardsInHand.length);
      for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
        if(playerCards[j].selected){ //finds the ones that have been selected
          game.cardsToJudge.push(playerCards[j]); //adds the card to the cards to judge array.
          playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
          game.players[i].cardsInHand.splice(j, 1);
          playerObject.cardsInHand = game.players[i].cardsInHand;
          // console.log('aftersplice', playerObject.cardsInHand.length);
          io.to(playerObject.mySocketId).emit('updatePlayerView', true, playerObject);
        }//ends if
      }//ends for
    }
  }
  for (var i = 0; i < game.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
    game.cardsToJudge[i].selected = false;
  }//ends for
  shuffleArray(game.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
}//ends function

//~.:------------>DETERMINES HOW MANY CARDS A PLAYER HAS SELECTED TO SEND TO THE CZAR<------------:.~//
function checkCardsInHand(cardsInHand){
  var numberOfSelectedCards = 0; //initialized numberOfSelctedCards to 0
  for (var i = 0; i < cardsInHand.length; i++) { //checks to see how many 'numberOfSelectedCards' there really are
  if(cardsInHand[i].selected){
    numberOfSelectedCards++
  }
}
return numberOfSelectedCards;
}

//~.:------------>SHUFFLE THE WHITE CARDS SO THE CZAR DOESN'T KNOW WHO SENT THEM<------------:.~//
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}


/* ********************************
*                                 *
*       GAME LOGIC FUNCTIONS      *
*                                 *
******************************** */



function findCzar(playersArray){
  console.log('HEY THERE - players array in findCzar server', playersArray);

  for (var i = 0; i < playersArray.length; i++) {
    playerSocketId = playersArray[i].mySocketId;
    if(playersArray[i].isCzar){
      console.log('i czar', i);
      io.to(playerSocketId).emit('showCzarView', true);
    } else if (!playersArray[i].isCzar){
      console.log('i NOT czar', i);
      io.to(playerSocketId).emit('showCzarView', false)
    }
  }
}



function selectRoundWinner(cardsToJudge){
  //  NEED THE DATABASE ID
  //  Go through the array of cards and make sure that one of them is selected
  for (var i = 0; i < cardsToJudge.length; i++) {
    if(cardsToJudge[i].selected){
      setRoundWinner(cardsToJudge); //finds who won the round and awards them points
      roundWinner = game.players[roundWinnerIndex];
      //ALERT USERS WHO WON... THEN RESET EVERYTHING
      checkIfGameOver(); //checks to see if anyone has 10 points yet
      newRound(); //sets up for a new round
      changeHostView();

      console.log('game should be on round two with no cards to judge', game);
      io.sockets.in(game.gameId).emit('newRound', game);

      // drawBlackCard(self.host.databaseId); //draws a new black card NEED DATABASE ID
      // drawCards(self.host.databaseId); // draws white cards NEED DATABASE ID
      // setCzar(self.host.players); //needs to set current czar to nothing and then set the next czar
      //UPDATE ALL VIEWS

      //need to alert host that the player has scored.
    }
  }
}

function setRoundWinner(cardsToJudge){
  //loops through the array of cards to judge
  for (var i = 0; i < cardsToJudge.length; i++) { //loop through cards to judge
    //if the card is selected, it's the winner
    if(cardsToJudge[i].selected){ //find the card in the array that is selected
      //find the player who sent the card and give them points.
      var winner = cardsToJudge[i].playerName; //find the user who sent that card, and set them to winner.
      for (var i = 0; i < game.players.length; i++) { //loop through the player array
        if(game.players[i].playerName == winner){ //whichever player is the winner
          game.players[i].playerScore++; //gets a point
          return roundWinnerIndex = i;
        }//ends if
      }//ends for
    }//ends if
  }//ends for
}//ends function

function checkIfGameOver(){
  for (var i = 0; i < game.players.length; i++) {
    if (game.players[i].points >= game.pointsToWin){
      game.winner = game.players[i].playerName;
      game.isOver = true;
    }
  }
  if(game.isOver){
    for (var i = 0; i < game.players.length; i++) {
      game.players[i].isCzar = false;
      console.log('THE GAME IS OVER!');
    }
  }
  console.log('GAME IS NOT OVER');
}

function newRound(){
  if(!game.isOver){
    game.currentRound++;
    game.cardsToJudge = [];
    io.sockets.in(game.gameId).emit('czarCards', game.cardsToJudge);
    io.sockets.in(game.gameId).emit('updatePlayerView', false, game.players);
  }
}
