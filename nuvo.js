
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var players = [];

function Nuvo(discovery) {
  var _this = this;

  var sp = new SerialPort("COM3", {
    parser: serialport.parsers.readline("\n"),
    baudrate: 57600,
    databits: 8,
    stopbits: 1,
    buffersize: 1024,
    parity: 'none'
  });

  sp.on("open", function() {
    console.log('serial port opened');
  });

  sp.on('data', function(data) {

    //    #Z6S2NEXT
    //    #Z6S2PREV

    if (data.search("S2NEXT") > 0) {
      //issue "next" command to sonos
      players[0].nextTrack(function(success) {
        if (!success) {
          // most likely this is a pandora station
          // and cannot skip forward too many times per hour
          console.log("can't skip forward...pandora?");
          writeTextMsg("Pandora...Can't Skip Forward");
        }
      });

    } else {
      if (data.search("S2PREV") > 0) {
        players[0].previousTrack(function(success) {
          if (!success) {
            // most likely this is a pandora station
            // and cannot skip back at all
            console.log("can't skip back...pandora?");
            writeTextMsg("Pandora...Can't Skip Back");
          }
        });
      }
    }

  });

  function writeTextMsg(msg) {
    // s The source to send the message to: 1 to 6
    // x Text message to send to the source (20 character max)
    // a=0 Information message
    // a=1 Warning message
    // a=2 Error message
    // a=3 Flash the message
    // b=0 Normal dwell time
    // b=1 Short dwell time
    // b=2 Long dwell time
    // msg = "*S2MSG" & """Pandora...no back skip """ & ",1,2"
    // Nuvo.SendMessage(msg)
    
    msg = '*S2MSG\"' + msg + '\",1,0\r\n';
    write(msg);
    
  }
  function write(msg) {
    console.log(msg);
    sp.write(msg);
  }

  discovery.on('topology-change', function(data) {
    for (var uuid in discovery.players) {
      // we only have one
      var player = discovery.players[uuid];
      players.push(player);
    }
    console.log("topology-change");
  });

  discovery.on('transport-state', function(data) {
    var line1 = "*S2DISPLINE1";
    var line2 = "*S2DISPLINE2";
    var line3 = "*S2DISPLINE3";
    var line4 = "*S2DISPLINE4";
    var msg = "*S2DISPINFO,";

    //  '*S2DISPLINE1\"PearlJam\"\r\n';
    line1 = line1 + '\"' + data.state.currentTrack.artist + '\"\r\n';
    line2 = line2 + '\"\"\r\n';
    line3 = line3 + '\"' + data.state.currentTrack.title + '\"\r\n';
    line4 = line4 + '\"Next: ' + data.state.nextTrack.title + ' by ' + data.state.nextTrack.artist + '\"\r\n';

    write(line1);
    write(line2);
    write(line3);
    write(line4);

    // s The source the message is from: 1 to 6
    // x Length of song in 10ths of seconds
    // y Current stream time in playing song in 10ths of seconds
    // z=0 Normal
    // Z=1 Idle
    // z=2 Playing
    // z=3 Paused
    // z=4 Fast Forward
    // z=5 Rewind
    // z=6 Play Shuffle
    // z=7 Play Repeat
    // z=8 Play Shuffle Repeat
    // *SsDISPINFO,x,y,z
    // msg = "*S2DISPINFO,100,10,1"

    var duration = data.state.currentTrack.duration * 10;
    var currpos = data.state.elapsedTime * 10;
    var mode = 0;

    switch (data.state.playerState) {
      case 'PAUSED_PLAYBACK':
        mode = 3;
        break;
      case 'PLAYING':
        mode = 2;
        break;
      case 'TRANSITIONING':
        mode = 1;
        break;
    }

    msg = msg + duration + ',' + currpos + ',' + mode.toString() + '\r\n';
    write(msg);

  });

  discovery.on('group-volume', function(data) {
    console.log("group-volume");
  });

  discovery.on('group-mute', function(data) {
    console.log("group-mute");
  });

  discovery.on('mute', function(data) {
    console.log("mute");
  });

  discovery.on('favorites', function(data) {
    console.log("favorites");
  });

  discovery.on('queue-changed', function(data) {
    console.log('queue-changed', data);
  });

}
module.exports = Nuvo;
