// configuration

var DEFAULT_PLAY_TIMEOUT = 10000
window.USE_SWFOBJECT = true //! !window.swfobject; // ... to embed youtube flash player

window.$ = window.$ || function () { return window.$ }

// utility functions

if (undefined == window.console) { window.console = {log: function () {}} }

/**
 * This class provides helpers to load JavaScript resources and JSON data.
 * @class Loader
 */
function Loader () {
  var FINAL_STATES = {'loaded': true, 'complete': true, 4: true}
  var head = document.getElementsByTagName('head')[0]
  var pending = {}
  var counter = 0
  return {
    /**
     * @private
     * @callback dataCallback
     * @memberof Loader.prototype
     * @param {object|string} data JSON object, or string returned by request as `responseText`.
     */
    /**
     * Loads and returns a JSON resource asynchronously, using XMLHttpRequest (AJAX).
     * @memberof Loader.prototype
     * @param {string} src HTTP(S) URL of the JSON resource to load.
     * @param {dataCallback} cb Callback function with request's data as first parameter.
     */
    loadJSON: function (src, cb) {
      // if (pending[src]) return cb && cb();
      // pending[src] = true;
      // cross-domain ajax call
      var xdr = new window.XMLHttpRequest()
      xdr.onload = function () {
        var data = xdr.responseText
        try {
          data = JSON.parse(data)
        } catch (e) {};
        cb(data)
        // delete pending[src];
      }
      xdr.open('GET', src, true)
      xdr.send()
    },
    /**
     * @private
     * @callback errorCallback
     * @memberof Loader.prototype
     * @param {Error} error Error caught thru the `error` event or `appendChild()` call, if any.
     */
    /**
     * Loads a JavaScript resource into the page.
     * @memberof Loader.prototype
     * @param {string} src HTTP(S) URL of the JavaScript resource to load into the page.
     * @param {errorCallback} cb Callback function with error as first parameter, if any.
     */
    includeJS: function (src, cb) {
      var inc, nt
      if (pending[src]) {
        if (cb) {
          nt = setInterval(function () {
            if (pending[src]) { return console.log('still loading', src, '...') }
            clearInterval(nt)
            cb()
          }, 50)
        }
        return
      }
      pending[src] = true
      inc = document.createElement('script')
      // inc.async = "async";
      inc.onload = function () {
        if (!pending[src]) { return }
        delete pending[src]
        cb && setTimeout(cb, 1)
        delete inc.onload
      }
      inc.onerror = function (e) {
        e.preventDefault()
        inc.onload(e)
      }
      inc.onreadystatechange = function () {
        if (!inc.readyState || FINAL_STATES[inc.readyState]) { inc.onload() }
      }
      try {
        inc.src = src
        head.appendChild(inc)
      } catch (e) {
        console.error('Error while including', src, e)
        cb(e)
      }
    },
    /**
     * Loads and returns a JSON resource asynchronously, by including it into the page (not AJAX).
     * @memberof Loader.prototype
     * @param {string} src HTTP(S) URL of the JSON resource to load.
     * @param {function} cb Callback function, called by the resource's script.
     */
    loadJSONP: function (src, cb) {
      var callbackFct = '__loadjsonp__' + (counter++)
      window[callbackFct] = function () {
        cb.apply(window, arguments)
        delete window[callbackFct]
      }
      this.includeJS(src + (src.indexOf('?') == -1 ? '?' : '&') + 'callback=' + callbackFct, function () {
        // if http request fails (e.g. 404 error / no content)
        setTimeout(window[callbackFct], 10)
      })
    }
  }
}

window.loader = new Loader()

// EventEmitter

function EventEmitter () {
  this._eventListeners = {}
}

EventEmitter.prototype.on = function (eventName, handler) {
  this._eventListeners[eventName] = (this._eventListeners[eventName] || []).concat(handler)
}

EventEmitter.prototype.emit = function (eventName) {
  var i
  var args = Array.prototype.slice.call(arguments, 1) // remove eventName from arguments, and make it an array
  var listeners = this._eventListeners[eventName]
  for (i in listeners) { listeners[i].apply(null, args) }
}

