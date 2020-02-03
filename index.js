const childProcess = require('child_process');
const fse = require('fs-extra');
const klaw = require('klaw');
const path = require('path');
const sharp = require('sharp');
const {AbstractPlatform, Application, logger: zbLogger} = require('zombiebox');

const logger = zbLogger.createChild('Android');


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
	async pack(application, distDir) {
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
			logger.warn('Building unsigned release apk. It will not install unless signed.');

			if (config.webViewDebug) {
				logger.warn('Building release with debug enabled');
			}
		}

		if (!config.namespace) {
			config.namespace = buildConfig.project.name;
			logger.warn(`Namespace not set, using "${config.namespace}"`);
		}

		if (config.namespace.startsWith('test')) {
			config.namespace = createRandomString();
			logger.warn(`Namespace could not start with "test", using ${config.namespace}`);
		}

		if (!config.versionName) {
			config.versionName = application.getAppVersion();
			logger.warn(`Version name not set, using "${config.versionName}"`);
		}

		if (!config.versionCode && config.storeRelease) {
			throw new Error('Version code is not set');
		}

		if (!config.appId) {
			if (config.storeRelease) {
				throw new Error(`Application id is required for store release`);
			}

			config.appId = `com.zombiebox.${config.namespace}.${createRandomString()}`;
			logger.warn(`Application id not set, using "${config.appId}"`);
		}

		logger.debug(`Cleaning ${buildDir}`);
		await fse.emptyDir(buildDir);
		await this._cloneSources(buildDir);
		await this._applyBuildConfig(config, buildDir);
		await this._copyResources(application, config, buildDir);
		await this._markDebugBuild(config, buildDir);
		await this._copyZbApplication(config, distDir, buildDir);
		await this._compileApk(config, buildDir, config.namespace);
		const apkPath = await this._copyApk(config, buildDir, distDir);

		logger.output(`apk assembled: ${apkPath}`);
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

		const flavor = `${config.namespace} {\n\t${properties.join('\n\t')}\n}`;
		logger.debug(`Application flavor: \n${flavor}`);
		return flavor;
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
			logger.warn('No resources set, will use default zb resources');
			return;
		}

		const configRoot = application.getPathHelper().getRootDir();
		const resPath = path.resolve(configRoot, config.resPath);
		const targetResPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		await fse.copy(resPath, targetResPath);

		const bannerPath = path.join(resPath, 'drawable', 'banner.png');

		if (!await fse.pathExists(bannerPath)) {
			logger.warn('Banner image is not set. Will fall back to zb image');

			const fallbackBanner = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'banner.png');
			const targetBannerPath = path.join(targetResPath, 'drawable', 'banner.png');
			await fse.copy(fallbackBanner, targetBannerPath);
		}
	}

	/**
	 * @param {Object} config
	 * @param {string} distDir
	 * @param {string} buildDir
	 * @return {Promise}
	 * @protected
	 */
	async _copyZbApplication(config, distDir, buildDir) {
		if (config.useBundledHTML) {
			const zbAppPath = path.join(distDir, 'index.html');
			const distAppPath = path.join(buildDir, 'app', 'src', config.namespace, 'assets', 'html', 'index.html');
			await fse.ensureDir(path.dirname(distAppPath));
			await fse.copy(zbAppPath, distAppPath);
		}
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

		logger.verbose(`Applying debug overlay to app icon`);
		const overlay = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'debug.png');
		const baseResourcesPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		let resolvePrimer;
		const primer = new Promise((resolve) => (resolvePrimer = resolve));
		const promises = [primer];

		klaw(baseResourcesPath, {
			depthLimit: 1,
			filter: (filename) => path.basename(filename).startsWith('drawable')
		})
			.on('data', async (item) => {
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

		logger.info(`Compiling ${flavor} ${buildType} apk`);

		const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

		const runGradle = async (args) => {
			logger.debug(`Running gradle ${args[0]}`);

			await new Promise((resolve, reject) => {
				const gradleProcess = childProcess.execFile(
					gradlePath,
					args,
					{
						cwd: root
					},
					(error) => error ? reject(error) : resolve()
				);

				if (zbLogger.levels[logger.level] >= zbLogger.levels.verbose) {
					gradleProcess.stdout.pipe(process.stdout);
				}
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
	 * @return {Promise<string>}
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
			return releaseTarget;
		} else if (await fse.exists(debugBuild)) {
			await fse.copy(debugBuild, debugTarget);
			return debugTarget;
		}
	}
}


module.exports = PlatformAndroid;
