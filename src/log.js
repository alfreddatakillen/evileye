const error = require('./error');
const onDeath = require('ondeath');
const os = require('os');
const process = require('process');
const Slack = require('./slack');
const winston = require('winston');

const messages = {
	configuration: 'EvilEye configuration.',
	eventProjected: 'Event was projected.',
	eventPostValidationFailed: 'Event validation failed. (Pre validation - before event was written to event stream.)',
	eventPreValidationFailed: 'Event validation failed. (Post validation - after event was written to event stream.)',
	eventProjectionFailed: 'Event projection failed.',
	incomingHttpRequest: 'Incoming HTTP(S) request.',
	invalidAuthorizationHeader: 'Invalid Sessionist authorization header.',
	listenOnPort: 'Started listening on port.',
	noAuth: 'No auth function in .listen(). Auth disabled.',
	noSlackWebhookConfig: 'No environment variable set for the Slack webhook. Slack alerts/notifications/logging disabled.',
	startedLogging: 'Started process.',
	stoppedLogging: 'Stopped process.'
};

class Log {

	constructor(opts = {}) {
		if (typeof opts !== 'object' || typeof opts.configuration !== 'object') {
			throw new error.NoConfiguration('No config passsed to Server object.');
		}
		const configuration = opts.configuration;

		const hostname = os.hostname();
		const pid = process.pid;
		const project = configuration.name;
		const version = configuration.version;
		
		const transports = [
			new winston.transports.File({ filename: configuration.logFile, format: winston.format.combine(winston.format.timestamp(), winston.format.json()) })
		];
		if (configuration.stage !== 'test') {
			transports.push(new winston.transports.Console({ format: winston.format.simple(), level: configuration.consoleLogLevel, timestamp: true }))
			if (!configuration.slackWebhook) {
				setImmediate(() => this.warn(messages.noSlackWebhookConfig));
			} else {
				transports.push(new Slack({ level: 'info', format: winston.format.simple() }));
			}
		}
		
		this._logger = winston.createLogger({
			level: configuration.logLevel,
			format: winston.format.json(),
			transports,
			exceptionHandlers: transports
		});
		
		this.info(messages.startedLogging, { pid, hostname, logFile: configuration.logFile, project, version } );
		this.debug(messages.configuration, configuration);
		onDeath(() => {
			this.info(messages.stoppedLogging, { pid, hostname, logFile: configuration.logFile, project, version } )
		});
		
	}

	get messages() {
		return messages;
	}

	error(...args) { return this._logger.error(...args); }
	warn(...args) { return this._logger.warn(...args); }
	info(...args) { return this._logger.info(...args); }
	verbose(...args) { return this._logger.verbose(...args); }
	debug(...args) { return this._logger.debug(...args); }
	silly(...args) { return this._logger.silly(...args); }
}

module.exports = Log;