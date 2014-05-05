module.exports = function (grunt) {

    function log (err, stdout, stderr, cb) {
        console.log(stdout, stderr);
        cb();
    }

    grunt.initConfig({
        pkg    : grunt.file.readJSON('package.json'),

        shell: {
            installDependencies: {
                command: 'cd "node_modules/airbrake-js" && npm install',
                options: { callback: log }
            },
            buildAirbreak: {
                command: 'grunt --gruntfile "node_modules/airbrake-js/Gruntfile.coffee"',
                options: { callback: log }
            },
            copyDist: {
                command: 'rm -R ./dist && mkdir ./dist && cp -r "node_modules/airbrake-js/dist/" ./dist',
                options: { callback: log }
            }
        }
    });

    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', [ 'shell' ]);
};