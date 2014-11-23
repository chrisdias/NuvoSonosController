/// <reference path="../typings/express/express.d.ts" />

var express = require('express');
var router = express.Router();
var SonosLib = require('../lib/sonoslib.js');
var app = require('../app');
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

router.get('/:p0/:p1', function(req, res) {
  // pauseall/{timeout in minutes} 
  // resumeall/{timeout in minutes} 
  // preset/{JSON preset} 
  // preset/{predefined preset name} 
  // room/next (will skip to the next track on living room, unless it's not a coordinator)
  // room/pause (will pause the living room)
  // room/playlists (will return all playlists)
  // room/favorites (will return all favorites)
  var opt = {};

  // http://localhost:1234/tts/??? 
  if (req.params.p0 === 'tts') {
    sonos.streamFile(req, res);
    return;
  }

  if (req.params.p0 === 'saveall' || req.params.p0 === 'restoreall' ||
    req.params.p0 === 'preset' || req.params.p0 === 'pauseall' ||
    req.params.p0 === 'resumeall' || req.params.p0 === 'reindex') {
    opt = {
      action: req.params.p0,
      value: req.params.p1
    };
  } else {
    opt = {
      room: req.params.p0,
      action: req.params.p1
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

  // /room/say/phrase
  if (req.params.p1 === 'say') {
    opt = {
      room: req.params.p0,
      action: req.params.p1,
      text: req.params.p2,
      lang: 'en'
    };
  } else {
    opt = {
      room: req.params.p0,
      action: req.params.p1,
      value: req.params.p2
    };
  }

  handleRoute(req, res, opt);

});

router.get('/:p0/:p1/:p2/:p3', function(req, res) {
  // room/say/phrase/language_code

  if (req.params.p1 === 'say') {
    var opt = {
      room: req.params.p0,
      action: req.params.p1,
      text: req.params.p2,
      lang: req.params.p3
    };

    handleRoute(req, res, opt);

  }

});

module.exports = router;