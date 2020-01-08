app.controller('editSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, songDatashare) {

	$scope.songDatashare = songDatashare;

	$scope.previewSong = function() {
		console.log("previewing song");
		songDatashare.playem.addTrackByUrl(songDatashare.editData["url"]);
		songDatashare.playem.play();
	}

	$scope.previewSong();

	// //generate a playem instance on instantiation
	// // function logEvent (evtName) {
	// // 	this.on(evtName, (data) =>
	// // 	console.log("event:", evtName, data)
	// // 	);
	// // }
	// var config = {
	// 	playerContainer: document.getElementById("previewDisplay")
	// };
	// var playem = new Playem();	//TODO replace this with the shared playem
	// //ALSO TODO: grab all the event handlers from playlist.js and put them here to reinit
	// playem.addPlayer(YoutubePlayer, config);
	// // init logging for all player events
	// // ["onPlay", "onReady", "onTrackChange", "onEnd", "onPause", "onError", "onBuffering"].forEach(logEvent.bind(playem));

	// $scope.previewPlayer;
	// $scope.previewSong = function() {
	// 	console.log("previewing song");
	// 	//.loadVideoByUrl	loads a video by the url, but need to figure out how to create the player object
	// 	//.setVolume		sets the volume
	// 	//.playVideo
	// 	//.pauseVideo
	// 	//.getPlayerState	0=ended, 1=playing, 2=paused
	// 	//.getDuration
	// 	//.addEventListener	onReady, onStateChange
	// 	//.getIframe()

	// 	//create the video player on the start of opening the modal; then load the original video ID: library: splice out the video ID
	// 	//here, load the new ID once refreshed
	// 	//check the buffer status: may cause the play to fail
	// 	// function onYouTubePlayerAPIReady() {
	// 	// 	$scope.previewPlayer = new YT.Player('previewDisplay', {
	// 	// 		// videoId: $scope.songData[$scope.songIndices]["url"]
	// 	// 		events:
	// 	// 	})
	// 	// }
	// 	playem.stop();
	// 	playem.clearQueue();
	// 	console.log(playem.getQueue());
	// 	// console.log("adding url: ", $scope.songData[$scope.songIndices]["url"]);
	// 	// console.log($scope.songData);
	// 	// console.log($scope.songIndices);
	// 	// playem.addTrackByUrl($scope.songData[$scope.songIndices]["url"]);
	// 	// playem.addTrackByUrl($("#newSongUrlInput").val());
	// 	// console.log("adding: ", $("#newSongUrlInput").val());
	// 	console.log("adding: ", $scope.newSongData["url"]);
	// 	playem.addTrackByUrl($scope.newSongData["url"]);
	// 	// playem.addTrackByUrl("https://www.youtube.com/watch?v=8axQACbVkrk");
	// 	console.log(playem.getPlayers());
	// 	console.log(playem.getQueue());
	// 	playem.play();
	// }
}]);