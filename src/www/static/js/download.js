app.controller('downloadCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $http, $location, $timeout, dispatcher, sortingFuncs, songDatashare, youtubeFuncs) {
	//scope vars
	$scope.downloadName = "";
	$scope.artistOptions = "All";
	$scope.albumOptions = "Album";
	$scope.genreOptions = "Genre";
	$scope.outputFormat = "mp3";
	$scope.readyDownload = false;

	$scope.data = [];

	$scope.closeDownload = function() {
		$("#downloadPlaylistModal").hide();
	};

	$("body").on("click", function(evt) {
		if ($(".modal").toArray().includes(evt.target)) {
			$scope.closeDownload();
		}
	})
	.keyup(function(evt) {
		if (evt.keyCode == 27) {	//escape key
			$scope.closeDownload();
		}
	});

	dispatcher.on("loadDownload", function(data) {
		$("#downloadPlaylistModal").css("display", "flex");
		//clean data and prepare to send to app.js
		$scope.data = data;
		if (data.length == 1) {
			$scope.downloadName = data[0]["name"];
		}
		else {
			$scope.downloadName = "";
		}
		$scope.readyDownload = false;
		$scope.cleanData();
	});

	$scope.cleanData = function() {
		var myQuery = {};
		if ($scope.downloadName == "") {
			$scope.readyDownload = false;
			return;
		}
		myQuery["name"] = $scope.downloadName;
		myQuery["format"] = $scope.outputFormat;

		//clean data itself
		var mySongIDs = new Set();
		var mySongs = [];
		for (var i = 0; i < $scope.data.length; i ++) {
			if (mySongIDs.has($scope.data[i]["_id"])) {
				continue;
			}
			mySongIDs.add($scope.data[i]["_id"]);
			var mySong = {};
			if ($scope.data[i]["url"] == null) {
				$scope.readyDownload = false;
				return;
			}
			mySong["url"] = $scope.data[i]["url"];
			if ($scope.data[i]["name"] == null) {
				$scope.readyDownload = false;
				return;
			}
			mySong["name"] = $scope.data[i]["name"];
			switch ($scope.artistOptions) {
				case "All":
					mySong["artistStr"] = $scope.data[i]["artistStr"] || "";
					break;
				case "First":
					mySong["artistStr"] = $scope.data[i]["artist"][0] || "";
					break;
			}
			switch ($scope.albumOptions) {
				case "Album":
					mySong["album"] = $scope.data[i]["album"] || "";
					break;
				case "AllArtists":
					mySong["album"] = $scope.data[i]["artistStr"] || "";
					break;
				case "FirstArtist":
					mySong["album"] = $scope.data[i]["artist"][0] || "";
					break;
			}
			switch ($scope.genreOptions) {
				case "Genre":
					mySong["genre"] = $scope.data[i]["genre"] || "";
					break;
			}
			mySongs.push(mySong);
		}
		myQuery["songs"] = mySongs;
		//data is clean, so present as ready
		$scope.readyDownload = true;
		return myQuery;
	};

	$scope.download = function() {
		//send to app.js to download
		youtubeFuncs.download($scope.cleanData());
	};
}]);