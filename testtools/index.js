const app = require('../index');

let sessionKeyId, sessionSecretKey;

global.evilEyeTestTools = {
	authFn(...args) {
		app.authFn(...args);
	},
	get session() {
		return {
			get keyId() { return sessionKeyId; },
			get secretKey() { return sessionSecretKey; }
		};
	}
};

function given(precondition) {

	const promise = app.restart(Array.isArray(precondition) ? {} : precondition);
	sessionKeyId = '';
	sessionSecretKey = '';

	return {
		when: behaviourFn => {
			if (typeof behaviourFn !== 'function') {
				throw new Error('behaviour should be function.');
			}
			return {
				then: testFn => {

					return promise
						.then(() => {

							let firstResolve;
							let promise = new Promise((resolve, reject) => firstResolve = resolve);
							if (Array.isArray(precondition)) {
								precondition.forEach(fn => {
									if (typeof fn !== 'function') {
										throw new Error('Precondition array must only contain functions.');
									}
									promise = promise.then(fn).then(result => {
										if (typeof result === 'object' && typeof result.keyId === 'string' && typeof result.secretKey === 'string') {
											sessionKeyId = result.keyId;
											sessionSecretKey = result.secretKey;
										}
									});
								});
							}
							firstResolve();
							return promise
								.catch(err => {

									const newErr = new Error('Error occured in preconditions.');
									newErr.original = err;
									newErr.stack = newErr.stack.split('\n').slice(0, 2).join('\n') + '\n' + err.stack;
									throw newErr;

								});
						})
						.then(behaviourFn)
						.catch(err => err)
						.then(result => {
							let error = null;
							if (result instanceof Error) {
								error = result;
								result = null;
							}
							app.closeEventStream();
							return testFn({
								error,
								result,
								state: app.state
							});
						});

				}
			};
		}
	};

}

module.exports = {
	given
};
