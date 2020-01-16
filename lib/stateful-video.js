/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractStatefulVideo from 'zb/device/abstract-stateful-video';
import {PrepareOption, MediaType, State} from 'zb/device/interfaces/i-stateful-video';
import {Type as DRMType} from 'zb/device/drm/drm';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Timeout from 'zb/timeout';
import PlayReadyClient from 'zb/device/drm/playready-client';
import {ResolutionInfoItem} from 'zb/device/resolutions';
import Viewport from './viewport';
import PlayReadyHook from './playready-hook';
import {
	Event as NativeEvent,
	Error as NativeError,
	VideoType,
	MediaType as NativeMediaType,
	VideoOptimisation
} from './native-constants';


const {
	IDLE,
	LOADING,
	READY,
	PLAYING,
	PAUSED,
	WAITING,
	SEEKING,
	ENDED,
	ERROR,
	INVALID,
	DESTROYED
} = State;


/**
 *
 */
export default class StatefulVideo extends AbstractStatefulVideo {
	/**
	 * @param {ResolutionInfoItem} panelResolution
	 * @param {ResolutionInfoItem} appResolution
	 */
	constructor(panelResolution, appResolution) {
		super(panelResolution, appResolution);

		/**
		 * @type {AndroidPlayerAPI}
		 * @protected
		 */
		this._engine = window.Player;

		/**
		 * @type {Timeout}
		 * @protected
		 */
		this._timeUpdateTimeout;

		/**
		 * @type {boolean}
		 * @protected
		 */
		this._isMuted = false;

		/**
		 * @type {?number}
		 * @protected
		 */
		this._volumeUnderMute = null;

		/**
		 * @type {?PlayReadyHook}
		 * @protected
		 */
		this._drmHook = null;

		/**
		 * @type {Viewport}
		 * @protected
		 */
		this._viewport;

		/**
		 * TIME_UPDATE event triggering interval
		 * @const {number}
		 */
		this.TIME_UPDATE_INTERVAL = 200;

		this._onErrorEventBound = (event, error) => this._onError(error);

		try {
			this._init();
		} catch (e) {
			this._stateMachine.setState(INVALID);
		}
	}

	/**
	 * @override
	 */
	prepare(url, options = {}) {
		this._stateMachine.startTransitionTo(LOADING);

		const preparePlayback = () => {
			this._engine.setVideoURI(url);

			if (PrepareOption.START_POSITION in options) {
				this._engine.seekTo(/** @type {number} */ (options[PrepareOption.START_POSITION]));
			}

			this._stateMachine.setState(LOADING);
		};

		if (PrepareOption.TYPE in options) {
			this._engine.setMediaType(videoMediaTypeToNative(options[PrepareOption.TYPE]) || NativeMediaType.AUTO);
		} else {
			this._engine.setMediaType(NativeMediaType.AUTO);
		}

		if (!this._drmHook) {
			preparePlayback();
			return;
		}

		this._drmHook.prepare()
			.then(preparePlayback, (error) => {
				if (this._stateMachine.isIn(DESTROYED) || this._stateMachine.isTransitingTo(DESTROYED)) {
					// Safe to ignore
					console.error(error); // eslint-disable-line no-console
					this._fireEvent(this.EVENT_DEBUG_MESSAGE, error.message);
				} else {
					this._onError(error instanceof Error ? error : new Error(error));
				}
			});
	}

	/**
	 * @override
	 */
	play() {
		this._fireEvent(this.EVENT_WILL_PLAY);
		this._stateMachine.startTransitionTo(PLAYING);

		this._engine.start();
	}

	/**
	 * @override
	 */
	pause() {
		this._fireEvent(this.EVENT_WILL_PAUSE);
		this._stateMachine.startTransitionTo(PAUSED);

		this._engine.pause();
	}

	/**
	 * @override
	 */
	stop() {
		this._fireEvent(this.EVENT_WILL_STOP);
		this._stateMachine.startTransitionTo(IDLE);

		this._engine.stop();
	}

	/**
	 * @override
	 */
	setPosition(position) {
		let normalizedPosition = position;
		normalizedPosition = Math.min(normalizedPosition, this.getDuration() - 1);
		normalizedPosition = Math.max(normalizedPosition, 1);

		this._fireEvent(this.EVENT_WILL_SEEK, position);
		this._stateMachine.startTransitionTo(SEEKING);
		this._engine.seekTo(normalizedPosition);
	}

