app.controller('playlistCtrl', ['$scope', '$http', '$timeout', 'dispatcher', function($scope, $http, $timeout, dispatcher) {
    $scope.playlistData = [];
    $scope.songData = [];

    $scope.playlistSelect = [];

    $scope.getPlaylistData = function() {
        $http.post("/findPlaylist", {}).then(function(resp) {
            console.log("success");
            $scope.playlistData = resp.data;
            console.log($scope.playlistData);
        }, function(error) {
            console.log(error);
        });
    };

    $scope.getPlaylistData();

    $scope.getSongData = function(songDict) {
        query = {"content": songDict};
        console.log(query);
        $http.post("/findMusicList", {"content": songDict}).then(function(resp) {
            console.log("success");
            $scope.songData = resp.data;
            console.log($scope.songData);
        }, function(error) {
            console.log(error);
        });
    };

    //$scope.playlistSelect = $scope.playlistData[0]["name"];

    $scope.selectedPlaylist = function() {
        console.log($scope.playlistSelect);
        if ($scope.playlistSelect.length > 1) {
            $scope.songData = [];
        }
        else {
            $scope.getSongData($scope.playlistSelect[0]["contents"]);
        }
        // console.log("selected item: " + item.name);
        // console.log(item);
        // console.log($scope.playlistSelect);
        //query for item.contents
        // $scope.getSongData(item["contents"]);
    };
}]);
