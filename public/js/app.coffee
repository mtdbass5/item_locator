app = angular.module 'app', []

app.controller 'mainCtrl', ['$scope', '$sce', '$map', '$locations'
  ($scope, $sce, $map, $locations) ->
    geocoder = new google.maps.Geocoder()

    $scope.locations = $locations
    $scope.sortField = 'name'

    $scope.$on 'unGroup', ->
      $scope.sortField = 'name'

    $scope.getLabel = (locations, i) ->
      distance = _.find [500, 250, 100, 50, 20, 10, 5, 1], (dist) ->
        locations[i].distance >= dist and (i is 0 or locations[i - 1].distance < dist)
      if distance
        string = "<div class='label label-miles'>#{distance}+ Miles</div>"
      $sce.trustAsHtml string

    calcDistances = (searchPoint) ->
      _.each $locations.data, (loc) ->
        dist = $map.calcDistance searchPoint, $map.genLatLng loc.lat, loc.lng
        dist *= 0.000621371; #convert meters to miles
        loc.distance = parseFloat dist.toFixed()

    $scope.locationSearch = ->
      geocoder.geocode 'address': $scope.searchAddress, (results, status) ->
        if results.length
          result = results[0]
          $map.fit result.geometry.bounds
          calcDistances result.geometry.location
          $locations.filteredData = $locations.data
          $scope.sortField = 'distance'
          $scope.groupLabel = "Distance from \"#{result.formatted_address}\""
          $scope.$apply()
          
    $locations.get 'clients.json'
]

app.directive 'activateItem', ->
  (scope, el, attrs) ->
    el.on 'click', ->
      scope.locations.activateItem attrs.activateItem

app.directive 'infoWindow', ->
  restrict: 'E'
  templateUrl: 'info-window.html'

app.directive 'list', ['$filter', ($filter) ->
  restrict: 'E'
  transclude: true
  scope:
    groupLabel: '='
    locations: '='
    sortField: '&'
    getLabel: '&'
  replace: true
  templateUrl: 'list.html'
  link: (scope) ->

    scope.$watch 'searchValue', (newVal, oldVal) ->
      if newVal isnt oldVal
        scope.locations.filterData newVal

    scope.unGroup = ->
      scope.groupLabel = ''
      scope.$emit 'unGroup'
]

app.directive 'map', ['$compile', '$map', ($compile, $map) ->
  restrict: 'E'
  replace: true
  scope:
    locations: '='
  template: '<div class="map-wrapper">
    <div class="map" id="map-canvas"></div>
  </div>'
  link: (scope, el) ->
    pinClick = false
    markers = []
    infoWindow = new google.maps.InfoWindow()
    infoWindowTemplate = $compile('<info-window></info-window>') scope

    $map.init '#map-canvas'
      
    google.maps.event.addListener infoWindow, 'closeclick', ->
      scope.locations.deactivateItem(true)

    scope.$watch 'locations.activeItem', (item) ->
      if item
        unless pinClick
          $map.center $map.markers[item.index].position
        infoWindow.open $map.map, $map.markers[item.index]

    filterMarkers = (data) ->
      indexes = _.indexBy data, 'index'
      _.each $map.markers, (item, i) ->
        item.setVisible i of indexes

    scope.locations.activateItemCallback = ->
      infoWindow.setContent infoWindowTemplate[0].innerHTML

    scope.$watch 'locations.filteredData', (newData, oldData) ->
      if newData
        if oldData
          filterMarkers newData
        else
          $map.genMarkers newData, ->
            pinClick = true
            scope.locations.activateItem @index
            pinClick = false
]

app.factory '$locations', ['$rootScope', '$http', '$filter', ($rootScope, $http, $filter) ->

  activateItem: (index) ->
    @deactivateItem()
    @activeItem = @data[index]
    @activeItem.isActive = true
    $rootScope.$apply()
    @activateItemCallback and @activateItemCallback()

  deactivateItem: (apply) ->
    @activeItem?.isActive = false
    @activeItem = null
    apply and $rootScope.$apply()

  get: (url) ->
    $http.get(url).then (response) =>
      @data = response.data
      @filteredData = @data

  filterData: (filterVal) ->
    if filterVal
      @filteredData = $filter('filter') @data, name: filterVal
    else
      @filteredData = @data
]

app.factory '$map', ->

  genMarkerBounds = (markers) ->
    bounds = new google.maps.LatLngBounds()
    _.each markers, (marker) ->
      bounds.extend marker.position
    bounds

  calcDistance: (start, end) ->
    google.maps.geometry.spherical.computeDistanceBetween start, end

  center: (point) ->
    @map.setCenter point

  fit: (bounds) ->
    @map.fitBounds bounds

  genLatLng: (lat, lng) ->
    new google.maps.LatLng lat, lng

  genMarkers: (data, eventHandler) ->
    @markers = _.map data, (loc, i) =>
      marker = new google.maps.Marker
        map: @map
        position: @genLatLng loc.lat, loc.lng
        index: i
      google.maps.event.addListener marker, 'click', eventHandler
      marker
    @fit genMarkerBounds @markers

  init: (selector) ->
    @map = new google.maps.Map $(selector)[0],
      zoom: 5
      center: @genLatLng 39.8282, -98.5795

