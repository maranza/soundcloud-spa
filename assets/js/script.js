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
        clientId: 'd3cc13db45cba4f1ff6846dc46b0ef8a',
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
        '#list',
        '#player',
        '#pagination',
        '#prev',
        '#next',
        '#search',
    ];

    selectors.forEach(function(selector) {
        try {
            /* beautify ignore:start */
            var _selector = selector;
            _selector = _selector.replace(/[#]/g, '')
                                    .replace(/\./g, ' ')
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
            selectors.get('#element').$body.removeClass('show-pagination');
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

    /* beam me up scotty! */

    $$('iframe').attr('height', parseFloat(cache.$player.css('height')));

    SC.initialize({
        client_id: cache.clientId
    });

    try {
        cache.player = SC.Widget('sc-widget');
    } catch (e) {
        console.log('soundcloud widget failed to initiate!');
    }

    cache.player.bind(SC.Widget.Events.READY, function() {

        cache.$player.hide();

        cache.$body.removeClass('show-loader');

        var nav__height = cache.$nav.outerHeight();

        cache.$main.scroll(function(e) {
            // second condition is to make sure we have enough clearance once nav becomes fixed
            cache.$body.toggleClass('fix-nav', this.scrollTop > nav__height && (this.scrollTop - nav__height) > nav__height);
        });

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

        $$('.toggle-grid-view').click(function() {
            if (isEmptyResult()) {
                return;
            }
            cache.$body.toggleClass('show-grid-view');
        });

        // now test it ;)
        cache.$search.val('modulation').keyup();
    });
});
