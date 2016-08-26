/* jslint node: true */

'use strict';

module.exports = function(grunt) {

    var ncu = require('npm-check-updates');
    var path = require('path');
    var _ = require('lodash');
    var RECURSIVE_GLOB = '**';
    var GLOB = '*';
    var ROOT = './';
    var EXTENSION = {
        css: '.css',
        precss: '.scss',
        script: '.js',
        map: '.map',
        archive: '.zip',
        template: '.hbs',
        markup: '.html'
    };

    grunt.option('stack', true);

    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-postcss');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        compass: {
            options: {
                bundleExec: true,
                config: 'config.rb',
            },
            dist: {
                options: {
                    force: true,
                    sourcemap: true,
                    outputStyle: 'compressed',
                    environment: 'production',
                }
            },
            dev: {
                options: {
                    debugInfo: false,
                    trace: true,
                }
            }
        },
        watch: {
            sass: {
                files: 'src/sass/' + RECURSIVE_GLOB + '/' + GLOB + EXTENSION.precss,
                tasks: ['compass:dev'],
                options: {
                    spawn: false,
                }
            },
        },
        // postcss: {
        //     options: {
        //         processors: [
        //             require('autoprefixer')({
        //                 browsers: conf.postcss
        //             }),
        //             require('postcss-filter-gradient')
        //         ]
        //     },
        //     dist: {
        //         src: _path.css + '/' + GLOB + EXTENSION.css
        //     }
        // },
        // htmlmin: {
        //     dist: {
        //         options: {
        //             removeComments: true,
        //             collapseWhitespace: true
        //         },
        //         files: {
        //             'public/carStart.html': 'public/carStart.html',
        //             // 'public/start.html': 'public/start.html',
        //         }
        //     },
        // },
    });

    grunt.registerTask('default', [
        'compass:dev',
        'watch:sass'
    ]);

    /* watch-task callback override, hooks & alters compass config before it runs */
    // grunt.event.on('watch', function(action, filepath, target) {
    //     switch (target) {
    //         case 'sass':
    //             var filepathArr = filepath.split(path.sep);
    //             grunt.config('compass.dev.options.specify', _.indexOf(filepathArr, 'partials') >= 0 ? 'src/sass/' + GLOB + EXTENSION.precss : filepath);
    //             break;
    //     }
    // });

    grunt.registerTask('checknodedeps', function() {
        ncu.run({
            packageFile: 'package.json',
        }).then(function(upgraded) {
            if (!_.isEmpty(upgraded)) {
                grunt.log.writeln('ncu: dependencies to upgrade:', upgraded);
            }
        });
    });
};
