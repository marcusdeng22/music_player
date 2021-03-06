//adapted from https://github.com/adrienjoly/playemjs/blob/master/playem-youtube.js
//removed GAPI requirements and default player settings

window.$ = window.$ || function(){return window.$};
$.show = $.show || function(){return $};
$.attr = $.attr || function(){return $};
$.getScript = $.getScript || function(js,cb){loader.includeJS(js,cb);};

function YoutubePlayer(){
  return YoutubePlayer.super_.apply(this, arguments);
}
console.log(window.location);
(function() {
  console.log("YOUTUBE PLAYER INSTANTIATION");
  //includeJS("https://www.youtube.com/player_api");
  var prevState = -1; //unstarted
  var EVENT_MAP = {
    0: "onEnded",
    1: "onPlaying",
    2: "onPaused",
    3: "onBuffering", // youtube state: buffering
    // 5: "onPlaying"
    // 5: "onBuffering", // youtube state: cued
    5: "onCued"
  },
  // SDK_URL = 'https://apis.google.com/js/client.js?onload=initYT',
  // SDK_LOADED = false,
  PLAYER_API_SCRIPT = 'https://www.youtube.com/iframe_api',
  PLAYER_API_LOADED = false,
  YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch?v=",
  apiReady = false,
  DEFAULT_PARAMS = {
    // width: '200',
    // height: '200',
    width: "100%",
    height: "100%",
    // autoplay: 0,
    // fs: 0,
    playerVars: {
      fs: 0,
      // autoplay: 1,
      version: 3,
      enablejsapi: 1,
      // controls: 0,
      modestbranding: 1,
      showinfo: 0,
      wmode: "opaque",
      iv_load_policy: 3,
      allowscriptaccess: "always",
      origin: window.location,
      rel: 0
    }
  };

  function whenApiReady(cb){
    setTimeout(function(){
      if (apiReady && PLAYER_API_LOADED){
        cb();
      }else{
        whenApiReady(cb);
      }
    }, 200);
  };

  window.onYouTubeIframeAPIReady = function() {
    console.log("youtube api ready");
    apiReady = true;
    PLAYER_API_LOADED = true;
  };

  $.getScript(PLAYER_API_SCRIPT, function() {});

  // // called by $.getScript(SDK_URL)
  // window.initYT = function() {
  //   gapi.client.setApiKey(YOUTUBE_API_KEY);
  //   gapi.client.load('youtube', 'v3', function() {
  //     apiReady = true;
  //     $.getScript(PLAYER_API_SCRIPT, function() {
  //       // will call window.onYouTubeIframeAPIReady()
  //     });
  //   });
  // };

  // if (!SDK_LOADED) {
  //   $.getScript(SDK_URL, function() {
  //     // will call window.initYT()
  //     SDK_LOADED = true;
  //   });
  // } else if (!apiReady) {
  //   window.initYT();
  // }

  function Player(eventHandlers, embedVars) {
    console.log("YoutubePlayer init");
    this.eventHandlers = eventHandlers || {};
    this.embedVars = embedVars || {};
    this.label = "Youtube";
    this.isReady = false;
    this.trackInfo = {};
    this.player = {};
    var that = this;

    whenApiReady(function(){
      that.isReady = true;
      if (that.eventHandlers.onApiReady)
        that.eventHandlers.onApiReady(that);
    });
  };

  Player.prototype.initYT = function() {
    console.log("YoutubePlayer creation");
    var that = this;

    function updateState(newState) {
      console.log("YT STATE CHANGE");
      if (newState.data == YT.PlayerState.PLAYING){
        that.trackInfo.duration = that.player.getDuration();
      }
      console.log("------> YT newState:", newState, newState.data);
      var eventName = EVENT_MAP[newState.data];
      console.log(eventName);
      if (eventName && that.eventHandlers[eventName]) {
        that.eventHandlers[eventName](that);
      }
      prevState = newState.data;
    };
    // if (that.player.removeEventListener && typeof that.player.removeEventListener === "function" && Object.keys(that.player).length > 0) {
    //   that.player.removeEventListener("onStateChange", updateState);
    // }
    that.player = new YT.Player(that.embedVars.playerId || 'ytplayer', DEFAULT_PARAMS);
    that.player.addEventListener("onStateChange", updateState);
    that.player.addEventListener("onError", function(error) {
      that.eventHandlers.onError && that.eventHandlers.onError(that, {source:"YoutubePlayer", code: error});
    });
    that.element = that.player.getIframe();
    that.player.addEventListener('onReady', function(event) {
      that.initialPlay();
      setTimeout(function() {
        that.safeClientCall("onEmbedReady", that);                          //this calls the function in playem.js
      }, 15); //delay the embed ready until after we start playing
    });
  };

  Player.prototype.initialPlay = function() {
    var that = this;
    that.player.setVolume(that.embedVars.vol);
    // that.player.loadVideoById(that.embedVars.videoId);
    that.player.cueVideoById(that.embedVars.videoId);
    console.log("embed ready and cued");
    console.log(that.embedVars.autoplay);
    if (that.embedVars.autoplay) {
      setTimeout(function() {
        console.log("initialPlay autoplay now");
        that.player.playVideo();
      }, 10);
    }
  }

  Player.prototype.safeCall = function(fctName, param) {
    try {
      var args = Array.apply(null, arguments).slice(1), // exclude first arg (fctName)
      fct = (this.element || {})[fctName];
      //console.log(fctName, args, this.element)
      fct && fct.apply(this.element, args);
    }
    catch(e) {
      console.error("YT safecall error", e, e.stack);
    }
  }

  Player.prototype.safeClientCall = function(fctName, param) {
    console.log("SAFE CLIENT CALL: " + fctName);
    console.log(this.eventHandlers);
    console.log(this.eventHandlers[fctName]);
    console.log(param);
    try {
      if (this.eventHandlers[fctName])
        this.eventHandlers[fctName](param);
    }
    catch(e) {
      console.error("YT safeclientcall error", e.stack);
    }
  }

  Player.prototype.embed = function (vars) {
    console.log("embed function");
    this.embedVars = vars = vars || {};
    this.embedVars.playerId = this.embedVars.playerId || 'ytplayer';
    // this.trackInfo = {};

    if (Object.keys(this.player).length == 0) {
      console.log("creating YT player");
      // Player.prototype.initYT();
      this.initYT();
    }
    else {
      console.log("YT player exists");
      console.log(this.player);
      this.initialPlay();
    }

    // var that = this;
    // console.log("YT PLAYER PROTO EMBED");
    // console.log(that);
    // console.log(DEFAULT_PARAMS);
    // function updateState(newState) {
    //   console.log("YT STATE CHANGE");
    //   console.log(that);
    //   console.log(that.player);
    //   if (newState.data == YT.PlayerState.PLAYING){
    //     that.trackInfo.duration = that.player.getDuration();
    //   }
    //   console.log("------> YT newState:", newState, newState.data);
    //   var eventName = EVENT_MAP[newState.data];
    //   console.log(eventName);
    //   if (eventName && that.eventHandlers[eventName])
    //     that.eventHandlers[eventName](that);

    //   // console.log(this.embedVars.autoplay);
    //   // if (prevState == 3 && newState.data == -1) {  //buffered and now unstarted, so trigger play
    //   //   console.log("bufferd -> unstarted, so playing");
    //   //   that.player.playVideo();
    //   // }
    //   // if (prevState == -1 && newState.data == 3) {
    //   //   console.log("reverse buffer state");
    //   //   that.player.playVideo();
    //   // }
    //   // else if (newState.data == -1) { //unstarted; start it; this causes looping
    //   //   that.player.playVideo();
    //   // }
    //   prevState = newState.data;
    // }
    // if (that.player.removeEventListener && typeof that.player.removeEventListener === "function" && Object.keys(that.player).length > 0) {
    //   that.player.removeEventListener("onStateChange", updateState);
    // }
    // that.player = new YT.Player(that.embedVars.playerId || 'ytplayer', DEFAULT_PARAMS);
    // // that.player.addEventListener("onStateChange", "onYoutubeStateChange");
    // that.player.addEventListener("onStateChange", updateState);
    // // that.player.addEventListener("onStateChange", function(newState) {
    // //   console.log("YT STATE CHANGE");
    // //   console.log(that);
    // //   console.log(that.player);
    // //   if (newState.data == YT.PlayerState.PLAYING){
    // //     that.trackInfo.duration = that.player.getDuration();
    // //   }
    // //   console.log("------> YT newState:", newState, newState.data);
    // //   var eventName = EVENT_MAP[newState.data];
    // //   if (eventName && that.eventHandlers[eventName])
    // //     that.eventHandlers[eventName](that);

    // //   // console.log(this.embedVars.autoplay);
    // //   // if (prevState == 3 && newState.data == -1) {  //buffered and now unstarted, so trigger play
    // //   //   console.log("bufferd -> unstarted, so playing");
    // //   //   that.player.playVideo();
    // //   // }
    // //   // if (prevState == -1 && newState.data == 3) {
    // //   //   console.log("reverse buffer state");
    // //   //   that.player.playVideo();
    // //   // }
    // //   // else if (newState.data == -1) { //unstarted; start it; this causes looping
    // //   //   that.player.playVideo();
    // //   // }
    // //   prevState = newState.data;
    // // });
    // // that.player.addEventListener("onError", "onYoutubeError");
    // that.player.addEventListener("onError", function(error) {
    //   //console.log(that.embedVars.playerId + " error:", error);
    //   that.eventHandlers.onError && that.eventHandlers.onError(that, {source:"YoutubePlayer", code: error});
    // });
    // that.element = that.player.getIframe();
    // that.player.addEventListener('onReady', function(event) {
    //   that.player.setVolume(that.embedVars.vol);
    //   that.safeClientCall("onEmbedReady", that);                          //this calls the function in playem.js
    //   // that.player.loadVideoById(that.embedVars.videoId);
    //   that.player.cueVideoById(that.embedVars.videoId);
    //   console.log("embed ready and cued");
    //   console.log(that.embedVars.autoplay);
    //   if (that.embedVars.autoplay) {
    //     that.player.playVideo();
    //   }
    // });
  }

  Player.prototype.getEid = function(url) {
    if (
      /(youtube\.com\/(v\/|embed\/|(?:.*)?[\?\&]v=)|youtu\.be\/)([a-zA-Z0-9_\-]+)/.test(url)
      || /^\/yt\/([a-zA-Z0-9_\-]+)/.test(url)
      || /youtube\.com\/attribution_link\?.*v\%3D([^ \%]+)/.test(url)
      || /youtube.googleapis.com\/v\/([a-zA-Z0-9_\-]+)/.test(url)
      )
      return RegExp.lastParen;
  }

  function cleanId(id){
    return /([a-zA-Z0-9_\-]+)/.test(id) && RegExp.lastParen;
  }

  Player.prototype.play = function(id, vol=50, autoplay) {
    id = cleanId(id);
    console.log("PLAY -> YoutubePlayer", this.currentId, id);
    console.log(autoplay);
    if (!this.currentId || this.currentId != id) {
      this.embedVars.videoId = id;
      this.embedVars.vol = vol;
      this.embedVars.autoplay = autoplay;
      console.log("EMBED VARS:", this.embedVars);
      this.embed(this.embedVars);
    }
    else {
      console.log("this id already exists");
    }
  }

  Player.prototype.pause = function() {
    //console.log("PAUSE -> YoutubePlayer"/*, this.element, this.element && this.element.pauseVideo*/);
    if (this.player && this.player.pauseVideo)
      this.player.pauseVideo();
  }

  Player.prototype.resume = function() {
    console.log("RESUME -> YoutubePlayer", this.element, this.element && this.element.playVideo);
    if (this.player && this.player.playVideo)
      this.player.playVideo();
  }

  Player.prototype.stop = function() {
    try {
      this.player.stopVideo();
    } catch(e) {}
  }

  Player.prototype.getTrackPosition = function(callback) {
    if (callback && this.player && this.player.getCurrentTime && this.player.getPlayerState() == 1) //we are playing
      callback(this.player.getCurrentTime());
  };

  Player.prototype.setTrackPosition = function(pos) {
    // this.safeCall("seekTo", pos, true);
    if (this.player && this.player.seekTo)
      this.player.seekTo(pos);
  };

  Player.prototype.setVolume = function(vol) {
    if (this.player && this.player.setVolume)
      this.player.setVolume(vol);
  };

  Player.prototype.getVolume = function() {
    // console.log("YT player get vol")
    if (this.player && this.player.isMuted && this.player.getVolume) {
      return {muted: this.player.isMuted(), vol: Math.round(this.player.getVolume())};
    }
    return {};
  }

  Player.prototype.mute = function() {
    // if (this.player && this.player.setVolume) {  //for SoundCloud
    //   this.player.setVolume(0);
    // }
    if (this.player && this.player.mute) {
      this.player.mute();
    }
  }

  Player.prototype.unMute = function(vol) {
    // if (this.player && this.player.setVolume) {  //for SoundCloud
    //   this.player.setVolume(vol);
    // }
    if (this.player && this.player.unMute) {
      this.player.unMute();
    }
  }

  //return Player;
  //inherits(YoutubePlayer, Player);
  YoutubePlayer.prototype = Player.prototype;
  YoutubePlayer.super_ = Player;
})();

try{
  module.exports = YoutubePlayer;
}catch(e){};