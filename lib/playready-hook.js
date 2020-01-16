/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import EventPublisher from 'zb/events/event-publisher';
import PlayReadyClient from 'zb/device/drm/playready-client';
import {Type} from 'zb/device/drm/drm';
import {DRMType as NativeType} from './native-constants';


/**
 */
export default class PlayReadyHook extends EventPublisher {
	/**
	 * @param {PlayReadyClient} client
	 */
	constructor(client) {
		super();

		/**
		 * @type {Type|string}
		 */
		this.type = Type.PLAYREADY;

		/**
		 * @type {AndroidPlayerAPI}
		 * @protected
		 */
		this._engine = window.Player;

		/**
		 * @type {PlayReadyClient}
		 * @protected
		 */
		this._client = client;

		/**
		 * @type {Promise}
		 * @protected
		 */
		this._initPromise = null;

		/**
		 * Fired with: {Error}
		 * @const {string}
		 */
		this.EVENT_ERROR = 'error';

		this._onClientError = (event, error) => this._fireEvent(this.EVENT_ERROR, error);
		this._client.on(this._client.EVENT_ERROR, this._onClientError);

		this._initPromise = this._init();
	}

	/**
	 * @return {Promise}
	 */
	async prepare() {
		await this._initPromise;
		this._assertIsAlive();
		await this._client.prepare();
		this._assertIsAlive();

		try {
			this._engine.setDRM(NativeType.PLAYREADY, this._client.licenseServer);
		} catch (e) {
			this._onError(e);
		}
	}

	/**
	 */
	destroy() {
		this._engine.setDRM(NativeType.NONE, null);
		this._client.off(this._client.EVENT_ERROR, this._onClientError);
		this._client = null;
		this._initPromise = null;
	}

	/**
	 * @return {Promise}
	 * @protected
	 */
	async _init() {
		await this._client.init();
	}

	/**
	 * @param {Error} error
	 * @protected
	 */
	_onError(error) {
		this._fireEvent(this.EVENT_ERROR, error);
	}

	/**
	 * @return {boolean}
	 * @protected
	 */
	_isDestroyed() {
		return !this._initPromise;
	}

	/**
	 * @throws {Error}
	 * @protected
	 */
	_assertIsAlive() {
		if (this._isDestroyed()) {
			throw new Error('Hook destroyed while preparing');
		}
	}
}
