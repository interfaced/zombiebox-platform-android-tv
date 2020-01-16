/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractInput from 'zb/device/abstract-input';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Keys from 'zb/device/input/keys';
import Info from './info';


/**
 */
export default class Input extends AbstractInput {
	/**
	 * @param {Info} info
	 */
	constructor(info) {
		super();

		/**
		 * @type {Info}
		 * @protected
		 */
		this._info = info;

		/**
		 * @type {AndroidDeviceAPI}
		 * @protected
		 */
		this._device = window['Device'];

		if (this._info.isNexusPlayer()) {
			this._createKeysMapForNexus();
		}

		if (this._info.isSonyBravia()) {
			this._createKeysMapForSonyBravia();
		}

		if (this.isPointingDeviceActive()) {
			this.attachMouse();
		}
	}

	/**
	 * @override
	 */
	isPointingDeviceSupported() {
		// TODO: stub until pointer is fully supported (#6324)
		// return true;
		return false;
	}

	/**
	 * @override
	 */
	isPointingDeviceActive() {
		// TODO: stub until pointer is fully supported (#6324)
		// return this._device.isMouseConnected();
		return false;
	}

	/**
	 * @override
	 */
	enablePointingDevice() {
		throw new UnsupportedFeature('Pointing device enabling');
	}

	/**
	 * @override
	 */
	disablePointingDevice() {
		throw new UnsupportedFeature('Pointing device disabling');
	}

	/**
	 * @return {boolean}
	 */
	hasFeatureColorKeys() {
		return this._device.areColorKeysAvailable();
	}

	/**
	 */
	attachMouse() {
		// TODO: do nothing until pointer is fully supported (#6324)
		// this._fireEvent(this.EVENT_POINTING_DEVICE_ACTIVATED);
	}

	/**
	 */
	detachMouse() {
		// TODO: do nothing until pointer is fully supported (#6324)
		// this._fireEvent(this.EVENT_POINTING_DEVICE_DEACTIVATED);
	}

	/**
	 * @override
	 */
	_createKeysMap() {
		const map = {};

		map[37] = Keys.LEFT;
		map[38] = Keys.UP;
		map[39] = Keys.RIGHT;
		map[40] = Keys.DOWN;

		map[13] = Keys.ENTER;

		return map;
	}

	/**
	 * @override
	 */
	_keyboardEventToKeyCode(event) {
		if (this._info.isSonyBravia()) {
			switch (event.key) {
				case 'ColorF0Red':
					return Keys.RED;
				case 'ColorF1Green':
					return Keys.GREEN;
				case 'ColorF2Yellow':
					return Keys.YELLOW;
				case 'ColorF3Blue':
					return Keys.BLUE;

				case 'Info':
					return Keys.INFO;
				case 'MediaPlay':
					return Keys.PLAY;
				case 'MediaPlayPause':
					return Keys.PAUSE;
			}
		}

		return super._keyboardEventToKeyCode(event);
	}

	/**
	 * @private
	 */
	_createKeysMapForSonyBravia() {
		const zero = 48;

		this._map[zero + 0] = Keys.DIGIT_0;
		this._map[zero + 1] = Keys.DIGIT_1;
		this._map[zero + 2] = Keys.DIGIT_2;
		this._map[zero + 3] = Keys.DIGIT_3;
		this._map[zero + 4] = Keys.DIGIT_4;
		this._map[zero + 5] = Keys.DIGIT_5;
		this._map[zero + 6] = Keys.DIGIT_6;
		this._map[zero + 7] = Keys.DIGIT_7;
		this._map[zero + 8] = Keys.DIGIT_8;
		this._map[zero + 9] = Keys.DIGIT_9;

		this._map[33] = Keys.PAGE_UP;
		this._map[34] = Keys.PAGE_DOWN;

		// Bravia 2015 has separate Play and Pause keys, but they have the same keycode.
		// They can be identified by key property in _keyboardEventToKeyCode
		this._map[179] = Keys.PLAY_PAUSE;

		this._map[178] = Keys.STOP;
		this._map[227] = Keys.REW;
		this._map[228] = Keys.FWD;
		this._map[176] = Keys.NEXT_CHAPTER;
		this._map[177] = Keys.PREV_CHAPTER;

		this._map[27] = Keys.EXIT;
	}

	/**
	 * @private
	 */
	_createKeysMapForNexus() {
		this._map[179] = Keys.PLAY_PAUSE;
	}
}
