/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import * as console from 'zb/console/console';
import AbstractDevice from 'zb/device/abstract-device';
import LocalStorage from 'zb/device/common/local-storage';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Info from './info';
import Input from './input';
import Video from './video';


/**
 */
export default class Device extends AbstractDevice {
	/**
	 */
	constructor() {
		super();

		/**
		 * @type {Input}
		 */
		this.input;

		/**
		 * @type {Info}
		 */
		this.info;

		/**
		 * @type {LocalStorage}
		 */
		this.storage;

		/**
		 * @type {AndroidDeviceAPI}
		 * @protected
		 */
		this._api = window['Device'];

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
		this.info = new Info();
		this.input = new Input(this.info);
		this.storage = new LocalStorage();

		this._fireEvent(this.EVENT_READY);
	}

	/**
	 * @override
	 */
	createVideo(rect) {
		return new Video(rect);
	}

	/**
	 * @override
	 */
	createStatefulVideo() {
		throw new UnsupportedFeature('Stateful video');
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
		throw new UnsupportedFeature('Environment getting');
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
					console.warn('Error parsing launch parameters: ' + e.message);
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
		throw new UnsupportedFeature('OSD opacity setting');
	}

	/**
	 * @override
	 */
	getOSDOpacity() {
		throw new UnsupportedFeature('OSD opacity getting');
	}

	/**
	 * @override
	 */
	setOSDChromaKey(chromaKey) {
		throw new UnsupportedFeature('OSD chroma key setting');
	}

	/**
	 * @override
	 */
	getOSDChromaKey() {
		throw new UnsupportedFeature('OSD chroma key getting');
	}

	/**
	 * @override
	 */
	removeOSDChromaKey() {
		throw new UnsupportedFeature('OSD chroma key removing');
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
	 * @override
	 */
	isUHD8KSupported() {
		return this._api.getPhysicalScreenWidth() >= 7680 && this._api.getPhysicalScreenHeight() >= 4320;
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
		const Event = NativeEvent;
		const nativeEvent = /** @type {NativeEvent} */ (event);

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
				console.warn(`Unhandled Android event ${nativeEvent}, arguments: ${data.join(', ')}`);
				break;
			}
		}
	}

	/**
	 * @return {boolean}
	 */
	static detect() {
		return (window.Device instanceof Object) &&
			(window.Device.getPlatformName instanceof Function) &&
			window.Device.getPlatformName() === 'Android';
	}
}


/**
 * @enum {string}
 */
const NativeEvent = {
	SUSPEND: 'suspend',
	RESUME: 'resume',
	MOUSE_CONNECTED: 'mouseConnected',
	MOUSE_DISCONNECTED: 'mouseDisconnected'
};
