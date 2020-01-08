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
			unload = false;
		}

		$scope.tabIds.forEach(function(tabId) {
			if (tabId == $scope.activeId) {
				//if moving to playlist or song, unload the edit html from existing and load the html to the new screen
				if (unload) {
					//angular compile on load: https://stackoverflow.com/questions/38543619/how-to-activate-new-angular-controller-after-bootstrapping
					if ($scope.activeId == "#playlistDiv") {
						//unload from #songDiv and load to #playlistSongEditDiv
						console.log("unloading song div");
						// $("#songEditDiv").empty();
						// $("#playlistSongEditDiv").load("/shared/list_edit_song.html");
						// $timeout(function() {
						// 	$compile(angular.element(document.querySelector("#playlistSongEditDiv")).contents())($scope);
						// }, 1000);
						songDatashare.loadListTemplate("#playlistSongEditDiv", $scope);
					}
					else if ($scope.activeId == "#songDiv") {
						console.log("unloading playlist div");
						// $("#playlistSongEditDiv").empty();
						// $("#songEditDiv").load("/shared/list_edit_song.html");
						// //now compile and load angular
						// var songEditAng = angular.element(document.querySelector("#songEditDiv"));
						// console.log("compiling song edit");
						// console.log(songEditAng);
						// $timeout(function() {
						// 	$compile(songEditAng.contents())($scope);
						// 	songDatashare.loadEditTemplate("#addNewSong", $scope);
						// }, 1000);
						songDatashare.loadListTemplate("#songEditDiv", $scope);
					}
				}
				$(tabId).show();
			} else {
				$(tabId).hide();
			}
		});
	});

}]);
