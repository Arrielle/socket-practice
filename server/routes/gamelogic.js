var io;
var gameSocket;

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
  gameSocket.on('setCzar', setCzar);
  gameSocket.on('cardsToJudge', cardsToJudge);
  gameSocket.on('playerHideButton', changePlayerStatus)
  // gameSocket.on('hostCountdownFinished', hostStartGame);
  // gameSocket.on('hostNextRound', hostNextRound);

  // Player Events
  gameSocket.on('playerJoinGame', playerJoinGame);
  // gameSocket.on('playerAnswer', playerAnswer);
  // gameSocket.on('playerRestart', playerRestart);
}

/* ****************************
*                             *
*       HOST FUNCTIONS        *
*                             *
******************************* */
// The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
  // Create a unique Socket.IO Room
  var thisGameId = ( Math.random() * 100000 ) | 0;
  // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
  this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
  // console.log('Host has created a new game!');
  // console.log('Game ID: ', thisGameId, 'Socket ID: ', this.id);
  // Join the Room and wait for the players
  this.join(thisGameId.toString());
};

function hostPrepareGame(gameId) {
    var sock = this;
    var data = {
        mySocketId : sock.id,
        gameId : gameId
    };
    console.log('host prep data', data);
    console.log("All Players Present. Preparing game...");
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}

function changeHostView(hostSocketId){
  console.log('host socket id?', hostSocketId);
  io.to(hostSocketId).emit('changeHostView');
}

/* ****************************
*                             *
*       Player FUNCTIONS      *
*                             *
******************************* */

// A player clicked the 'START GAME' button.
// Attempt to connect them to the room that matches the gameId entered by the player.
// data Contains data entered via player's input - playerName and gameId.
function playerJoinGame(data) {
  // console.log('Player ' + data.playerName + ' attempting to join game: ' + data.gameId );
  // A reference to the player's Socket.IO socket object
  var sock = this;
  var room = gameSocket.adapter.rooms[data.gameId];
  // Look up the room ID in the Socket.IO manager object to make sure it exists
  // Additionally, make sure the room is not full.
  if( room != undefined && room.length <= 2){
    console.log('this room exists');
    // Attach the socket id to the data object.
    data.mySocketId = sock.id;
    // Join the room
    sock.join(data.gameId);

    // console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

    // Emit an event notifying the clients that the player has joined the room.
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data);
    //If the room is full.
  } else if (room.length > 2){
    this.emit('errorAlert', {message: "Sorry, but this room is full!"})
    //If the room does not exist
  } else {
    console.log('this room does not exist');
    // Otherwise, send an error message back to the player.
    this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
  }
}

function changePlayerView(playerSocketId){
  io.to(playerSocketId).emit('changePlayerView');
}

function findPlayersCards(playersObject){
  //players object is all 4 players
  //loop through these players to find their socket and cards in hand
  for (var i = 0; i < playersObject.length; i++) {
    //cards in 'this' players hand.
    var cards = playersObject[i].cardsInHand;
    //'this' players socketId
    var playerSocketId = playersObject[i].mySocketId;
    //'this' players playerName
    var name = playersObject[i].playerName
    console.log('playerObject[i]', playersObject[i]);
    //emit these cards specifically to this player
    io.to(playerSocketId).emit('dealWhiteCards', {playersObject: playersObject[i]});
    // io.to(playerSocketId).emit('dealWhiteCards', {playerCards: cards, playerName: name, playersObject: playersObject[i]});
  }
}

function setCzar(playersObject){
  for (var i = 0; i < playersObject.length; i++) {
    //sets all czar to false.
    this.emit('setCzarToFalse');
    //this player is czar let them know.
    if(playersObject[i].isCzar){
      var playerSocketId = playersObject[i].mySocketId;
      io.to(playerSocketId).emit('showCzarView');
      //also alert host who the czar is.
    }
  }
}

function cardsToJudge(data){
  var cardsToJudge = data.cardsToJudge;
  var gameId = data.players[0].gameId;
  var player = data;
  io.sockets.in(gameId).emit('czarCards', cardsToJudge);
}

function changePlayerStatus(data){
  io.to(data.mySocketId).emit('updatePlayerView', data);
}
