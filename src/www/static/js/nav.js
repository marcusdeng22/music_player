app.controller('NavCtrl', ['$scope', '$rootScope', '$timeout', '$location', '$window', '$http', '$compile', 'songDatashare', 'playDatashare',
	function($scope, $rootScope, $timeout, $location, $window, $http, $compile, songDatashare, playDatashare) {

	$scope.activeTab = "";
	$scope.activeId = "";
	$scope.tabIds = [
		"#playlistDiv",
		"#playDiv",
		"#songDiv"
	];

	//add a listener for the nav bar
	$scope.$on('$locationChangeSuccess', function() {
		var hash = $location.hash();
		$("#mainNavbar .active").removeClass("active");

		if (hash == 'playlist') {
			console.log("routing to playlist");
			$scope.activeTab = 'playlist';
			$scope.activeId = "#playlistDiv";
			$("#playlistNavbar").addClass("active");
		}
		else if (hash == 'play') {
			console.log("routing to play");
			$scope.activeTab = 'play';
			$scope.activeId = "#playDiv";
			$("#playNavbar").addClass("active");
		}
		else if (hash == 'song') {
			console.log("routing to song");
			$scope.activeTab = 'song';
			$scope.activeId = "#songDiv";
			$("#songNavbar").addClass("active");
		}
		else if (hash == "logout") {
			console.log("logging out");
			$http.post("/logout").then(function(resp) {
				$timeout(function () {
					$window.location.href = '/';
				});
			}, function(err) {
				alert("Session expired");
				$window.location.href = '/';
			});
		}
		else {
			//default screen here
			console.log("default screen reroute");
			//route to playlist
			$scope.activeTab = "playlist";
			$scope.activeId = "#playlistDiv";
			$("#playlistNavbar").addClass("active");
		}

		$scope.tabIds.forEach(function(tabId) {
			if (tabId == $scope.activeId) {
				//if moving to playlist or song, unload the edit html from existing and load the html to the new screen
				//angular compile on load: https://stackoverflow.com/questions/38543619/how-to-activate-new-angular-controller-after-bootstrapping
				if ($scope.activeId == "#playlistDiv") {
					//unload from #songDiv and load to #playlistSongEditDiv
					console.log("unloading song div");
					$rootScope.$emit("playlistLoadListTemplate");
				}
				else if ($scope.activeId == "#songDiv") {
					console.log("unloading playlist div");
					$rootScope.$emit("songLoadListTemplate");
				}
				$(tabId).show();
			} else {
				$(tabId).hide();
			}
		});
	});

	$scope.playDatashare = playDatashare;
	$scope.previousSong = playDatashare.previousSong;
	$scope.nextSong = playDatashare.nextSong;
	$scope.playPause = playDatashare.playPause;

	$scope.volState = playDatashare.playem.getVol();
	$scope.audioHover = false;
	$scope.audioDown = false;
	$timeout(function() {
		$("#volumeContainer").removeClass("hidden");
	});

	playDatashare.playem.on("volChanged", function(volState) {
		console.log("VOL CHANGED");
		if (!$scope.audioDown) {
			console.log("ACCEPTED CHANGE");
			console.log(volState);
			$scope.volState = volState;
			$("#volumeSlider").slider("value", 100 - $scope.volState.vol);
			if (!$scope.$$phase) {
				$scope.$digest();
			}
		}
	});

	playDatashare.playem.on("onPlay", function() {
		//update the page title
		if (playDatashare.nowPlaying) {
			document.title = playDatashare.nowPlaying.name + " - " + playDatashare.nowPlaying.artistStr;
		}
	});

	$scope.toggleMute = function() {
		var resVol = playDatashare.playem.toggleMute();
		$scope.volState.muted = resVol.muted;
		$("#volumeSlider").slider("value", resVol.muted ? 100 : 100 - resVol.vol);
	}

	$("#volumeSlider").slider({
		min: 0,
		max: 100,
		value: 100 - $scope.volState.vol,
		range: "max",
		orientation: "vertical",
		slide: function(event, ui) {
			console.log("SLIDE");
			console.log(100 - ui.value);
			$scope.volState.vol = 100 - ui.value;
			$scope.volState.muted = (100 - ui.value > 0 ? false : true);
			playDatashare.playem.setVolume($scope.volState.vol);
			if (!$scope.$$phase) {
				$scope.$digest();
			}
		},
		start: function(event, ui) {
			$scope.audioDown = true;
		},
		stop: function(event, ui) {
			$scope.audioDown = false;
			console.log("STOP");
			if ($("#volumeContainer:hover").length == 0 && $("#volMute:hover").length == 0) {
				console.log("MOUSE NOT OVER");
				$scope.audioHover = false;
				if (!$scope.$$phase) {
					$scope.$digest();
				}
			}
		}
	});

	$scope.volIconClass = "fa-volume-up";
	$scope.$watch("volState", function(newVal) {
		if (newVal.muted || newVal.vol == 0) {
			$scope.volIconClass = "fa-volume-mute";
		}
		else if (newVal.vol < 50) {
			$scope.volIconClass = "fa-volume-down";
		}
		else {
			$scope.volIconClass = "fa-volume-up";
		}
	}, true);

	//TODO: change the widths below to accomodate the volume control
	$(function() {
		$("#navNowPlaying").width($("#navContainer").outerWidth(true) - $("#navBrand").outerWidth(true) - $("#logoutNav").outerWidth(true) - 48*4 - 220);
	});

	$(window).on("resize", function() {
		$("#navNowPlaying").width($("#navContainer").outerWidth() - $("#navBrand").outerWidth() - $("#logoutNav").outerWidth() - 48*4 - 220);
	});
}]);
