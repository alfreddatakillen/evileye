const Configuration = require('./configuration');
const GraphQL = require('./graphql');
const Lagan = require('lagan');
const Log = require('./log');
const Server = require('./server');

class EvilEye {

    constructor(opts) {

        if (typeof opts === 'object') {
            this.opts = opts;
        } else {
            this.opts = {};
        }

        this.configuration = new Configuration({
            consoleLogLevel: opts.consoleLogLevel,
            port: opts.port
        });
        
        this.lagan = new Lagan({
            initialState: opts.initialState || {},
            logFile: this.configuration.eventLogFile
        });

        this.log = new Log({
            configuration: this.configuration
        })

		this.graphql = new GraphQL({
            configuration: this.configuration,
            lagan: this.lagan,
            log: this.log
        });

        this.server = new Server({
            configuration: this.configuration,
            graphql: this.graphql,
            log: this.log
        })


        this.lagan.on('successfulProjection', ({ type, props, position }) => {
            this.log.silly(log.messages.eventProjected, { eventType: type, props, position });
        });
        
        this.lagan.on('failedProjection', ({ type, props, err }) => {
            this.log.debug(log.messages.eventProjectionFailed, { eventType: type, props, error: err.message });  
        });

    }

    listen() {
        return this.server.listen();
    }

    get state() {
        return this.lagan.state;
    }

}

module.exports = EvilEye;