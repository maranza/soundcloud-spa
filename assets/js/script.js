/* jslint browser: true */
/* jslint jquery: true */
/* global SC */

/*
    Decided to leave hashtag listening aside (will be added later).
*/

var cache = {}; // was put in global scope for easy debugging

$(function() {

    'use strict';

    cache = {
        debug: true,
        test: true,
        testKeyword: 'ac dc',
        clientId: 'd3cc13db45cba4f1ff6846dc46b0ef8a',
        played: [],
        queryOptions: {
            limit: 78,
            // limit: 48,
        },
        playerOptions: {
            show_comments: false,
            sharing: false,
            buying: false,
            download: false,
        }
    };

    var selectors = [
        '#body',
        '#main',
        '#nav',
        '#sc-widget',
        '#list',
        '#player',
        '#pagination',
        '#prev',
        '#next',
        '#search',
        '.toggle-grid-view',
        '.toggle-repeat',
        '.toggle-shuffle',
    ];

    selectors.forEach(function(selector) {
        try {
            /* beautify ignore:start */
            var _selector = selector;
            _selector = _selector.replace(/[#]/g, '')
                                    .replace(/\./g, '')
                                        .replace(/[-]/g, '_');
            /* beautify ignore:end */
            cache['$' + _selector] = $$(selector);
        } catch (e) {
            console.log('invalid selector!');
        }
    });

    function drawItems(tracks) {
        var markup = '';
        if (tracks.length) {
            tracks.forEach(function(track) {
                markup += '<li class="' + (!track.artwork_url ? 'no-artwork' : '') + '" title="' + track.title + '"><span class="thumbnail" style="background-image: url(' + (track.artwork_url || '') + ')"><span class="truncated">' + track.title.substring(0, 10) + '</span></span>' + track.title + '</li>';
            });
        } else {
            markup = '<li>no results found</li>';
            cache.$body.removeClass('show-grid-view');
        }
        cache.$list.toggleClass('no-results', !tracks.length).html(markup);
    }

    function getQueryURI(query) {
        return '/tracks?' + $.param($.extend({}, cache.queryOptions, {
            q: query,
            linked_partitioning: 1
        }));
    }

    function handleTracksResponse(response) {
        cache.tracks.push(response.collection);
        drawItems(cache.tracks[cache.offset]);
        // is multiple-pages result?
        if (response.next_href) {
            cache.query.push(response.next_href);
            cache.$body.addClass('show-pagination');
            cache.$next.toggle(true);
        } else {
            cache.$body.removeClass('show-pagination');
        }
        // cache.$main.css('height', 'calc(100% - ' + cache.$pagination.outerHeight() + 'px)');
    }

    function getTracks(query, offset, callback) {
        var promise;
        if (offset) {
            promise = $.get(query);
        } else {
            cache.tracks = [];
            cache.query = [];
            cache.query.push(getQueryURI(query));
            cache.offset = 0;
            promise = SC.get(cache.query[cache.offset]);
        }
        promise.then(handleTracksResponse).then(callback || function() {});
    }

    function isEmptyResult() {
        return cache.query.length && cache.tracks[0].length === 0;
    }

    function getRandomTrackIndex() {
        var randomIndex = getRandomInt(0, cache.tracks[cache.offset].length - 1);
        if ($.inArray(randomIndex, cache.played) >= 0) {
            if (cache.played.length == cache.tracks[cache.offset]) {
                if (cache.debug) {
                    console.log('played all song @ offset:', cache.offset);
                }
                return 0;
            }
            getRandomTrackIndex();
        }
        return randomIndex;
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    /* beam me up scotty! */

    cache.$sc_widget.attr('height', parseFloat(cache.$player.css('height')));

    SC.initialize({
        client_id: cache.clientId
    });

    try {
        cache.player = SC.Widget(cache.$sc_widget[0]);
    } catch (e) {
        console.log('soundcloud widget failed to initiate!');
    }

    cache.player.bind(SC.Widget.Events.READY, function() {

        cache.$player.hide();

        cache.$body.removeClass('show-loader');

        var nav__height = cache.$nav.outerHeight();

        cache.$main.scroll($.debounce(100, function(e) {
            var node = cache.$main[0];
            if (cache.debug) {
                console.log('-----------------');
                console.log('-----------------');
                console.log('-----------------');
                console.log('scrollHeight', node.scrollHeight);
                console.log('scrollTop', node.scrollTop);
                console.log('clientHeight', node.clientHeight);
                console.log('navigation height', nav__height);
                console.log('scrollHeight - scrollTop =', node.scrollHeight - node.scrollTop);
            }
            // ref: http://stackoverflow.com/questions/3898130/check-if-a-user-has-scrolled-to-the-bottom (may have quirks in firefox)
            // second condition is to make sure we have enough clearance for once nav becomes fixed, otherwise scrolling will glitch back up.
            var test = this.scrollTop > nav__height && node.scrollHeight - node.scrollTop > nav__height;
            cache.$body.toggleClass('body--fix-nav', test);
            cache.$main.css('padding-top', test ? nav__height : 0);
        }));

        /* bind events */

        cache.$list.on('click', 'li', function() {
            // detect no-results
            if (isEmptyResult()) {
                return;
            }
            /*
                SC is doing some canvas calculations and cannot do it
                while it's widget is hidden with display-none. :\
            */
            if (!cache.isPlayerVisible || !cache.$player.is(':visible')) {
                cache.isPlayerReadyToRender = true;
                cache.$player.css('visibility', 'hidden').show();
            }
            var $item = $(this),
                track = cache.tracks[cache.offset][$item.index()];

            cache.index = $item.index();
            /* beautify ignore:start */
            $item.addClass('selected')
                    .siblings('.selected').removeClass('selected')
                            .addClass('visited');
            /* beautify ignore:end */
            if (track.artwork_url) {
                cache.$main.css('background-image', 'url(' + track.artwork_url + ')');
            }
            cache.$body.addClass('show-player-loader');
            cache.$player.css('visibility', 'visible');
            cache.player.load(track.permalink_url, $.extend({}, cache.playerOptions, {
                callback: function() {
                    cache.$body.removeClass('show-player-loader');
                    if (!cache.isPlayerVisible) {
                        cache.isPlayerVisible = true;
                    }
                    cache.player.play();
                    if (cache.debug) {
                        console.log('playing:', track.title);
                    }
                }
            }));
        });

        cache.$prev.click(function() {
            drawItems(cache.tracks[--cache.offset]);
            cache.$prev.toggle(cache.offset ? true : false);
            var isMoreTracks = cache.tracks[cache.offset + 1] || cache.query[cache.offset + 1];
            cache.$next.toggle(isMoreTracks ? true : false);
        });

        cache.$next.click(function() {
            if (cache.tracks[++cache.offset]) {
                drawItems(cache.tracks[cache.offset]);
            } else {
                cache.$next.toggle(false);
                getTracks(cache.query[cache.offset], true);
            }
            cache.$prev.toggle(true);
        });

        cache.$search.keyup($.debounce(500, function() {
            if (this.value === '') {
                return;
            }
            getTracks(this.value);
        }));

        cache.$toggle_grid_view.click(function() {
            if (isEmptyResult()) {
                return;
            }
            cache.$toggle_grid_view.toggleClass('btn--selected');
            cache.$body.toggleClass('show-grid-view');
        });

        cache.$toggle_repeat.click(function() {
            cache.repeat = cache.repeat ? false : true;
            cache.$toggle_repeat.toggleClass('btn--selected');
        });

        cache.$toggle_shuffle.click(function() {
            cache.shuffle = cache.shuffle ? false : true;
            cache.$toggle_shuffle.toggleClass('btn--selected');
        });

        // now test it ;)
        if (cache.test) {
            cache.$search.val(cache.testKeyword).keyup();
        }

    }).bind(SC.Widget.Events.FINISH, function() {
        cache.played.push(cache.index);
        var nextIndex = cache.index + 1,
            $items = $('li', cache.$list);
        if (cache.shuffle) {
            var randomIndex = getRandomTrackIndex();
            if (cache.tracks[cache.offset][randomIndex]) {
                $items.get(randomIndex).click();
            }
        } else if (cache.tracks[cache.offset][nextIndex]) {
            $items.get(nextIndex).click();
        } else if (cache.repeat) {
            $items.get(0).click();
        }
    });
});
