const childProcess = require('child_process');
const fse = require('fs-extra');
const klaw = require('klaw');
const path = require('path');
const sharp = require('sharp');
const chalk = require('chalk');
const {AbstractPlatform, Application} = require('zombiebox');


/**
 */
class PlatformAndroid extends AbstractPlatform {
	/**
	 */
	constructor() {
		super();

		/**
		 * @const {string}
		 * @protected
		 */
		this.CONFIG_REPLACE_PATTERN = '//[FLAVOR_INSERTION_POINT]//';
	}

	/**
	 * @override
	 */
	getName() {
		return 'android';
	}

	/**
	 * @override
	 */
	getSourcesDir() {
		return path.join(__dirname, 'lib');
	}

	/**
	 * @override
	 */
	getConfig() {
		return {
			platforms: {
				android: {
					appId: undefined,
					versionCode: undefined,
					versionName: undefined,
					namespace: undefined,
					name: 'ZombieBox',
					launcherColor: undefined,
					useBundledHTML: true,
					applicationURL: undefined,
					webViewDebug: false,
					storeRelease: false,
					resPath: undefined
				}
			},
			include: [
				{
					name: 'Android TV externs',
					externs: [
						path.join(__dirname, 'externs', 'player.js'),
						path.join(__dirname, 'externs', 'device.js')
					]
				}
			]
		};
	}

	/**
	 * @override
	 */
	buildCLI() {/* do nothing */}

	/**
	 * @override
	 */
	async buildApp(application, distDir) {
		/**
		 * @param {number} len
		 * @return {string}
		 */
		const createRandomString = (len = 7) => Array
			.from(Array(len - 1))
			.map(() => String.fromCharCode(Math.random() * 26 + 97))
			.join('');

		const buildConfig = application.getConfig();
		const config = buildConfig.platforms.android;

		const buildDir = path.join(distDir, 'src');

		if (config.storeRelease) {
			console.warn(chalk.yellow('Building unsigned release apk. It will not install unless signed.'));

			if (config.webViewDebug) {
				console.warn(chalk.red('Building release with debug enabled'));
			}
		}

		if (!config.namespace) {
			config.namespace = buildConfig.project.name;
			console.warn(chalk.yellow(`Namespace not set, using "${config.namespace}"`));
		}

		if (config.namespace.startsWith('test')) {
			config.namespace = createRandomString();
			console.warn(chalk.yellow(`Namespace could not start with "test", using ${config.namespace}`));
		}

		if (!config.versionName) {
			config.versionName = application.getAppVersion();
			console.warn(chalk.yellow(`Version name not set, using "${config.versionName}"`));
		}

		if (!config.versionCode && config.storeRelease) {
			console.error(chalk.red('Version code is not set'));
			return Promise.reject('No versionCode');
		}

		if (!config.appId) {
			if (config.storeRelease) {
				console.error(chalk.red(`Application id not set`));
				return Promise.reject();
			}

			config.appId = `com.zombiebox.${config.namespace}.${createRandomString()}`;
			console.warn(chalk.yellow(`Application id not set, using "${config.appId}"`));
		}


		await fse.emptyDir(buildDir);
		await this._cloneSources(buildDir);
		await this._applyBuildConfig(config, buildDir);
		await this._copyResources(application, config, buildDir);
		await this._markDebugBuild(config, buildDir);
		const zbBuildWarnings = await this._compileZbApplication(application, distDir, config, buildDir);
		await this._compileApk(config, buildDir, config.namespace);
		await this._copyApk(config, buildDir, distDir);

		return zbBuildWarnings;
	}

	/**
	 * Copy apk sources
	 * @param {string} targetPath
	 * @return {Promise}
	 * @protected
	 */
	async _cloneSources(targetPath) {
		await fse.copy(path.join(__dirname, 'native'), targetPath);
	}

	/**
	 * @param {Object} config
	 * @return {Promise<string>}
	 * @protected
	 */
	_generateBuildFlavor(config) {
		const propertyValues = {
			'appId': `applicationId "${config.appId}"`,
			'name': `resValue "string", "app_name", "${config.name}"`,
			'launcherColor': `resValue "color", "tvLauncherColor", "${config.launcherColor}"`,
			'versionCode': `versionCode ${config.versionCode}`,
			'versionName': `versionName "${config.versionName}"`,
			'useBundledHTML': `buildConfigField 'Boolean', 'USE_BUNDLED_HTML', '${config.useBundledHTML}'`,
			'applicationURL': `buildConfigField 'String', 'APPLICATION_URL', '"${config.applicationURL}"'`,
			'webViewDebug': `buildConfigField 'Boolean', 'WEBVIEW_DEBUG', '${config.webViewDebug}'`
		};

		const properties = [
			'dimension "zb-project"'
		];

		for (const [property, value] of Object.entries(config)) {
			if (propertyValues.hasOwnProperty(property) && value !== undefined) {
				properties.push(propertyValues[property]);
			}
		}

		return `${config.namespace} {\n\t${properties.join('\n\t')}\n}`;
	}

