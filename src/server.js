const express = require('express');
const cors = require('cors');

const GraphQL = require('./graphql');

const sessionistHeader = require('sessionistheader');
const uuid = require('uuid/v4');

const error = require('./error');
const getPort = require('get-port');

class Server {

	constructor(opts = {}) {
		if (typeof opts !== 'object' || typeof opts.configuration !== 'object') {
			throw new error.NoConfiguration('No config passsed to Server object.');
		}
		
		this.configuration = opts.configuration;
		this.corsDomains = [];
		this.auth = opts.auth;
		this.graphql = opts.graphql;
		this.lagan = opts.lagan;
		this.log = opts.log;
		this.server = null;

		const graphiqlDir = this.configuration.basedir + '/node_modules/graphiql-sessionist/build';
		this.staticHtdocsDirs = [
			{ '/graphiql': graphiqlDir }
		];

		this.handlers = [];
	}

	all(...args) {
		this.handlers.push({
			method: 'ALL',
			args
		});
	}

	delete(...args) {
		this.handlers.push({
			method: 'DELETE',
			args
		});
	}

	get(...args) {
		this.handlers.push({
			method: 'GET',
			args
		});
	}

	post(...args) {
		this.handlers.push({
			method: 'POST',
			args
		});
	}

	put(...args) {
		this.handlers.push({
			method: 'PUT',
			args
		});
	}

	use(...args) {
		this.handlers.push({
			method: 'USE',
			args
		});
	}

	authFn(keyId, callback) {
		let response;
		try {
			response = this.auth({ keyId, state: this.lagan.state });
		} catch (err) {
			return callback(err);
		}
		
		if (typeof response === 'string') {
			return callback(null, response);
		}

		if (typeof response !== 'object' || typeof response.then !== 'function') {
			return callback(new Error('auth function must return a string or a promise'));
		}

		response
			.then(secretKey => {
				if (typeof secretKey !== 'string') {
					return callback(new Error('auth promise must resolve a string for the secret key'));
				}
				callback(null, secretKey);
			})
			.catch(err => callback(err));
	}

	close() {
		if (this.server === null) return;
		this.server.close(() => {
			// Log something?
		});
	}

	cors(domains) {
		if (typeof domains === 'undefined') {
			this.corsDomains.length = 0;
			this.corsDomains.push('*');
		}
		if (this.corsDomains.length > 0 && this.corsDomains[0] === '*') return;

		if (!Array.isArray(domains)) domains = [ domains ];
		domains.forEach(domain => this.corsDomains.push(domain));
	}

	listen() {

		 // Create an express server and a GraphQL endpoint
		const app = express();
		this.app = app;

		if (this.corsDomains.length > 0) {
			app.use(cors({
				origin: (origin, callback) => {
					if (this.corsDomains.indexOf('*') !== -1) {
						return callback(null, true);
					}
					if (this.corsDomains.indexOf(origin) !== -1) {
						return callback(null, true);
					}
					callback(new Error('Domain not allowed by CORS: ' + origin));
				}
			}));
		}

		app.use((req, res, next) => {
			req.rawBody = Buffer.from('');
			req.on('data', chunk => req.rawBody = Buffer.concat([ req.rawBody, chunk ]));
			req.on('end', () => {
				if (req.rawBody.length > 0) {
					try {
						req.body = req.rawBody.toString();
					} catch (err) {}
		
					try {
						req.body = JSON.parse(req.body);	
					} catch (err) {}	
				}
				next();
			});
		});
	
		app.use((req, res, next) => {
	
			const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			const reqId = req.headers['x-request-id'] || uuid();
			req.reqId = reqId;
			req.sessionKeyId = '';
	
			if (typeof req.headers['authorization'] === 'undefined' || typeof this.auth !== 'function') {
				this.log && this.log.debug(this.log.messages.incomingHttpRequest, { ip, reqId, method: req.method, url: req.url, headers: req.headers });
				next();
			} else {
				sessionistHeader.verify(
					req.headers['authorization'],
					req.method,
					req.url,
					req.rawBody,
					req.headers['date'] || req.headers['x-date'],
					(keyId, callback) => this.authFn(keyId, callback)
				).then(keyId => {
					req.sessionKeyId = keyId;
					this.log && this.log.debug(this.log.messages.incomingHttpRequest, { ip, reqId, method: req.method, url: req.url, sessionKeyId: keyId });
					next();
				})
				.catch(err => {
					this.log && this.log.debug(this.log.messages.incomingHttpRequest, { ip, reqId, method: req.method, url: req.url });
					this.log && this.log.verbose(this.log.messages.invalidAuthorizationHeader, { authorizationHeader: req.headers['authorization'], method: req.method, url: req.url, dateHeader: req.headers['date'] || req.headers['x-date'], body: req.rawBody.toString(), authorizationHeaderError: err.message, reqId: req.reqId });
					next();
				});
			}
		});
	
		this.log && this.log.verbose('Hosting graphql interface at /graphql');
		app.use('/graphql', this.graphql.middleware());
	
		this.staticHtdocsDirs.forEach(dir => {
			if (typeof dir === 'string') {
				app.use('/', express.static(dir));
				this.log && this.log.verbose('Hosting files from static dir.', { httppath: '/', fsdir: dir });
			} else if (typeof dir === 'object') {
				Object.keys(dir).forEach(path => {
					if (typeof path === 'string' && typeof dir[path] === 'string') {
						app.use(path, express.static(dir[path]));
						this.log && this.log.verbose('Hosting files from static dir.', { httppath: path, fsdir: dir[path] });
					}
				});
			}
		});

		this.handlers.forEach(handler => {
			if (handler.method === 'ALL') app.all(...handler.args);
			if (handler.method === 'DELETE') app.delete(...handler.args);
			if (handler.method === 'GET') app.get(...handler.args);
			if (handler.method === 'POST') app.post(...handler.args);
			if (handler.method === 'PUT') app.put(...handler.args);
			if (handler.method === 'USE') app.use(...handler.args);
		});

		return new Promise((resolve, reject) => resolve())
			.then(() => {
				const port = this.configuration.port;
				if (port) return port;
				this.log && this.log.verbose(this.log.messages.tryingPorts);
				return getPort({ port: [ 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009 ] });
			})
			.then(port => {
				return new Promise((resolve, reject) => {
					this.server = app.listen(port, () => {
						this.log && this.log.verbose(this.log.messages.listenOnPort, { port });
						resolve(port);
					});		
				})
			});
			
	}
	
	staticHtdocs(dir) {
		if (Array.isArray(dir)) {
			dir.forEach(dir => {
				this.staticHtdocsDirs.push(dir);
			});
		} else {
			this.staticHtdocsDirs.push(dir);
		}
	}

}

module.exports = Server;
