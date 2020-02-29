app.controller('downloadCtrl', ['$scope', '$http', '$location', '$window', '$timeout', '$rootScope', 'sortingFuncs', 'songDatashare', 'youtubeFuncs', '$loading',
		function($scope, $http, $location, $window, $timeout, $rootScope, sortingFuncs, songDatashare, youtubeFuncs, $loading) {
	//scope vars
	$scope.downloadName = "";
	$scope.artistOptions = "First";
	$scope.albumOptions = "Album";
	$scope.genreOptions = "Genre";
	$scope.outputFormat = "mp3";
	$scope.readyDownload = false;
	$scope.callDone = null;

	$scope.data = [];

	$scope.closeDownload = function() {
		$scope.callDone = null;
		$scope.readyDownload = false;
		$("#downloadPlaylistModal").hide();
	};

	// $("body").on("click", function(evt) {
	// 	if ($(".modal").toArray().includes(evt.target)) {
	// 		$scope.closeDownload();
	// 	}
	// })
	// .keyup(function(evt) {
	// 	if (evt.keyCode == 27) {	//escape key
	// 		$scope.closeDownload();
	// 	}
	// });

	$rootScope.$on("loadDownload", function(e, data, callback) {
		$("#downloadPlaylistModal").css("display", "flex");
		//clean data and prepare to download
		$scope.data = data;
		if (data.name != null) {
			$scope.downloadName = data.name;
		}
		else if (data.songs.length == 1) {
			$scope.downloadName = data.songs[0]["name"];
		}
		else {
			$scope.downloadName = "";
		}
		$scope.readyDownload = false;
		$scope.callDone = callback;
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
		if ($scope.data.length == 0 || $scope.data.songs == null || $scope.data.songs.length == 0) {
			$scope.readyDownload = false;
			return;
		}
		var mySongIDs = new Set();
		var mySongs = [];
		for (var i = 0; i < $scope.data.songs.length; i ++) {
			if (mySongIDs.has($scope.data.songs[i]["_id"])) {
				continue;
			}
			mySongIDs.add($scope.data.songs[i]["_id"]);
			var mySong = {};
			if ($scope.data.songs[i]["url"] == null) {
				$scope.readyDownload = false;
				return;
			}
			mySong["url"] = $scope.data.songs[i]["url"];
			mySong["id"] = youtubeFuncs.cleanUrl(mySong["url"]);
			if ($scope.data.songs[i]["name"] == null) {
				$scope.readyDownload = false;
				return;
			}
			mySong["name"] = $scope.data.songs[i]["name"];
			switch ($scope.artistOptions) {
				case "All":
					mySong["artistStr"] = $scope.data.songs[i]["artistStr"] || "";
					break;
				case "First":
					mySong["artistStr"] = $scope.data.songs[i]["artist"][0] || "";
					break;
			}
			switch ($scope.albumOptions) {
				case "Album":
					mySong["album"] = $scope.data.songs[i]["album"] || "";
					break;
				case "AllArtists":
					mySong["album"] = $scope.data.songs[i]["artistStr"] || "";
					break;
				case "FirstArtist":
					mySong["album"] = $scope.data.songs[i]["artist"][0] || "";
					break;
			}
			switch ($scope.genreOptions) {
				case "Genre":
					mySong["genre"] = $scope.data.songs[i]["genre"] || "";
					break;
			}
			mySongs.push(mySong);
		}
		myQuery["songs"] = mySongs;
		//data is clean, so present as ready
		$scope.readyDownload = true;
		return myQuery;
	};

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	};

	async function testDone(delay, path) {
		await sleep(delay);
		$http.post("/checkStatus", {"name": path}).then(function(resp) {
			console.log(resp);
			if (resp.data.completed) {
				//file is ready to download!
				$("<form></form>").attr("action", "download/" + path).appendTo("#downloadPathDiv").submit().remove();
				if ($scope.callDone != null) {
					$scope.callDone();
				}
				$loading.finish("downloadCtrl");
				$scope.closeDownload();
			}
			else {
				//sleep and try again
				// await sleep(1000);
				testDone(1000, path);
			}
		}, function(err) {
			alert("Failed to download");
			$loading.finish("downloadCtrl");
		});
	}

	$scope.download = function() {
		$loading.start("downloadCtrl");
		var query = $scope.cleanData();
		console.log("DOWNLOAD");
		$http.post("/generate", {"name": query.name, "songs": query.songs, "type": query.format}).then(function(resp) {
			console.log(resp);
			// await sleep(resp.data.expected);
			testDone(resp.data.expected, resp.data.path);
			// $loading.finish("downloadCtrl");
			//below doesn't work
			// var link = $('<a href="' + resp.data.path + '" download="' + resp.data.name + '">download</a>').appendTo("#downloadPathDiv");
			// link[0].click()
			// link.remove();

			//rework below
			// $("<form></form>").attr("action", "download/" + resp.data.path).appendTo("#downloadPathDiv").submit().remove();
			// if ($scope.callDone != null) {
			// 	$scope.callDone();
			// }
			// $scope.closeDownload();
		}, function(err) {
			console.log(err);
			alert("Failed to download");
			$loading.finish("downloadCtrl");
		});
	};
}]);