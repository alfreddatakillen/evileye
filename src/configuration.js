const envcnf = require('envcnf');
const path = require('path');

class Configuration {

    constructor(opts = {}) {
        const path = require('path');

        const stage = opts.stage || envcnf.get('NODE_ENV') || 'development';
        
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
        
        const eventLogFile = basedir + '/' + name + '_' + stage + '.eventstream';
        
        const slackWebhook = opts.slackWebhook || envcnf.get('SLACK_WEBHOOK_URL') || '';

        const staticHtdocsDir = envcnf.get('STATIC_HTDOCS_DIR') || null;
        
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
        this.staticHtdocsDir = staticHtdocsDir !== null ? path.resolve(staticHtdocsDir) : null;
        this.version = version;
    }

}

module.exports = Configuration;
