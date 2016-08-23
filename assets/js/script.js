/* jslint browser: true */
/* jslint jquery: true */
/* global SC */

/*
    Decided to leave hashtag listening aside (can be added with a little more effort).
*/

var cache; // was put here for easy console debugging

$(function () {

    'use strict';

    cache = {
        clientId: 'd3cc13db45cba4f1ff6846dc46b0ef8a',
        $body: $('body'),
        $main: $('main'),
        $list: $('ul'),
        $player: $('.player'),
        $prev: $('.prev'),
        $next: $('.next'),
        $input: $('[name = search]')
    };

    function drawItems(tracks) {
        var markup = '';
        if (tracks.length) {
            tracks.forEach(function (track) {
                // append might be quicker here (untested)
                markup += '<li>' + track.title + '</li>';
            });
        } else {
            markup = '<li>no results found</li>';
        }
        cache.$list.toggleClass('no-results', !tracks.length).html(markup);
    }

    function getQueryURI(query) {
        return '/tracks?' + $.param({
            q: query,
            limit: 10,
            linked_partitioning: 1
        });
    }

    function handleTracksResponse(response) {
        cache.tracks.push(response.collection);
        drawItems(cache.tracks[cache.offset]);
        // is multiple page result?
        if (response.next_href) {
            cache.query.push(response.next_href);
            cache.$body.addClass('show-pagination');
            cache.$next.toggle(true);
        } else {
            cache.$body.removeClass('show-pagination');
        }
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
        promise.then(handleTracksResponse).then(callback || function () {});
    }

    /* beam me up scotty! */

    $('iframe').attr('height', parseFloat(cache.$player.css('height')));

    SC.initialize({
        client_id: cache.clientId
    });

    try {
        cache.player = SC.Widget('sc-widget');
    } catch (e) {
        console.log(e);
    }

    cache.player.bind(SC.Widget.Events.READY, function () {

        cache.$player.hide();

        cache.$body.removeClass('show-loader');

        /* bind events */

        cache.$list.on('click', 'li', function () {
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
            cache.$main.css('background-image', 'url(' + (track.artwork_url || '') + ')');
            cache.$body.addClass('show-player-loader');
            cache.$player.css('visibility', 'visible');
            cache.player.load(track.permalink_url, {
                callback: function () {
                    cache.$body.removeClass('show-player-loader');
                    if (!cache.isPlayerVisible) {
                        cache.isPlayerVisible = true;
                    }
                    cache.player.play();
                }
            });
        });

        cache.$prev.click(function () {
            drawItems(cache.tracks[--cache.offset]);
            cache.$prev.toggle(cache.offset ? true : false);
            var isMoreTracks = cache.tracks[cache.offset + 1] || cache.query[cache.offset + 1];
            cache.$next.toggle(isMoreTracks ? true : false);
        });

        cache.$next.click(function () {
            if (cache.tracks[++cache.offset]) {
                drawItems(cache.tracks[cache.offset]);
            } else {
                cache.$next.toggle(false);
                getTracks(cache.query[cache.offset], true);
            }
            cache.$prev.toggle(true);
        });

        cache.$input.keyup($.debounce(500, function () {
            getTracks(this.value);
        }));

        // now test it ;)
        cache.$input.val('u2').keyup();
    });
});