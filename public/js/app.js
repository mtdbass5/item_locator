(function ($) {
  var data, 
    last_search = '',
    last_bounds = '',
    sidebar_data,
    sidebar_markers = [],
    distance_data,
    markers = [],
    filter_data = {},
    last_search_latlng,
    search_mode = false,
    $_sidebar_listings = $('.sidebar-listings'),
    $_name_search = $('#name-search'),
    $_location_search = $('#location-search'),
    $_label_distance = $('.label-distance'),
    $_sidebar_search_bar = $('.sidebar-search-bar'),
    info_window = new google.maps.InfoWindow(),
    map = new google.maps.Map(document.getElementById('map-canvas'), {
      zoom: 5,
      center: new google.maps.LatLng(39.8282, -98.5795),
    });

  function gen_info_html(client) {
    var html = ['<div class="info-window">', 
        '<div class="basic-info">',
          '<div class="info-name">'
      ];
    if (client.website !== '-') {
      if (client.website.indexOf('http://') === -1) {
        client.website = 'http://' + client.website;
      }
      html.push('<a target="_blank" href="', client.website, '">', client.name,'</a>');
    } else {
      html.push(client.name);
    }
    html.push('</div><div class="info-address1">', client.address,'</div>',
        '<div class="info-address2">', client.city, ', ', client.state, ' ', client.zip, '</div>',
      '</div>',
      '<div class="row-fluid more-info">',
        '<div class="span6">',
          '<div class="filter-info-wrapper">',
            '<div class="label">Phone</div>',
            '<div class="filter-info">', client.phone, '</div>',
          '</div>',
        '</div>',
      '</div>',
    '</div>');
    return html.join('');
  }
  function fit_map_bounds(markers) {
    var i, max, bounds = new google.maps.LatLngBounds();  
    for (i = 0, max = markers.length; i < max; i += 1) {
      bounds.extend(markers[i].position);
    }
    map.fitBounds(bounds);
  }
  function open_info_window() {
    info_window.setContent(gen_info_html(data[this.index]));
    info_window.open(map, this);
  }
  function plot_shops(data) {
    var i, max, marker;
    for (i = 0, max = data.length; i < max; i += 1) {
      marker = new google.maps.Marker({
        map: map,
        position: new google.maps.LatLng(data[i].lat, data[i].lng),
        index: i
      });
      google.maps.event.addListener(marker, 'click', open_info_window);
      markers[i] = marker;
      sidebar_markers[i] = marker;
    }
    fit_map_bounds(markers);
  }
  function fill_sidebar(dataset, calc_distance) {
    var i, max, html = [], data;
    calc_distance = calc_distance || false;
    for (i = 0, max = dataset.length; i < max; i += 1) {
      if (calc_distance) {
        html.push(gen_distance_labels(dataset, i));
      }
      html.push('<a name="', dataset[i].index, '" class="sidebar-listing">',
        '<div class="listing-info">',
          '<div class="info-name">', dataset[i].name, '</div>',
          '<div class="info-address1">', dataset[i].address, '</div>',
          '<div class="info-address2">', dataset[i].city, ', ', dataset[i].state, ' ', dataset[i].zip, '</div>',
        '</div>',
      '</a>');
    }
    $_sidebar_listings.html(html.join(''));
  }
  function show_all_markers(markers) {
    for (i = 0, max = markers.length; i < max; i += 1) {
      markers[i].setVisible(true);
    }
  }
  function gen_distance_labels(dataset, i) {
    var string = '';
    if (dataset[i].distance >= 500 && (i === 0 || dataset[i - 1].distance < 500)) {
      string = '<div class="label label-miles">500+ Miles</div>';
    } else if (dataset[i].distance >= 250 && (i === 0 || dataset[i - 1].distance < 250)) {
      string = '<div class="label label-miles">250+ Miles</div>';
    } else if (dataset[i].distance >= 100 && (i === 0 || dataset[i - 1].distance < 100)) {
      string = '<div class="label label-miles">100+ Miles</div>';
    } else if (dataset[i].distance >= 50 && (i === 0 || dataset[i - 1].distance < 50)) {
      string = '<div class="label label-miles">50+ Miles</div>';
    } else if (dataset[i].distance >= 20 && (i === 0 || dataset[i - 1].distance < 20)) {
      string = '<div class="label label-miles">20+ Miles</div>';
    } else if (dataset[i].distance >= 10 && (i === 0 || dataset[i - 1].distance < 10)) {
      string = '<div class="label label-miles">10+ Miles</div>';
    } else if (dataset[i].distance >= 5 && (i === 0 || dataset[i - 1].distance < 5)) {
      string = '<div class="label label-miles">5+ Miles</div>';
    } else if (dataset[i].distance >= 1 && (i === 0 || dataset[i - 1].distance < 1)) {
      string = '<div class="label label-miles">1+ Miles</div>';
    }
    return string;
  }
  function check_filters() {
    var i, j, max, not_a_match;
    sidebar_data = [];
    sidebar_markers = [];
    for (i = 0, max = data.length; i < max; i += 1) {
      not_a_match = false;
      for (j in filter_data) {
        if (data[i][j].indexOf(filter_data[j]) === -1) {
          not_a_match = true;
          break;
        } 
      }
      if (not_a_match) {
        markers[i].setVisible(false);
      } else {
        markers[i].setVisible(true);
        sidebar_data.push(data[i]);
        sidebar_markers.push(markers[i]);
      }
    }
    if (search_mode) {
      calc_distance_data(last_search_latlng);
      distance_data.sort(dynamic_sort('distance'));
      fill_sidebar(distance_data, true);
    } else {
      fill_sidebar(sidebar_data);
    }
  }
  function dynamic_sort(key) {
    return function (a, b) {
      var result = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
      return result * 1;
    }
  }
  function calc_distance_data(search_point) {
    var i, max, dist;
    distance_data = [];
    for (i = 0, max = sidebar_data.length; i < max; i += 1) {
      dist = google.maps.geometry.spherical.computeDistanceBetween(search_point, new google.maps.LatLng(sidebar_data[i].lat, sidebar_data[i].lng));
      dist *= 0.000621371; //convert meters to miles
      distance_data[i] = sidebar_data[i];
      distance_data[i].distance = parseFloat(dist.toFixed());
      distance_data[i].marker_index = i;
    }
  }
  function location_search() {
    var geocoder, input = $(this).children('input'),
      address = input.val();
    if (address !== last_search) {
      search_mode = true;
      last_search = address;
      geocoder = new google.maps.Geocoder();
      geocoder.geocode({'address': address}, function (results, status) {
        var lat, lng, result;
        if (results.length) {
          result = results[0].geometry;
          map.fitBounds(result.bounds);
          last_bounds = result.bounds;
          last_search_latlng = result.location
          calc_distance_data(result.location);
          distance_data.sort(dynamic_sort('distance'));
          $_label_distance.show().children('span').html(address);
          $_sidebar_listings.css('border-bottom', (42 + $_label_distance.height() + 24) + 'px solid transparent');
          fill_sidebar(distance_data, true);
        } else {
          input.css('color', 'red');
          last_bounds = '';
        }
      });
    } else if (search_mode && last_bounds !== '') {
      map.fitBounds(last_bounds);
    }
    return false;
  }

  //initialize plotting
  $.ajax({
    url: 'clients.json',
    dataType: 'json',
    success: function(response) {
      data = response;
      sidebar_data = response;
      plot_shops(response);
      fill_sidebar(response); 
    }
  });

  $('.filter').on('change', 'select', function() {
    var $_this = $(this),
      name = $_this.attr('name'),
      value = $_this.children(':selected').val();
    $_name_search.val('');
    if (value !== '') {
      filter_data[name] = value;
    } else {
      delete filter_data[name];
    }
    check_filters();
  });
  $_sidebar_listings.on('click', '.sidebar-listing', function() {
    var index = parseInt($(this).attr('name'), 10);
    map.setCenter(markers[index].position);
    open_info_window.call(markers[index]);
    return false;
  });
  $_name_search.on('keyup', function() {
    var shop, marker_index,
      filtered_data = [],
      value = $(this).val().toLowerCase(),
      dataset = search_mode ? distance_data : sidebar_data;
    if (value !== '') {
      for (i = 0, max = sidebar_data.length; i < max; i += 1) {
        marker_index = search_mode ? dataset[i].marker_index : i;
        if (dataset[i].name && dataset[i].name.toLowerCase().indexOf(value) > -1) {
          sidebar_markers[marker_index].setVisible(true);
          filtered_data.push(dataset[i]);
        } else {
          sidebar_markers[marker_index].setVisible(false);
        }
      }
      fill_sidebar(filtered_data, search_mode);
    } else if (search_mode) {
      show_all_markers(sidebar_markers);
      fill_sidebar(distance_data, true);
    } else {
      show_all_markers(sidebar_markers);
      fill_sidebar(sidebar_data);
    }
  });
  $_location_search
    .on('submit', location_search)
    .on('keyup', 'input', function () {
      var $_this = $(this);
      if ($_this.attr('style') && $_this.val() !== last_search) {
        $_this.removeAttr('style');
      }
    })
    .on('click', 'a', function() {
      location_search.call($_location_search);
      return false;
    });
  $('.label-close').on('click', function() {
    search_mode = false;
    $(this).parent().hide();
    $_sidebar_listings.css('border-bottom', '42px solid transparent');
    fill_sidebar(sidebar_data);
    show_all_markers(sidebar_markers);
    last_search = '';
    $_location_search.children('input').val('');
    $_name_search.val('');
  });
}(jQuery));