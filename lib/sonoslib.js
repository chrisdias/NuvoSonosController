/// <reference path="../typings/express/express.d.ts" />

var express = require('express');
var router = express.Router();
var http = require('http');
var fs = require('fs');
var url = require('url');
var paperboy = require('paperboy');
var crypto = require('crypto');
var path = require('path');
var SonosDiscovery = require('sonos-discovery');
var lockVolumes = {};
var pauseState = {};
var saveState = {};
var presets = {};


function SonosLib() {
  var app = require('../app');

  var settings = {
    port: app.get('port'),
    cacheDir: app.get('cache')
  }

  var webroot = path.resolve(__dirname, "..", settings.cacheDir);
  var discovery = new SonosDiscovery(settings);
  this.discovery = discovery;
  
  function getSettingsFile() {
    try {
      var userSettings = require(path.resolve(__dirname, 'settings.json'));
    } catch (e) {
      console.log('no settings file found, will only use default settings');
    }

    if (userSettings) {
      for (var i in userSettings) {
        settings[i] = userSettings[i];
      }
    }
  }

  function loadPresets() {
    fs.exists('./presets.json', function(exists) {
      if (exists) {
        presets = require('./presets.json');
        console.log('loaded presets', presets);
      } else {
        console.log('no preset file, ignoring...');
      }
    });
  }

  function createDirs() {
    var webroot = path.resolve(__dirname, "..", settings.cacheDir);

    // Create webroot + tts if not exist
    fs.mkdir(webroot, function(e) {
      if (e && e.code != 'EEXIST')
        console.error('creating cache dir failed!', e);
    });

    fs.mkdir(webroot + '/tts/', function(e) {
      if (e && e.code != 'EEXIST')
        console.error('creating cache dir failed!', e);
    });
  }

  // This is to handle setTimeout
  function pauseAll() {
    pauseState = {};
    discovery.getZones().forEach(function(zone) {
      pauseState[zone.uuid] = zone.coordinator.state.zoneState;
      if (pauseState[zone.uuid] == "PLAYING") {
        var player = discovery.getPlayerByUUID(zone.uuid);
        player.pause();
      }
    });
  }

  function resumeAll() {
    // save state for resume
    for (var uuid in pauseState) {
      if (pauseState[uuid] == "PLAYING") {
        var player = discovery.getPlayerByUUID(uuid);
        player.play();
      }
    }
    // Clear the pauseState to prevent a second resume to raise hell
    pauseState = {};
  }

  function log(statCode, url, ip, err) {
    var logStr = statCode + ' - ' + url + ' - ' + ip;
    if (err) logStr += ' - ' + err;
    console.log(logStr);
  }

  function restrictVolume(info) {
    console.log("should revert volume to", lockVolumes[info.uuid]);
    var player = discovery.getPlayerByUUID(info.uuid);
    // Only do this if volume differs
    if (player.state.volume != lockVolumes[info.uuid])
      player.setVolume(lockVolumes[info.uuid]);
  }

  function streamFile(req, res) {
    // Deliver requested mp3 file to SONOS
    var ip = req.connection.remoteAddress;
    paperboy
      .deliver(webroot, req, res)
      .addHeader('Expires', 30000)
      .addHeader('Content-type:', 'audio/mpeg')
      .addHeader('X-PaperRoute', 'Node')
      .before(function() {
        console.log('Received Request from Sonos');
      })
      .after(function(statCode) {
        log(statCode, req.url, ip);
      })
      .error(function(statCode, msg) {
        res.writeHead(statCode, { 'Content-Type': 'text/plain' });
        res.end("Error " + statCode);
        log(statCode, req.url, ip, msg);
      })
      .otherwise(function(err) {
        console.log("404 Not Found");
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("Error 404: File not found");
      })
  };

  function handleAction(options, callback) {
    console.log(options)

    if (options.action == "say") {
      // Decode room
      options.room = decodeURIComponent(options.room);

      // Use Google tts translation service to create a mp3 file
      var tts_request = "http://translate.google.com/translate_tts?ie=UTF-8&q=" + options.text + "&tl=" + options.lang;

      // Construct a filesystem neutral filename
      var filename = decodeURIComponent(options.text);
      filename = encodeURIComponent(filename) + '-' + options.lang;
      filename = crypto.createHash('sha1').update(filename).digest('hex') + '.mp3';
      var filepath = webroot + '/tts/' + filename;

      // If not already downloaded request translation
      fs.stat(filepath, function(err, stat) {
        if (err) {
          console.log("Downloading new tts message file: " + filepath);
          var file = fs.createWriteStream(filepath);
          var request = http.get(tts_request, function(response) {
            response.pipe(file);
            file.on('finish', function() {
              file.end();
            });
          }).on('error', function(err) {
              fs.unlink(dest);
            });
        } else {
          console.log("Using cached tts message file: " + filepath);
        }
      });

      var player = discovery.getPlayer(options.room);

      // Use the preset action to play the tts file
      var tts_params = {
        "players": [
          { "roomName": options.room, "volume": player.getState().volume }
        ],
        "state": "play",
        "uri": "http://" + discovery.localEndpoint + ":" + app.get('port') + "/sonos/tts/" + filename,
        "playMode": "NORMAL"
      }
      discovery.applyPreset(tts_params);

      callback();
      return;
    }

    if (options.action === "saveall") {
      // Save the current state
      saveState = {};
      discovery.getZones().forEach(function(zone) {
        if (zone.coordinator.state.zoneState == "PLAYING") {
          var player = discovery.getPlayerByUUID(zone.uuid);
          var state = player.getState();
          saveState[zone.uuid] = {
            "players": [
              { "roomName": player.roomName, "volume": state.volume }
            ],
            "state": "play",
            "uri": state.currentTrack.uri,
            "playMode": "NORMAL"
          }
         }
      });
      callback();
      return;
    }
    if (options.action === "restoreall") {
      for (var uuid in saveState) {
        // Use the preset action to restore the saved state
        discovery.applyPreset(saveState[uuid]);
      }
      callback();
      return;
    }

    if (options.action === "zones") {
      callback(discovery.getZones());
      return;
    }

    if (options.action == "preset") {
      // Apply preset
      var value = decodeURIComponent(options.value);
      if (value.startsWith('{'))
        var preset = JSON.parse(value);
      else
        var preset = presets[value];

      console.log("applying preset", preset)

      if (preset)
        discovery.applyPreset(preset);

      callback();
      return;
    }

    if (options.action == "lockvolumes") {
      console.log("locking volumes");
      // Locate all volumes
      for (var i in discovery.players) {
        var player = discovery.players[i];
        lockVolumes[i] = player.state.volume;
      }
      // prevent duplicates, will ignore if no event listener is here
      discovery.removeListener("volume", restrictVolume);
      discovery.on("volume", restrictVolume);
      callback();
      return;
    }

    if (options.action == "unlockvolumes") {
      console.log("unlocking volumes");
      discovery.removeListener("volume", restrictVolume);
      callback();
      return;
    }

    if (options.action == "pauseall") {

      console.log("pausing all players");
      // save state for resume

      if (options.value && options.value > 0) {
        console.log("in", options.value, "minutes");
        setTimeout(function() { pauseAll(); }, options.value * 1000 * 60);
      } else {
        pauseAll();
      }

      callback();
      // why no return here?
    }

    if (options.action == "resumeall") {
      console.log("resuming all players");

      if (options.value && options.value > 0) {
        console.log("in", options.value, "minutes");
        setTimeout(function() { resumeAll(); }, options.value * 1000 * 60);
      } else {
        resumeAll();
      }

      callback();
      return;
    }

    if (options.action == "reindex") {
      // Find first player available.
      var player = discovery.getAnyPlayer();
      if (player) {
        player.refreshShareIndex(callback);
      } else {
        callback();
      }
      return;
    }

    var roomName = decodeURIComponent(options.room);
    var player = discovery.getPlayer(roomName);
    if (!player) {
      callback();
      return;
    }

    switch (options.action.toLowerCase()) {
      case "play":
        player.coordinator.play();
        break;
      case "pause":
        player.coordinator.pause();
        break;
      case "playpause":
        if (player.coordinator.state['currentState'] == "PLAYING") {
          player.coordinator.pause();
        } else {
          player.coordinator.play();
        }
        break;
      case "volume":
        player.setVolume(options.value);
        break;
      case "groupvolume":
        player.coordinator.groupSetVolume(options.value);
        break;
      case "mute":
        player.mute(true);
        break;
      case "unmute":
        player.mute(false);
        break;
      case "groupmute":
        player.coordinator.groupMute(true);
        break;
      case "groupunmute":
        player.coordinator.groupMute(false);
        break;
      case "state":
        var state = player.getState();
        callback(state);
        return;
        break;
      case "seek":
        player.coordinator.seek(options.value);
        break;
      case "trackseek":
        player.coordinator.trackSeek(options.value * 1);
        break;
      case "next":
        player.coordinator.nextTrack();
        break;
      case "previous":
        player.coordinator.previousTrack();
        break;
      case "setavtransport":
        player.setAVTransportURI(options.value);
        break;
      case "favorite":
        player.coordinator.replaceWithFavorite(options.value, function(success) {
          if (success)
            player.coordinator.play();
        });
        break;
      case "repeat":
        player.coordinator.repeat(options.value == "on" ? true : false);
        break;
      case "shuffle":
        player.coordinator.shuffle(options.value == "on" ? true : false);
        break;
      case "crossfade":
        player.coordinator.crossfade(options.value == "on" ? true : false);
        break;
      case "playlist":
        player.getPlaylists(function(success, playlists) {
          playlists.forEach(function(item) {
            if (item.title.toLowerCase() == decodeURIComponent(options.value).toLowerCase()) {
              player.replaceQueueWithPlaylist(item.uri.toLowerCase(), function(success) {
                if (success)
                  console.log("replaced queue with playlist " + item.title + ".");
                player.play();
              });
            }
          });
        });
        break;
      case "playlists":
        // return all Sonos Playlists
        player.getPlaylists(function(success, playlists) {
          var simplePlaylists = [];
          console.log(playlists)
          playlists.forEach(function(i) {
            simplePlaylists.push(i.title);
          });
          callback(simplePlaylists);
        });
        return;
      case "favorites":
        player.getFavorites(function(success, favorites) {
          // only present relevant data
          var simpleFavorites = [];
          console.log(favorites)
          favorites.forEach(function(i) {
            simpleFavorites.push(i.title);
          });
          callback(simpleFavorites);
        });
        return;

    }

    callback();

  };

  
  getSettingsFile();
  loadPresets();
  createDirs();
  
  this.streamFile = streamFile;
  this.handleAction = handleAction;
  
}

module.exports = SonosLib;
