const currentYear = (new Date()).getFullYear();
const copyrightHeader = [
	'',
	' * This file is part of the ZombieBox package.',
	' *',
	` * Copyright © 2015-${currentYear}, Interfaced`,
	' *',
	' * For the full copyright and license information, please view the LICENSE',
	' * file that was distributed with this source code.',
	' '
];

module.exports = {
	extends: 'interfaced',
	overrides: [
		{
			files: ['externs/**/*.js'],
			extends: 'interfaced/externs',
			rules: {
				'jsdoc/require-returns-check': 'off',
				'header/header': ['error', 'block', copyrightHeader]
			}
		},
		{
			files: ['lib/**/*.js'],
			extends: 'interfaced/esm',
			plugins: [
				'header'
			],
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
				}],
				'header/header': ['error', 'block', copyrightHeader]
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
