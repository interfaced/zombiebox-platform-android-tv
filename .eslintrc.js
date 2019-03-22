const path = require('path');
const eslintPluginGoog = require('eslint-plugin-goog');

const knownNamespaces = [
	...eslintPluginGoog.nsUtils.findByPattern(path.join(__dirname , 'lib', '**', '*.js')),
	...eslintPluginGoog.nsUtils.findByPattern(path.join(__dirname , 'node_modules', 'zombiebox', '**', '*.js'))
];

module.exports = {
	globals: {
		goog: true,
		zb: true,
		app: true
	},
	extends: 'interfaced',
	settings: {
		knownNamespaces
	},
	overrides: [
		{
			files: ['externs'],
			...require('eslint-config-interfaced/overrides/externs')
		},
		{
			files: ['index.js'],
			...require('eslint-config-interfaced/overrides/node')
		}
	]
};
