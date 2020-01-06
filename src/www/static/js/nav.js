app.controller('NavCtrl', ['$scope', 'dispatcher', '$timeout', '$location', '$window', '$http', function($scope, dispatcher, $timeout, $location, $window, $http) {

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

		if (hash == 'playlist') {
			$scope.activeTab = 'playlist';
			$scope.activeId = "#playlistDiv";
		} else if (hash == 'play') {
			$scope.activeTab = 'play';
			$scope.activeId = "#playDiv";
		} else if (hash == 'song') {
			$scope.activeTab = 'song';
			$scope.activeId = "#songDiv";
		} else {
			//default screen here
			console.log("default screen reroute");
		}

		$scope.tabIds.forEach(function(tabId) {
			if (tabId == $scope.activeId) {
				//if moving to playlist or song, unload the edit html from existing and load the html to the new screen
				if ($scope.activeId == "#playlistDiv") {
					//unload from #songDiv and load to #playlistSongEditDiv
					console.log("unloading song div");
					$("#songDiv").empty();
					$("#playlistSongEditDiv").load("/shared/edit.html");
				}
				else if ($scope.activeId == "#songDiv") {
					console.log("unloading playlist div");
					$("#playlistSongEditDiv").empty();
					$("#songDiv").load("/shared/edit.html");
				}
				$(tabId).show();
			} else {
				$(tabId).hide();
			}
		});
	});

}]);
