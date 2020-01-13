app.controller('playCtrl', ["$scope", "$timeout", "$location", "uiSortableMultiSelectionMethods", "dispatcher",
		function ($scope, $timeout, $location, uiSortableMultiSelectionMethods, dispatcher) {
	$scope.playlistData = {};
	$scope.songIndices = [];
	$scope.playem = new Playem();
	var config = {
		playerContainer: document.getElementById("mainPlayer")
	};
	//test
	$scope.playem.addPlayer(YoutubePlayer, config);
	$scope.playem.addTrackByUrl("https://www.youtube.com/watch?v=L16vTRw9mDQ");
	$scope.playem.play();
	var controlDisplayed = false;

	dispatcher.on("startPlay", function(data) {
		console.log("starting to play");
		console.log(data);
		//add into queue
		$scope.playem.stop();
		$scope.playem.clearQueue();
		$scope.playem.clearPlayers();
		$("#mainPlayer").empty();
		// var config = {playerContainer: document.getElementById("mainPlayer")}
		// var config = {
		// 	playerContainer: document.getElementById("mainPlayer")
		// };
		$scope.playem.addPlayer(YoutubePlayer, config);	//TODO: add more players here
		$scope.playlistData = data;
		for (var i = 0; i < data["contents"].length; i ++) {
			$scope.playlistData["contents"][i]["artistStr"] = data["contents"][i]["artist"].join(", ");
			$scope.playem.addTrackByUrl(data["contents"][i]["url"]);
		}
		console.log($scope.playem);
		//hide controls in prep
		$("#playerCtrlDiv").hide();
		controlDisplayed = false;
		selectIndex(0);	//triggers play
	});

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		stop: function(e, ui) {
			//update playem queue here
			$scope.playem.clearQueue();	//this causes a stop?
			console.log($scope.playlistData.contents);
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				$scope.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
			}
		}
	});

	// $scope.playem.on("onTrackChange", function(data) {
	// 	console.log("track changed");
	// 	// setCtrlPosition();	//doesn't work
	// 	//set the new index here
	// 	console.log(data);
	// });

	//only these two events are triggered
	// $scope.playem.on("onTrackInfo", function(data) {
	$scope.playem.on("onPlay", function(data) {
		console.log("playing");
		if (!controlDisplayed) {
			// setPlayerSize();
			// setCtrlPosition();
			controlDisplayed = true;
		}
	});

	$("#playingSelect").on('ui-sortable-selectionschanged', function (e, args) {
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.$apply();
	});

	$scope.startPlay = function() {
		//play
		console.log("playing now!");
		$scope.playem.play();
	};

	function selectIndex(index) {
		$scope.songIndices = [index];
		console.log($scope.songIndices);
		$timeout(function() {
			console.log($(".playItem"));
			//find and click
			$(".playItem").eq($scope.songIndices).click();
			$scope.startPlay();
		});
	};

	$(window).resize(function() {
		// setPlayerSize();
		// setCtrlPosition();
	});

	function setPlayerSize() {
		var curWidth = $("#mainPlayer").outerWidth();
		var setHeight = 240;
		if (curWidth >= 3840) {
			setHeight = 2160;
		}
		else if (curWidth >= 2560) {
			setHeight = 1440;
		}
		else if (curWidth >= 1920) {
			setHeight = 1080;
		}
		else if (curWidth >= 1280) {
			setHeight = 720;
		}
		else if (curWidth >= 854) {
			setHeight = 480;
		}
		else if (curWidth >= 640) {
			setHeight = 360;
		}
		else {
			setHeight = 240;
		}
		$("#mainPlayer").height(setHeight);
	}

	function setCtrlPosition() {
		console.log("setting ctrl position");
		console.log($("#mainPlayer").outerHeight());
		console.log($("#mainPlayer").height());
		// set position of controls
		$("#playerCtrlDiv").css({
			"display": "block",
			"position": "absolute",
			"top": $("#mainPlayer").outerHeight() + 60 + 20	//height of the header bar + margins
		});
	};

	$scope.$on("$locationChangeStart", function() {
		$scope.playem.pause();
	})
}]);