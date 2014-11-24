
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
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
router.get('/:p0', function(req, res) {
  // tts, zones, lockvolumes, unlockvolumes, reindex, pauseall, resumeall 

  // handle tts file request from Sonos
  if (req.params.action === 'tts') {
    sonos.streamFile(req, res);
    return;
  } else {
    var opt = {
      action: req.params.p0
    };

    handleRoute(req, res, opt);
  }

});

module.exports = router;


