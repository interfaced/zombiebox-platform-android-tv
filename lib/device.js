/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2011-nowadays, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
goog.provide('zb.device.platforms.android.Device');
goog.require('zb.console');
goog.require('zb.device.AbstractDevice');
goog.require('zb.device.errors.UnsupportedFeature');
goog.require('zb.device.platforms.android.Info');
goog.require('zb.device.platforms.android.Input');
goog.require('zb.device.platforms.android.Video');
goog.require('zb.device.platforms.common.LocalStorage');


/**
 */
zb.device.platforms.android.Device = class extends zb.device.AbstractDevice {
	/**
	 * @param {HTMLElement} videoContainer
	 */
	constructor(videoContainer) {
		super();

		/**
		 * @type {zb.device.platforms.android.Input}
		 */
		this.input;

		/**
		 * @type {zb.device.platforms.android.Info}
		 */
		this.info;

		/**
		 * @type {zb.device.platforms.common.LocalStorage}
		 */
		this.storage;

		/**
		 * @type {HTMLElement}
		 * @protected
		 */
		this._videoContainer = videoContainer;

		/**
		 * @type {AndroidDeviceAPI}
		 * @protected
		 */
		this._api = (window['Device']);

		/**
		 * Application lost focus. Video playback will be paused automatically.
		 * Fired with: nothing
		 * @const {string}
		 */
		this.EVENT_SUSPEND = 'suspend';

		/**
		 * Focus returned to application
		 * Fired with: nothing
		 * @const {string}
		 */
		this.EVENT_RESUME = 'resume';

		this._bindListeners();
	}

	/**
	 * @override
	 */
	init() {
		this.info = new zb.device.platforms.android.Info();
		this.input = new zb.device.platforms.android.Input(this.info);
		this.storage = new zb.device.platforms.common.LocalStorage();

		this._fireEvent(this.EVENT_READY);
	}

	/**
	 * @override
	 */
	createVideo() {
		return new zb.device.platforms.android.Video(this._videoContainer);
	}

	/**
	 * @override
	 */
	exit() {
		this._api.exit();
	}

	/**
	 * @override
	 */
	getMAC() {
		return this.info.getMAC();
	}

	/**
	 * @override
	 */
	getIP() {
		return this.info.getIP();
	}

	/**
	 * @override
	 */
	getEnvironment() {
		throw new zb.device.errors.UnsupportedFeature('Environment getting');
	}

	/**
	 * @override
	 */
	getLaunchParams() {
		const params = this._api.getLaunchParams();

		if (params) {
			try {
				return /** @type {Object} */ (JSON.parse(params));
			} catch (e) {
				if (e instanceof SyntaxError) {
					zb.console.warn('Error parsing launch parameters: ' + e.message);
				} else {
					throw e;
				}
			}
		}

		return {};
	}

	/**
	 * @override
	 */
	setOSDOpacity() {
		throw new zb.device.errors.UnsupportedFeature('OSD opacity setting');
	}

	/**
	 * @override
	 */
	getOSDOpacity() {
		throw new zb.device.errors.UnsupportedFeature('OSD opacity getting');
	}

	/**
	 * @override
	 */
	setOSDChromaKey(chromaKey) {
		throw new zb.device.errors.UnsupportedFeature('OSD chroma key setting');
	}

	/**
	 * @override
	 */
	getOSDChromaKey() {
		throw new zb.device.errors.UnsupportedFeature('OSD chroma key getting');
	}

	/**
	 * @override
	 */
	removeOSDChromaKey() {
		throw new zb.device.errors.UnsupportedFeature('OSD chroma key removing');
	}

	/**
	 * @override
	 */
	hasOSDOpacityFeature() {
		return false;
	}

	/**
	 * @override
	 */
	hasOSDAlphaBlendingFeature() {
		return true;
	}

	/**
	 * @override
	 */
	hasOSDChromaKeyFeature() {
		return false;
	}

	/**
	 * @override
	 */
	isUHDSupported() {
		return this._api.getPhysicalScreenWidth() >= 3840 && this._api.getPhysicalScreenHeight() >= 2160;
	}

	/**
	 * Listen to native events
	 * @protected
	 */
	_bindListeners() {
		this._api.onEvent = this._onDeviceEvent.bind(this);
	}

	/**
	 * Native event handling
	 * @param {string} event
	 * @param {...?string} data event data
	 * @protected
	 */
	_onDeviceEvent(event, ...data) {
		const Event = zb.device.platforms.android.Device.NativeEvent;
		const nativeEvent = /** @type {zb.device.platforms.android.Device.NativeEvent} */ (event);

		switch (nativeEvent) {
			case Event.SUSPEND:
				this._fireEvent(this.EVENT_SUSPEND);
				break;
			case Event.RESUME:
				this._fireEvent(this.EVENT_RESUME);
				break;
			case Event.MOUSE_CONNECTED:
				this.input.attachMouse();
				break;
			case Event.MOUSE_DISCONNECTED:
				this.input.detachMouse();
				break;
			default: {
				zb.console.warn(`Unhandled Android event ${nativeEvent}, arguments: ${data.join(', ')}`);
				break;
			}
		}
	}

	/**
	 * @override
	 */
	static detect() {
		return (window.Device instanceof Object) &&
			(window.Device.getPlatformName instanceof Function) &&
			window.Device.getPlatformName() === 'Android';
	}
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Device.NativeEvent = {
	SUSPEND: 'suspend',
	RESUME: 'resume',
	MOUSE_CONNECTED: 'mouseConnected',
	MOUSE_DISCONNECTED: 'mouseDisconnected'
};
