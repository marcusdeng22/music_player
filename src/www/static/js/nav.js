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
				$window.location.href = '/';
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

	playDatashare.playem.on("volChanged", function(volState) {
		console.log("VOL CHANGED");
		$scope.volState = volState;
		if (!$scope.$$phase) {
			$scope.$digest();
		}
	});

	$("#volumeSlider").slider({
		min: 0,
		max: 100,
		value: 100 - $scope.volState.vol,
		range: "max",
		orientation: "vertical",
		slide: function(event, ui) {
			console.log("SLIDE");
			console.log(100 - ui.value);
		}
	});

	//TODO: change the widths below to accomodate the volume control
	$(function() {
		$("#navNowPlaying").width($("#navContainer").outerWidth(true) - $("#navBrand").outerWidth(true) - $("#logoutNav").outerWidth(true) - 48*3 - 220);
	});

	$(window).on("resize", function() {
		$("#navNowPlaying").width($("#navContainer").outerWidth() - $("#navBrand").outerWidth() - $("#logoutNav").outerWidth() - 48*3 - 220);
	});
}]);
