app.controller('NavCtrl', ['$scope', 'dispatcher', '$timeout', '$location', '$window', '$http', '$compile', 'songDatashare',
	function($scope, dispatcher, $timeout, $location, $window, $http, $compile, songDatashare) {

	$scope.activeTab = "";
	$scope.activeId = "";
	$scope.tabIds = [
		"#playlistDiv",
		"#playDiv",
		"#songDiv"
	];
/**
	dispatcher.on('bulkUserRefresh', function() {
		$timeout(function() {$scope.showBulkUserAdd = true;}, 0);
	});

	dispatcher.on('bulkUserEnd', function() {
		$timeout(function() {$scope.showBulkUserAdd = false;}, 0);
	});

	dispatcher.on('bulkProjectRefresh', function() {
		$timeout(function() {$scope.showBulkProjectAdd = true;}, 0);
	});

	dispatcher.on('bulkProjectEnd', function() {
		$timeout(function() {$scope.showBulkProjectAdd = false;}, 0);
	});
**/
	//add a listener for the nav bar
	$scope.$on('$locationChangeSuccess', function() {
		// TODO What you want on the event.

		var hash = $location.hash();
		var unload = true;

		if (hash == 'playlist') {
			console.log("routing to playlist");
			$scope.activeTab = 'playlist';
			$scope.activeId = "#playlistDiv";
		} else if (hash == 'play') {
			console.log("routing to play");
			$scope.activeTab = 'play';
			$scope.activeId = "#playDiv";
		} else if (hash == 'song') {
			console.log("routing to song");
			$scope.activeTab = 'song';
			$scope.activeId = "#songDiv";
		} else {
			//default screen here
			console.log("default screen reroute");
			// unload = false;
			//route to playlist
			$scope.activeTab = "playlist";
			$scope.activeId = "#playlistDiv";
		}

		$scope.tabIds.forEach(function(tabId) {
			if (tabId == $scope.activeId) {
				//if moving to playlist or song, unload the edit html from existing and load the html to the new screen
				if (unload) {
					//angular compile on load: https://stackoverflow.com/questions/38543619/how-to-activate-new-angular-controller-after-bootstrapping
					if ($scope.activeId == "#playlistDiv") {
						//unload from #songDiv and load to #playlistSongEditDiv
						console.log("unloading song div");
						// songDatashare.loadListTemplate("#playlistSongEditDiv", $scope);
						dispatcher.emit("playlistLoadListTemplate");
					}
					else if ($scope.activeId == "#songDiv") {
						console.log("unloading playlist div");
						// songDatashare.loadListTemplate("#songEditDiv", $scope);\
						dispatcher.emit("songLoadListTemplate");
					}
				}
				$(tabId).show();
			} else {
				$(tabId).hide();
			}
		});
	});

}]);