	/**
	 * @override
	 */
	getPosition() {
		return this._engine.getCurrentPosition();
	}

	/**
	 * @override
	 */
	getDuration() {
		return this._engine.isLiveStream() ?
			Infinity :
			this._engine.getDuration();
	}

	/**
	 * @override
	 */
	destroy() {
		this._stateMachine.startTransitionTo(DESTROYED);

		if (this._timeUpdateTimeout) {
			this._timeUpdateTimeout.stop();
		}
		this._timeUpdateTimeout = null;
		this._volumeUnderMute = null;

		if (this._stateMachine.isTransitingFrom(INVALID)) {
			this._stateMachine.setState(DESTROYED);
		} else {
			this._engine.destroy();
		}
	}

	/**
	 * @override
	 */
	getMuted() {
		return this._isMuted;
	}

	/**
	 * @override
	 */
	setMuted(muted) {
		if (muted === this._isMuted) {
			return;
		}

		if (muted) {
			this._volumeUnderMute = this._engine.getVolume();
			this._isMuted = true;
			this._engine.setVolume(0);
		} else {
			this._isMuted = false;
			if (this._volumeUnderMute !== null) {
				this._engine.setVolume(this._volumeUnderMute);
			}
			this._volumeUnderMute = null;
		}
	}

	/**
	 * @override
	 */
	getPlaybackRate() {
		throw new UnsupportedFeature('Playback rate');
	}

	/**
	 * @override
	 */
	setPlaybackRate() {
		throw new UnsupportedFeature('Playback rate');
	}

	/**
	 * @override
	 */
	getUrl() {
		return this._engine.getVideoURI();
	}

	/**
	 * @override
	 */
	getVolume() {
		if (this._isMuted && this._volumeUnderMute !== null) {
			return this._volumeUnderMute;
		}
		return this._engine.getVolume();
	}

	/**
	 * @override
	 */
	setVolume(volume) {
		let normalized = volume;
		normalized = Math.min(normalized, 100);
		normalized = Math.max(normalized, 0);

		if (normalized === this._engine.getVolume()) {
			return;
		}

		if (this._isMuted) {
			this._volumeUnderMute = normalized;
		} else {
			this._fireEvent(this.EVENT_WILL_CHANGE_VOLUME, normalized);
			this._engine.setVolume(normalized);
		}
	}

	/**
	 * @override
	 */
	getViewport() {
		return this._viewport;
	}

	/**
	 * @override
	 */
	attachDRM(client) {
		if (client.type === DRMType.PLAYREADY) {
			client = /** @type {PlayReadyClient} */ (client);
			this._drmHook = new PlayReadyHook(client);
			this._drmHook.on(this._drmHook.EVENT_ERROR, this._onErrorEventBound);
		} else {
			throw new UnsupportedFeature(`${client.type} DRM`);
		}
	}

	/**
	 * @override
	 */
	detachDRM(type) {
		if (this._drmHook && this._drmHook.type === type) {
			this._drmHook.off(this._drmHook.EVENT_ERROR, this._onErrorEventBound);
			this._drmHook.destroy();
			this._drmHook = null;
		}

		return Promise.resolve();
	}

	/**
	 * @param {VideoOptimisation} type
	 */
	setVideoOptimisation(type) {
		switch (type) {
			case VideoOptimisation.ROTATION_SUPPORT: {
				this._engine.setVideoType(VideoType.TEXTURE_VIEW);
				break;
			}
			case VideoOptimisation.SMOOTH_PLAYBACK:
			default: {
				this._engine.setVideoType(VideoType.SURFACE_VIEW);
				break;
			}
		}
	}

	/**
	 * @protected
	 */
	_init() {
		this._engine.create();
		this._engine.onEvent = (event, ...data) => this._onNativeEvent(event, ...data);

		this._viewport = new Viewport(this._engine, this._panelResolution, this._appResolution);

		this._timeUpdateTimeout = new Timeout(() => {
			this._fireEvent(this.EVENT_TIME_UPDATE, this.getPosition());
			this._timeUpdateTimeout.restart();
		}, this.TIME_UPDATE_INTERVAL);

		this._stateMachine.on(
			this._stateMachine.EVENT_STATE_ENTER,
			(event, newState) => {
				if (newState === PLAYING) {
					this._startTimeUpdating();
				}
			}
		);

		this._stateMachine.on(
			this._stateMachine.EVENT_STATE_EXIT,
			(event, oldState) => {
				if (oldState === PLAYING) {
					this._stopTimeUpdating();
				}
			}
		);
	}

