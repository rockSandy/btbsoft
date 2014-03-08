module.exports = function(grunt) {
    grunt.initConfig({
        requirejs: {
            compile: {
                options: {
                    baseUrl: "./app",
                    optimizeCss: "standard",
                    dir:"./build"
                }
            }
        },
        nodewebkit: {
            options: {
                build_dir: './webkitbuilds', // Where the build version of my node-webkit app is saved
                //version : '0.9.1',
                mac: false, // We want to build it for mac
                win: true, // We want to build it for win
                linux32: false, // We don't need linux32
                linux64: false // We don't need linux64
            },
            src: ['./build/**/*'] // Your node-wekit app
        }
    })
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-node-webkit-builder');

    grunt.registerTask('default', ['requirejs','nodewebkit']);
};
