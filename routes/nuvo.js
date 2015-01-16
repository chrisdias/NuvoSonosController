
var express = require('express');
var router = express.Router();
var Nuvo = require('../lib/nuvo.js');
var SonosLib = require('../lib/sonoslib.js');
var sonos = new SonosLib();

/* GET users listing. */
router.get('/', function (req, res) {
  res.send('nuvo router');
});

// nuvo/allOn
// nuvo/allOff
// nuvo/zone/getStatus
// nuvo/zone/powerOn
// nuvo/zone/powerOff
// nuvo/zone/mute
// nuvo/zone/unMute
// nuvo/zone/source/[1-6]
// nuvo/zone/play
// nuvo/zone/pause
// nuvo/zone/volumeUp/1
// nuvo/zone/volumeDown/1
router.get('/:p0', function (req, res) {
  // tts, zones, lockvolumes, unlockvolumes, reindex, pauseall, resumeall 
  var action = "zones";
  
  switch (req.params.p0.toLowerCase()) {
    case 'zones':
      action = "zones";
      break;
    case "allon":
      action = "allon";
      break;
    case "alloff":
      action = "alloff";
      break;
    default:
      action = "zones";
  }



});

module.exports = router;


