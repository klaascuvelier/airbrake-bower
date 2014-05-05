module.exports = function (grunt) {

    function log (err, stdout, stderr, cb) {
        console.log(stdout, stderr);
        cb();
    }

    grunt.initConfig({
        pkg    : grunt.file.readJSON('package.json'),

        shell: {
            removeOld: {
                command: 'rm -R dist',
                options: { callback: log }
            },
            createDist: {
                command: 'mkdir dist',
                options: { callback: log }
            },
            getSource: {
                command: 'curl https://raw.githubusercontent.com/airbrake/airbrake-js/master/examples/airbrake-shim.js -o dist/airbrake-shim.js',
                options: { callback: log }
            }
        }
    });

    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', [ 'shell' ]);
};