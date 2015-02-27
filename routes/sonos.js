/// <reference path="../typings/express/express.d.ts" />

var express = require('express');
var router = express.Router();
//var app = require('../app');
var SonosLib = require('../lib/sonoslib.js');
var sonos = new SonosLib();

function handleRoute(req, res, opt) {

  sonos.handleAction(opt, function(response) {
    if (response) {
      var jsonResponse = JSON.stringify(response);
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.write(new Buffer(jsonResponse));
    }
    res.end();
  });
}

router.get('/:p0', function(req, res) {
  // tts, zones, lockvolumes, unlockvolumes, reindex, pauseall, resumeall 
  var p0 = req.params.p0.toLowerCase();
  
  // handle tts file request from Sonos
  if (req.params.action === 'tts') {
    sonos.streamFile(req, res);
    return;
  } else {
    var opt = {
      action: p0
    };

    handleRoute(req, res, opt);
  }

});

router.get('/:p0/:p1', function(req, res) {
  // pauseall/{timeout in minutes} 
  // resumeall/{timeout in minutes} 
  // preset/{JSON preset} 
  // preset/{predefined preset name}
  // room/state (returns player state) 
  // room/next (will skip to the next track on living room, unless it's not a coordinator)
  // room/pause (will pause the living room)
  // room/playlists (will return all playlists)
  // room/favorites (will return all favorites)
  var opt = {};
  var p0 = req.params.p0.toLowerCase();
  var p1 = req.params.p1.toLowerCase();
  
  // http://localhost:1234/tts/??? 
  if (p0 === 'tts') {
    sonos.streamFile(req, res);
    return;
  }

  if (p0 === 'saveall' || p0 === 'restoreall' ||
    p0 === 'preset' || p0 === 'pauseall' ||
    p0 === 'resumeall' || p0 === 'reindex') {
    opt = {
      action: p0,
      value: p1
    };
  } else {
    opt = {
      room: p0,
      action: p1
    };
  }

  handleRoute(req, res, opt);

});

router.get('/:p0/:p1/:p2', function(req, res) {
  // {room name}/{action}[/{parameter}] 
  // room/volume/15 (will set volume for room Living Room to 15%)
  // room/volume/+1 (will increase volume by 1%)
  // room/favorite/mysuperplaylist (will replace queue with the favorite called "mysuperplaylist")
  // room/playlist/[playlist name]
  // room/favorite/[favorite name]
  // room/repeat/on
  var opt = {};
  var p0 = req.params.p0.toLowerCase();
  var p1 = req.params.p1.toLowerCase();
  var p2 = req.params.p2.toLowerCase();
  
  
  // /room/say/phrase
  if (p1 === 'say') {
    opt = {
      room: p0,
      action: p1,
      text: p2,
      lang: 'en'
    };
  } else {
    opt = {
      room: p0,
      action: p1,
      value: p2
    };
  }

  handleRoute(req, res, opt);

});

router.get('/:p0/:p1/:p2/:p3', function(req, res) {
  // room/say/phrase/language_code
  var p0 = req.params.p0.toLowerCase();
  var p1 = req.params.p1.toLowerCase();
  var p2 = req.params.p2.toLowerCase();
  var p3 = req.params.p3.toLowerCase();

  if (p1 === 'say') {
    var opt = {
      room: p0,
      action: p1,
      text: p2,
      lang: p3
    };

    handleRoute(req, res, opt);

  }

});

module.exports = router;
