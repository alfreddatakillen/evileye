const Configuration = require('./configuration');
const GraphQL = require('./graphql');
const Lagan = require('lagan');
const Log = require('./log');
const Server = require('./server');

class EvilEye {

    constructor(opts = {}) {

        this._opts = opts;

        this._configuration = new Configuration({
            consoleLogLevel: opts.consoleLogLevel,
            port: opts.port
        });
        
        this._lagan = new Lagan({
            initialState: opts.initialState || {},
            logFile: this._configuration.eventLogFile
        });
        this.Event = this._lagan.Event;

        this._log = new Log({
            configuration: this._configuration
        })

		this._graphql = new GraphQL({
            configuration: this._configuration,
            lagan: this._lagan,
            log: this._log
        });

        this._server = new Server({
            configuration: this._configuration,
            graphql: this._graphql,
            log: this._log
        })


        this._lagan.on('successfulProjection', ({ type, props, position }) => {
            this._log.silly(this._log.messages.eventProjected, { eventType: type, props, position });
        });
        
        this._lagan.on('failedProjection', ({ type, props, err }) => {
            this._log.debug(this._log.messages.eventProjectionFailed, { eventType: type, props, error: err.message });  
        });

    }

    createCommand(...args) {
        return this._graphql.createCommand(...args);
    }

    listen(...args) {
        return this._server.listen();
    }

    get state() {
        return this._lagan.state;
    }

}

module.exports = EvilEye;