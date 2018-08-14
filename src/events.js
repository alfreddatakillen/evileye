const lagan = require('./lagan');
const log = require('./log');

lagan.on('successfulProjection', ({ type, props, position }) => {
    log.info(log.messages.eventProjected, { eventType: type, props, position });
});

lagan.on('failedProjection', ({ type, props, err }) => {
    log.error(log.messages.eventProjectionFailed, { eventType: type, props, error: err.message });  
});