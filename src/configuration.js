const envcnf = require('envcnf');
const path = require('path');

class Configuration {

    constructor(opts = {}) {
        const path = require('path');

        // If the global function "it" exists, then we are running tests.
        const stage = opts.stage || (typeof global.it === 'function' ? 'test' : (envcnf.get('NODE_ENV') || 'development'));
        
        const basedir = opts.basedir || (stage === 'test' ? path.dirname(path.dirname(path.dirname(path.dirname(process.argv[1])))) : path.dirname(process.argv[1]));
        
        let name, version;
        try {
            const packageJson = require(basedir + '/package.json');
            name = packageJson.name;
            version = packageJson.version;    
        } catch (err) {
            name = 'unknown';
            version = '0.0.1';
        }
        
        const logLevel = opts.logLevel || envcnf.get('LOG_LEVEL') || 'silly';
        const consoleLogLevel = opts.consoleLogLevel || envcnf.get('CONSOLE_LOG_LEVEL') || logLevel;
        const logFile = basedir + '/' + name + '_' + stage + '.log';
        const port = envcnf.get('PORT') || (stage === 'production' ? 80 : null);
        
        // If eventLogFile is falsy (in this case null),
        // lagan will create a temporary disposable file:
        const eventLogFile = stage === 'test' ? null : basedir + '/' + name + '_' + stage + '.eventstream';
        
        const slackWebhook = opts.slackWebhook || envcnf.get('SLACK_WEBHOOK_URL') || '';

        // Expose those:

        this.basedir = basedir;
        this.consoleLogLevel = consoleLogLevel;
        this.eventLogFile = eventLogFile;
        this.logFile = logFile;
        this.logLevel = logLevel;
        this.name = name;
        this.port = port;
        this.slackWebhook = slackWebhook;
        this.stage = stage;
        this.version = version;
    }

}

module.exports = Configuration;