	/**
	 * Writes flavor config to sources
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {Promise}
	 * @protected
	 */
	async _applyBuildConfig(config, buildDir) {
		const flavor = this._generateBuildFlavor(config);
		const gradleConfig = path.join(buildDir, 'app', 'build.gradle');

		const data = await fse.readFile(gradleConfig, 'utf-8');
		await fse.writeFile(gradleConfig, data.replace(this.CONFIG_REPLACE_PATTERN, flavor));
	}

	/**
	 * Copy icons from config paths
	 * @param {Application} application
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {Promise}
	 * @protected
	 */
	async _copyResources(application, config, buildDir) {
		if (!config.resPath) {
			console.warn(chalk.yellow('No resources set, will use default zb resources'));
			return;
		}

		const configRoot = application.getPathHelper().getRootDir();
		const resPath = path.resolve(configRoot, config.resPath);
		const targetResPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		await fse.copy(resPath, targetResPath);

		const bannerPath = path.join(resPath, 'drawable', 'banner.png');

		if (!await fse.pathExists(bannerPath)) {
			console.warn(chalk.yellow('Banner image is not set. Will fall back to zb image'));

			const fallbackBanner = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'banner.png');
			const targetBannerPath = path.join(targetResPath, 'drawable', 'banner.png');
			await fse.copy(fallbackBanner, targetBannerPath);
		}
	}

	/**
	 * @param {Application} application
	 * @param {string} distDir
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {Promise}
	 * @protected
	 */
	async _compileZbApplication(application, distDir, config, buildDir) {
		let zbAppPath;
		if (config.useBundledHTML) {
			zbAppPath = path.join(buildDir, 'app', 'src', config.namespace, 'assets', 'html', 'index.html');
		} else {
			zbAppPath = path.join(buildDir, 'index.html');
		}

		const buildHelper = application.getBuildHelper();

		await fse.ensureDir(path.dirname(zbAppPath));
		const warnings = await buildHelper.writeIndexHTML(zbAppPath);
		await buildHelper.copyStaticFiles(distDir);
		return warnings;
	}

	/**
	 * Apply distinctly noticeable overlay to app banner when building in debug configuration
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {Promise}
	 * @protected
	 */
	async _markDebugBuild(config, buildDir) {
		if (config.storeRelease || config.resPath === undefined) {
			return;
		}

		const overlay = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'debug.png');
		const baseResourcesPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		let resolvePrimer;
		const primer = new Promise((resolve) => (resolvePrimer = resolve));
		const promises = [primer];

		klaw(baseResourcesPath, {
			depthLimit: 1,
			filter: (filename) => path.basename(filename).startsWith('drawable')
		})
			.on('data', async(item) => {
				const bannerPath = path.join(baseResourcesPath, item.path, 'banner.png');
				if (await fse.exists(bannerPath)) {
					promises.push(sharp(bannerPath)
						.overlayWith(overlay)
						.toFile(bannerPath + '~')
						.then(() => fse.rename(bannerPath + '~', bannerPath))
					);
				}
			})
			.on('end', resolvePrimer);

		await Promise.all(promises);
	}

	/**
	 * @param {Object} config
	 * @param {string} root
	 * @param {string} flavor
	 * @return {Promise}
	 * @protected
	 */
	async _compileApk(config, root, flavor) {
		const gradlePath = path.join(root, 'gradlew');

		const buildType = config.storeRelease ? 'Release' : 'Debug';

		console.log(chalk.green(`Compiling ${flavor} ${buildType} apk`));

		const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

		const runGradle = async(args) => {
			console.log(chalk.yellow('Running', `gradle ${args[0]}`));

			await new Promise((resolve, reject) => {
				const gradleProcess = childProcess.execFile(
					gradlePath,
					args,
					{
						cwd: root
					},
					(error) => error ? reject(error) : resolve()
				);

				gradleProcess.stdout.pipe(process.stdout);
				gradleProcess.stderr.pipe(process.stderr);
			});
		};

		await runGradle(['clean']);
		await runGradle(['assemble' + capitalize(flavor) + buildType]);
	}

	/**
	 * @param {Object} config
	 * @param {string} buildDir
	 * @param {string} distDir
	 * @return {Promise}
	 * @protected
	 */
	async _copyApk(config, buildDir, distDir) {
		const debugBuild = path.join(
			buildDir, 'app', 'build', 'outputs', 'apk', config.namespace, 'debug',
			`app-${config.namespace}-debug.apk`
		);

		const releaseBuild = path.join(
			buildDir, 'app', 'build', 'outputs', 'apk', config.namespace, 'release',
			`app-${config.namespace}-release-unsigned.apk`
		);

		let filename = `${config.namespace}-${config.versionName}`;
		if (config.storeRelease) {
			filename += `-v${config.versionCode}`;
		}

		const debugTarget = path.join(distDir, filename + '-debug.apk');
		const releaseTarget = path.join(distDir, filename + '-release-unsigned.apk');

		if (config.storeRelease && await fse.exists(releaseBuild)) {
			await fse.copy(releaseBuild, releaseTarget);
		} else if (await fse.exists(debugBuild)) {
			await fse.copy(debugBuild, debugTarget);
		}
	}
}


module.exports = PlatformAndroid;