/**
 * Inherit the prototype methods from one constructor into another. (from Node.js)
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 * @ignore => this function will not be included in playemjs' generated documentation
 */
function inherits (ctor, superCtor) {
  ctor.super_ = superCtor
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  })
};

/**
 * Plays a sequence of streaming audio/video tracks by embedding the corresponding players
 * into the page.
 *
 * Events:
 * - "onError", {code,source}
 * - "onReady"
 * - "onPlay"
 * - "onPause"
 * - "onEnd"
 * - "onTrackInfo", track{}
 * - "onTrackChange", track{}
 * - "loadMore"
 * @param {Object} playemPrefs Settings and preferences.
 * @param {Boolean} playemPrefs.loop - If true, the playlist will be played infinitely. (default: true)
 * @param {Number} playemPrefs.playTimeoutMs - Number of milliseconds after which an error event will be fired, if a tracks was not able to play. (default: 10000, i.e. 10 seconds)
 */

function Playem (playemPrefs) {
  function Playem (playemPrefs) {
    EventEmitter.call(this)

    playemPrefs = playemPrefs || {}
    playemPrefs.loop = playemPrefs.hasOwnProperty('loop') ? playemPrefs.loop : false
    playemPrefs.playTimeoutMs = playemPrefs.playTimeoutMs || DEFAULT_PLAY_TIMEOUT
    playemPrefs.autoplay = playemPrefs.hasOwnProperty("autoplay") ? playemPrefs.autoplay : true;

    var players = [] // instanciated Player classes, added by client
    var i
    var exportedMethods
    var currentTrack = null
    var trackList = []
    var whenReady = null
    var playersToLoad = 0
    var progress = null
    var that = this
    var playTimeout = null
    // var volume = 100

    var prevVolState = {muted: false, unmutedVol: 100, vol: 100, mult: 1, local: 100};
    var volPoll = null;

    /**
   * @memberof Playem.prototype
   * @param {string} key Key of the Playem parameter to set.
   * @param {any} val Value to affect to that `key`.
   */
    this.setPref = function (key, val) {
      playemPrefs[key] = val
    }

    function doWhenReady (player, fct) {
      var interval = null
      function poll () {
        if (player.isReady && interval) {
          clearInterval(interval)
          fct()
        } else {
          console.warn('PLAYEM waiting for', player.label, '...')
        }
      }
      if (player.isReady) { setTimeout(fct) } else { interval = setInterval(poll, 1000) }
    }

    function addTrack (metadata, volPer=50, url) {
      var track = {
        index: trackList.length,
        metadata: metadata || {},
        volPer: volPer
      }
      if (url) { track.url = url }
      trackList.push(track)
      return track
    }

    function addTrackById (id, player, metadata, volPer) {
      if (id) {
        var track = addTrack(metadata, volPer)
        track.trackId = id
        track.player = player
        track.playerName = player.label.replace(/ /g, '_')
        return track
        // console.log("added:", player.label, "track", id, track/*, metadata*/);
      } else { throw new Error('no id provided') }
    }

    function searchTracks (query, handleResult) {
      var expected = 0
      var i
      var currentPlayer
      for (i = 0; i < players.length; i++) {
        currentPlayer = players[i]
        // Search for player extending the "searchTracks" method.
        if (typeof currentPlayer.searchTracks === 'function') {
          expected++
          currentPlayer.searchTracks(query, 5, function (results) {
            for (var i in results) {
              handleResult(results[i])
            }
            if (--expected === 0) { handleResult() } // means: "i have no (more) results to provide for this request"
          })
        };
      };
    };

    function limitVol(vol) {
      if (vol < 0) {
        vol = 0;
      }
      if (vol > 100) {
        vol = 100;
      }
      return vol;
    }

    var playerVolRatio = null;
    //get the volume from the current track's player
    //only adjusts global volume if player's volume is greater than the current global volume or muted
    function pollVolume() {
      var polledVol = callPlayerFct("getVolume");   //{muted: <bool>, vol: <0-100>}
      // console.log("POLL");
      // console.log(polledVol);
      if ("muted" in polledVol) {
        if (prevVolState.muted != polledVol.muted) {
          console.log("MUTED CHANGED");
          console.log(polledVol);
          prevVolState.muted = polledVol.muted;
          that.emit("volChanged", extractVol());
        }
      }
      if ("vol" in polledVol && (!("muted" in polledVol) || !polledVol.muted)) {
        if (polledVol.vol != prevVolState.local) {  //player vol has changed; need to wait for it to settle
          console.log("UPDATING LOCAL VOL: " + polledVol.vol);
          prevVolState.local = polledVol.vol;
        }
        else {
          playerVolRatio = (prevVolState.vol != 0 ? polledVol.vol / prevVolState.vol : 0);
        }
        var curVol = Math.round(polledVol.vol / prevVolState.mult); //calculated global vol
        var diff = curVol - prevVolState.vol;
        // var emit = false;
        if (diff > 0) { //if player volume is greater than the global volume
          console.log("POLLED VOL CHANGED");
          console.log(curVol);
          console.log(diff);
          console.log(prevVolState);
          prevVolState.vol = limitVol(prevVolState.vol + diff); //update the global volume
          prevVolState.unmutedVol = prevVolState.vol;
          console.log(prevVolState);
          that.emit("volChanged", extractVol());
        }
        if (diff != 0) {  //there is a difference, so update the multiplier
          prevVolState.mult = polledVol.vol / prevVolState.vol;
        }
      }
    }

    function extractVol() {
      // return {muted: prevVolState.muted, vol: prevVolState.vol / prevVolState.mult};
      return {muted: prevVolState.muted, vol: prevVolState.unmutedVol};
      // return {muted: prevVolState.muted, vol: Math.round(prevVolState.unmutedVol / prevVolState.mult)};
    }

    /*
    *sets the volume of the player as a percentage of the global volume (0-100)
    *this should be used by clients
    */
    // function setVolumePer (percentage) {
    //   percentage = limitVol(percentage) / 100;
    //   prevVolState.mult = percentage;
    //   prevVolState.local = Math.round(prevVolState.vol * percentage);
    //   console.log("setting volume with percentage " + prevVolState.mult + " res: " + prevVolState.local);
    //   callPlayerFct('setVolume', prevVolState.local);
    // }

    function setLocalVolume(percentage) {
      percentage = limitVol(percentage) / 100;
      prevVolState.mult = percentage;
      prevVolState.local = Math.round(prevVolState.vol * percentage);
      return prevVolState.local;
    }

    /*
    *sets the volume of the player to be relative to the exact volume (0-100)
    *this should be used by playem: this is the global volume
    */
    function setVolume(vol=prevVolState.vol) {
      vol = limitVol(vol);

      prevVolState.vol = vol;
      prevVolState.unmutedVol = vol;
      //use the latest but stable ratio of player to global volume
      var newPlayerVol = null;
      console.log("STABLE VOL RATIO: " + playerVolRatio);
      if (playerVolRatio) {
        newPlayerVol = vol * playerVolRatio;
      }
      else {
        console.log("NO STABLE VOL RATIO: ");
        console.log(prevVolState);
        newPlayerVol = vol * prevVolState.mult;
      }
      prevVolState.local = Math.round(newPlayerVol);
      if (prevVolState.local > 0) {
        callPlayerFct("unMute");
      }
      callPlayerFct("setVolume", Math.round(prevVolState.local));
    }

    function stopTrack () {
      if (progress) { clearInterval(progress) }
      if (volPoll != null) {
          clearInterval(volPoll);
          volPoll = null;
        }
      for (var i in players) {
        if (players[i].stop) { players[i].stop() } else { players[i].pause() }
      }
      try {
        window.soundManager.stopAll()
      } catch (e) {
        console.error('playem tried to stop all soundManager sounds =>', e)
      }
    }

    function playTrack (track, autoplay=playemPrefs.autoplay) {
      console.log("playTrack", track);
      stopTrack()
      currentTrack = track
      delete currentTrack.trackPosition // = null;
      delete currentTrack.trackDuration // = null;
      that.emit('onTrackChange', track)
      if (!track.player) { return that.emit('onError', {code: 'unrecognized_track', source: 'Playem', track: track}) }
      doWhenReady(track.player, function () {
        // console.log("playTrack #" + track.index + " (" + track.playerName+ ")", track);
        console.log("calling play function");
        console.log(autoplay);
        callPlayerFct('play', track.trackId, track.volPer, autoplay)
        // setVolume()
        // setVolumePer(track.vol);
        if (currentTrack && currentTrack.index == trackList.length - 1) { that.emit('loadMore') }
        // if the track does not start playing within 7 seconds, skip to next track
        setPlayTimeout(function () {
          console.warn('PLAYEM TIMEOUT') // => skipping to next song
          that.emit('onError', {code: 'timeout', source: 'Playem'})
          exportedMethods.next();
        })
      })
    }

    function setPlayTimeout (handler) {
      // console.log("set play timeout");
      if (playTimeout) {
        // console.log("cleared timeout");
        clearTimeout(playTimeout) }
      playTimeout = !handler ? null : setTimeout(handler, playemPrefs.playTimeoutMs)
      // console.log("new timeout: ", playTimeout);
      // console.log(handler)
      // console.log(playTimeout)
    }

    function callPlayerFct (fctName, param, volPer=null, autoplay=playemPrefs.autoplay) {
      try {
        // console.log("calling player function")
        // console.log(fctName)
        // console.log(param)
        // console.log(playemPrefs.autoplay);
        // console.log(currentTrack.player)
        if (currentTrack) {
          var vol = null;
          if (volPer) {
            vol = setLocalVolume(volPer);
          }
          return currentTrack.player[fctName](param, vol, autoplay)
        }
      } catch (e) {
        console.warn('Player call error', fctName, e, e.stack)
      }
    }

    // functions that are called by players => to propagate to client
    function createEventHandlers (playemFunctions) {
      var eventHandlers = {
        onApiReady: function (player) {
          // console.log(player.label + " api ready");
          if (whenReady && player == whenReady.player) { whenReady.fct() }
          if (--playersToLoad == 0) { that.emit('onReady') }
        },
        onEmbedReady: function (player) {
          //set the volume to the previous state, and start polling for volume
          console.log("EMBED READY");
          console.log(player);
          // setVolume()
          //need to set the volume here with respect to local vol! MOVED TO INDIV PLAYER
          volPoll = setInterval(pollVolume, 200);
        },
        onBuffering: function (player) {
          setTimeout(function () {
            setPlayTimeout()
            that.emit('onBuffering')
          })
        },
        onPlaying: function (player) {
          // setPlayTimeout(); // removed because soundcloud sends a "onPlaying" event, even for not authorized tracks
          // setVolume()
          setTimeout(function () {
            that.emit('onPlay')
          }, 1)
          if (player.trackInfo && player.trackInfo.duration) {
            eventHandlers.onTrackInfo({
              position: player.trackInfo.position || 0,
              duration: player.trackInfo.duration
            })
          }

          if (progress) { clearInterval(progress) }

          if (player.getTrackPosition) {
            // var that = eventHandlers; //this;
            progress = setInterval(function () {
              player.getTrackPosition(function (trackPos) {
                eventHandlers.onTrackInfo({
                  position: trackPos,
                  duration: player.trackInfo.duration || currentTrack.trackDuration
                })
              })
            }, 1000)
          }
        },
        onTrackInfo: function (trackInfo) {
          // console.log("ontrackinfo", trackInfo, currentTrack);
          if (currentTrack && trackInfo) {
            if (trackInfo.duration) {
              currentTrack.trackDuration = trackInfo.duration
              setPlayTimeout()
            }
            if (trackInfo.position) { currentTrack.trackPosition = trackInfo.position }
          }
          that.emit('onTrackInfo', currentTrack)
        },
        onPaused: function (player) {
          console.log(player.label + ".onPaused");
          setPlayTimeout()
          if (progress) { clearInterval(progress) }
          progress = null
          // if (!avoidPauseEventPropagation)
           that.emit("onPause");
          // avoidPauseEventPropagation = false;
        },
        onEnded: function (player) {
          // console.log(player.label + ".onEnded");
          stopTrack()
          if (volPoll != null) {
            clearInterval(volPoll);
            volPoll = null;
          }
          that.emit('onEnd')
          playemFunctions.next()
        },
        onError: function (player, error) {
          console.error(player.label + ' error:', ((error || {}).exception || error || {}).stack || error)
          if (volPoll != null) {
            clearInterval(volPoll);
            volPoll = null;
          }
          setPlayTimeout(playemFunctions.next);
          that.emit('onError', error)
        }
      };
      // handlers will only be triggered is their associated player is currently active
      ['onEmbedReady', 'onBuffering', 'onPlaying', 'onPaused', 'onEnded', 'onError'].map(function (evt) {
        // console.log("EVENT HANDLER MAP");
        var fct = eventHandlers[evt]
        // console.log(fct);
        eventHandlers[evt] = function (player, x) {
          // console.log("INNER EVENT HANDLER");
          // console.log(currentTrack);
          // console.log(player);
          if (currentTrack && player == currentTrack.player) {
            // console.log("MATCHED INNER");
            return fct(player, x)
          }
          /*
          else if (evt != "onEmbedReady")
            console.warn("ignore event:", evt, "from", player, "instead of:", currentTrack.player);
          */
        }
      })
      return eventHandlers
    }

    // exported methods, mostly wrappers to Players' methods
    exportedMethods = {
      addPlayer: function (PlayerClass, vars) {
        playersToLoad++
        var player = new PlayerClass(createEventHandlers(this, vars), vars)
        players.push(player)
        return player
      },
      clearPlayers: function() {
        players = [];
      },
      getPlayers: function () {
        return players
      },
      getQueue: function () {
        return trackList
      },
      clearQueue: function () {
        trackList = [];
        currentTrack = null;
      },
      addTrackByUrl: function (url, volPer=50, metadata) {
        var p, player, eid
        for (p = 0; p < players.length; ++p) {
          player = players[p]
          // console.log("test ", player.label, eid);
          eid = player.getEid(url)
          if (eid) { return addTrackById(eid, player, metadata, volPer) }
        }
        return addTrack(metadata, volPer, url)
      },
      play: function (i) {
        console.log("triggering play:", i);
        console.log("play list:", trackList);
        console.log("cur track:", currentTrack);
        playTrack(i != undefined ? trackList[i] : currentTrack || trackList[0])
      },
      cue: function(i) {
        playTrack(i != undefined ? trackList[i] : currentTrack || trackList[0], false);
      },
      pause: function () {
        callPlayerFct('pause')
        that.emit('onPause')
      },
      stop: stopTrack,
      resume: function () {
        callPlayerFct('resume')
      },
      next: function () {
        console.log("next");
        if (currentTrack) {
          if (playemPrefs.loop || currentTrack.index + 1 < trackList.length) { playTrack(trackList[(currentTrack.index + 1) % trackList.length]) }
        }
      },
      prev: function () {
        playTrack(trackList[(trackList.length + currentTrack.index - 1) % trackList.length])
      },
      seekTo: function (pos) {
        if ((currentTrack || {}).trackDuration) { callPlayerFct('setTrackPosition', pos * currentTrack.trackDuration) }
      },
      setVolume: setVolume,
      // setVolumePer: setVolumePer,
      searchTracks: searchTracks,
      setCurrentTrack: function(index) {
        currentTrack = trackList[index];
        return currentTrack;
      },
      getCurrentTrack: function() {
        return currentTrack;
      },
      toggleRepeat: function() {
        playemPrefs.loop = !playemPrefs.loop;
        return playemPrefs.loop;
      },
      toggleAutoplay: function() {
        playemPrefs.autoplay = !playemPrefs.autoplay;
        return playemPrefs.autoplay;
      },
      toggleMute: function() {
        prevVolState.muted = !prevVolState.muted;
        if (prevVolState.muted) {
          callPlayerFct("mute");
        }
        else {
          callPlayerFct("unMute", prevVolState.unmutedVol);
        }
        return extractVol();
      },
      getVol: function() {
        return extractVol();
      }
    }
    for (i in exportedMethods) { this[i] = exportedMethods[i] }
  }

  inherits(Playem, EventEmitter)

  return new Playem()
};

try {
  module.exports = Playem
} catch (e) {};