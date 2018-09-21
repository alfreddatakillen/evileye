const app = require('../index');

function given(precondition) {

	const promise = app.restart(Array.isArray(precondition) ? {} : precondition);

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
									promise = promise.then(fn);
								});
							}
							firstResolve();
							return promise
								.catch(err => {
									throw new Error('Error occured in preconditions.');
								});
						})
						.then(behaviourFn)
						.catch(err => err)
						.then(response => {
							let error = null;
							if (response instanceof Error) {
								error = response;
								response = null;
							}
							app.closeEventStream();
							return testFn({
								error,
								response,
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
