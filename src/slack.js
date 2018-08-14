const configuration = require('./configuration');
const request = require('request');
const Transport = require('winston-transport');

class Slack extends Transport {

	constructor(...args) {
		super(...args);
		this.config = [];
	}

	log(info, callback) {

		const payload = {
			text: info[Symbol.for('message')].replace(/ \{/, ' `{').replace(/\}$/, '}`'),
			username: info.username || this.config.username || configuration.name + ' ' + configuration.version,
			channel: info.channel || this.config.channel || '@alfred',
			icon_url: info.icon_url || this.config.icon_url,
			icon_emoji: info.icon_emoji || this.config.icon_emoji,
			attachments: info.attachments || this.config.attachments,
			unfurl_links: info.unfurl_links || this.config.unfurl_links,
			unfurl_media: info.unfurl_media || this.config.unfurl_media,
			link_names: info.link_names || this.config.link_names,
		};

		request.post(
			{
				uri: configuration.slackWebhook,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
			function (err, res, body) {
				if (err) return callback(err);
				if (res.statusCode !== 200) return callback(new Error('Unexpected status code from Slack API: ' + res.statusCode));

				setImmediate(() => this.emit('logged', info));
				callback();
			}.bind(this)
		);
	}
}

module.exports = Slack;