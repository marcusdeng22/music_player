app.controller('NavCtrl', ['$scope', 'dispatcher', '$timeout', '$location', '$window', '$http', function($scope, dispatcher, $timeout, $location, $window, $http) {

    $scope.activeTab = "";
    $scope.activeId = "";
    $scope.tabIds = [
        "#playlistDiv",
        "#playDiv",
        "#editDiv"
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
        } else if (hash == 'edit') {
            $scope.activeTab = 'edit';
            $scope.activeId = "#editDiv";
        } else {
            //default screen here
        }

        $scope.tabIds.forEach(function(tabId) {
            if (tabId == $scope.activeId) {
                $(tabId).show();
            } else {
                $(tabId).hide();
            }
        });
    });

}]);
