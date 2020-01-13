module.exports = {
	extends: 'interfaced',
	overrides: [
		{
			files: ['externs/**/*.js'],
			extends: 'interfaced/externs',
			rules: {
				'jsdoc/require-returns-check': 'off',
			}
		},
		{
			files: ['lib/**/*.js'],
			extends: 'interfaced/esm',
			settings: {
				'import/resolver': 'zombiebox'
			},
			rules: {
				'jsdoc/no-undefined-types': ['error', {
					definedTypes: [
						// See externs
						'AndroidDeviceAPI',
						'AndroidPlayerAPI'
					]
				}]
			}
		},
		{
			files: ['.eslintrc.js', 'index.js', 'tester/*.js'],
			extends: 'interfaced/node',
			rules: {
				'function-call-argument-newline': 'off'
			}
		}
	]
};
