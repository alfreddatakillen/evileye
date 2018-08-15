Evil Eye
========

An opinionated node.js framework for web backends.


Features
--------

* GraphQL.
* Event sourcing.
* CQRS.
* Authentication.
* Logging.
* Slack alerts.


Get started!
------------

Install it (`npm install eviley`) and use it:

```
const evilEye = require('evileye');
evilEye.listen({});
```


Auth
----

To do authentication, you can pass an `auth` function to the constructor:

```
function auth({ user, state }) {
    // This function takes a username (`user`) and should return a secret key that this specific user must know.
    // If the user does not exist, or should not have any access, just throw an error!
    // You can also return a promise and resolve a secret key string, or reject an error.

    if (user === 'alfred') {
        return 'topsecret';
    } else {
        throw new Error('No such user.');
    }
}

const evilEye = new EvilEye({ auth })
```

If the user passes an `Authorization:` HTTP header with valid credentials (using the sessionist header),
your request object will have an `.user` property with the authenticated username.


Logging
-------

Example:

```
evilEye.log.error('Error message', { some: 'metadata' });
```

Log levels are: `error`, `warn`, `info`, `verbose`, `debug`, `silly`.

Log messages with levels `error`, `warn` or `info` will be sent to Slack.
Only use those three for stuff that is important enough to trigger a Slack alert/notification.

Set your Slack web hook URL in this environment variable to enable Slack alerts: `SLACK_WEBHOOK_URL`

### Default Slack alert/notification about process start

Every time the process starts or stops, there will be an alert sent to Slack.
It might seem annoying at some times, but it is there to inform you when something crashed, rebooted or hung.