	/**
	 * @param {NativeEvent} event
	 * @param {...?string} data
	 * @protected
	 */
	_onNativeEvent(event, ...data) {
		this._fireEvent(this.EVENT_DEBUG_MESSAGE, `Native ${event} ${data.join(', ')}`);

		if (event === NativeEvent.ERROR) {
			this._onNativeError(...data);
			return;
		}

		if (event === NativeEvent.DESTROYED) {
			this._stateMachine.setState(DESTROYED);
			return;
		}

		if (this._stateMachine.isIn(DESTROYED) || this._stateMachine.isTransitingTo(DESTROYED)) {
			this._fireEvent(this.EVENT_DEBUG_MESSAGE, `Native ${event} ignored during destruction`);
			return;
		}

		try {
			switch (event) {
				case NativeEvent.READY: {
					const startingPlayback = data[0];

					if (startingPlayback) {
						this._stateMachine.setState(PLAYING);
					} else if (this._stateMachine.isIn(LOADING)) {
						this._stateMachine.setState(READY);
					} else {
						this._stateMachine.setState(PAUSED);
					}
					break;
				}
				case NativeEvent.IDLE: {
					this._stateMachine.setState(IDLE);
					break;
				}
				case NativeEvent.SEEK: {
					if (this._stateMachine.isNotIn(LOADING)) {
						this._stateMachine.setState(SEEKING);
					}
					break;
				}
				case NativeEvent.SEEK_PROCESSED: {
					if (this._stateMachine.isNotIn(LOADING)) {
						this._fireEvent(this.EVENT_SEEKED, this.getPosition());
						// State change will happen with READY event
					}
					break;
				}
				case NativeEvent.STALLED: {
					if (
						this._stateMachine.isNotIn(LOADING) &&
						!this._stateMachine.isTransitingFrom(LOADING) && // Happens when stop is called during LOADING
						this._stateMachine.isNotIn(SEEKING)
					) {
						this._stateMachine.setState(WAITING);
					}
					break;
				}
				case NativeEvent.VOLUME_CHANGED: {
					this._fireEvent(this.EVENT_VOLUME_CHANGE, data[0]);
					break;
				}
				case NativeEvent.ENDED: {
					if (this._stateMachine.isIn(LOADING)) {
						// Native player doesn't seem to treat broken files as errors
						this._stateMachine.setState(ERROR);
					} else {
						this._stateMachine.setState(ENDED);
					}
					break;
				}
			}
		} catch (e) {
			// Since this happens in event tasks, errors caused by flaws in StatefulVideo logic would be lost in
			// uncaught exceptions, but we want to transit to ERROR state instead
			this._onError(e);
		}
	}

	/**
	 * @param {NativeError} error
	 * @param {string} message
	 * @protected
	 */
	_onNativeError(error, message) {
		this._onError(new Error(`Native player error ${error}: ${message}`));
	}

	/**
	 * @param {Error} error
	 * @protected
	 */
	_onError(error) {
		this._stateMachine.abortPendingTransition();

		const message = [
			error.name,
			error['code'],
			error.message
		].filter((property) => property !== undefined).join(' ');

		if (this._stateMachine.isIn(DESTROYED)) {
			this._fireEvent(this.EVENT_DEBUG_MESSAGE, `Error happened in destroyed state: ${message}`);
		} else {
			if (!this._stateMachine.isIn(ERROR)) {
				// In case a second consecutive error happened
				this._stateMachine.setState(ERROR);
			}
			this._fireEvent(this.EVENT_ERROR, message);
		}
	}

	/**
	 * Start triggering TIME_UPDATE
	 * @protected
	 */
	_startTimeUpdating() {
		this._timeUpdateTimeout.force();
		this._timeUpdateTimeout.start();
	}

	/**
	 * Stop triggering TIME_UPDATE
	 * @protected
	 */
	_stopTimeUpdating() {
		this._timeUpdateTimeout.stop();
	}

	/**
	 * @override
	 */
	static isDRMSupported(type) {
		return [
			DRMType.PLAYREADY
		].includes(type);
	}
}


/**
 * @param {MediaType} type
 * @return {?NativeMediaType}
 */
function videoMediaTypeToNative(type) {
	const map = {
		[MediaType.HLS]: NativeMediaType.HLS,
		[MediaType.DASH]: NativeMediaType.DASH,
		[MediaType.MSS]: NativeMediaType.SS
	};

	return map[type] || null;
}
