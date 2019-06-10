/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import * as console from 'zb/console/console';
import AbstractVideo from 'zb/device/abstract-video';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import {State} from 'zb/device/interfaces/i-video';
import Timeout from 'zb/timeout';
import Viewport from './viewport';


/**
 */
export default class Video extends AbstractVideo {
	/**
	 * @param {HTMLElement} videoContainer
	 */
	constructor(videoContainer) {
		super(videoContainer);

		/**
		 * @type {AndroidPlayerAPI}
		 * @protected
		 */
		this._player = (window['Player']);

		/**
		 * @type {Timeout}
		 * @protected
		 */
		this._timeUpdateTimeout;

		/**
		 * @type {boolean}
		 * @protected
		 */
		this._receivedTimelineChanged = false;

		/**
		 * @type {boolean}
		 * @protected
		 */
		this._receivedTracksChanged = false;

		/**
		 * @type {boolean}
		 * @protected
		 */
		this._receivedReady = false;

		/**
		 * TIME_UPDATE event triggering interval
		 * @const {number}
		 */
		this.TIME_UPDATE_INTERVAL = 200;

		this._initTimeUpdateTimeout();
		this._bindListeners();

		this._setState(State.UNINITED);
		this._player.create();

		this._initViewPort();

		this._setState(State.INITED);
	}

	/**
	 * @override
	 */
	forward() {
		throw new UnsupportedFeature('Forward');
	}

	/**
	 * @override
	 */
	rewind() {
		throw new UnsupportedFeature('Rewind');
	}

	/**
	 * @override
	 */
	setPlaybackRate(rate) {
		throw new UnsupportedFeature('Playback rate setting');
	}

	/**
	 * @override
	 */
	getPlaybackRate() {
		throw new UnsupportedFeature('Playback rate getting');
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {number=} opt_position
	 */
	play(url, opt_position) {
		this._receivedTimelineChanged = false;
		this._receivedTracksChanged = false;
		this._receivedReady = false;

		this._setState(State.LOADING);

		this._player.setVideoURI(url);
		if (opt_position) {
			this._player.seekTo(opt_position);
		}
		this._player.start();
	}

	/**
	 * @override
	 */
	pause() {
		this._player.pause();
	}

	/**
	 * @override
	 */
	stop() {
		this._player.stop();
	}

	/**
	 * @override
	 */
	resume() {
		this._player.start();
	}

	/**
	 * @override
	 */
	setPosition(position) {
		let normalizedPosition = position;
		normalizedPosition = Math.min(normalizedPosition, this.getDuration() - 1);
		normalizedPosition = Math.max(normalizedPosition, 1);

		this._player.seekTo(normalizedPosition);
	}

	/**
	 * @override
	 */
	getPosition() {
		return this._player.getCurrentPosition();
	}

	/**
	 * @override
	 */
	getDuration() {
		return this._player.isLiveStream() ?
			Infinity :
			this._player.getDuration();
	}

	/**
	 * @override
	 */
	destroy() {
		this._player.destroy();
	}

	/**
	 * @override
	 */
	getMuted() {
		return this._player.getMuted();
	}

	/**
	 * @override
	 */
	setMuted(muted) {
		this._player.setMuted(muted);
	}

	/**
	 * @override
	 */
	getVolume() {
		return this._player.getVolume();
	}

	/**
	 * @override
	 */
	setVolume(volume) {
		this._player.setVolume(volume);
	}

	/**
	 * @override
	 */
	getUrl() {
		return this._player.getVideoURI();
	}

	/**
	 * Sets various video options
	 * @param {Object} options
	 * mediaType - MediaType
	 */
	setMediaOptions(options) {
		if (options['mediaType']) {
			this._player.setMediaType(options['mediaType']);
		}
	}

	/**
	 * @param {VideoOptimisation} type
	 */
	setVideoOptimisation(type) {
		switch (type) {
			case VideoOptimisation.ROTATION_SUPPORT: {
				this._player.setVideoType(NativeVideoType.TEXTURE_VIEW);
				break;
			}
			case VideoOptimisation.SMOOTH_PLAYBACK:
			default: {
				this._player.setVideoType(NativeVideoType.SURFACE_VIEW);
				break;
			}
		}
	}

	/**
	 * @override
	 */
	_createViewPort(containerRect) {
		return new Viewport(containerRect, this._player);
	}

	/**
	 * @override
	 */
	_setState(state) {
		const shouldStartTimeUpdate = state === State.PLAYING;
		const shouldStopTimeUpdate = !shouldStartTimeUpdate;

		const stateEvents = {
			[State.LOADING]: this.EVENT_LOAD_START,
			[State.BUFFERING]: this.EVENT_BUFFERING,
			[State.PAUSED]: this.EVENT_PAUSE,
			[State.STOPPED]: this.EVENT_STOP,
			[State.PLAYING]: this.EVENT_PLAY
		};

		if (shouldStopTimeUpdate) {
			this._stopTimeUpdating();
		}

		super._setState(state);

		const stateEvent = stateEvents[state];
		if (stateEvent) {
			this._fireEvent(stateEvent);
		}

		if (shouldStartTimeUpdate) {
			this._startTimeUpdating();
		}

		if (state === State.DEINITED) {
			this._unbindListeners();
		}
	}

	/**
	 * Listen to native events
	 * @protected
	 */
	_bindListeners() {
		this._player.onEvent = this._onPlayerEvent.bind(this);
	}

	/**
	 * @protected
	 */
	_unbindListeners() {
		this._player.onEvent = () => {/* Noop */};
	}

	/**
	 * Native event handling
	 * @param {string} event
	 * @param {...?string} data event data
	 * @protected
	 */
	_onPlayerEvent(event, ...data) {
		const nativeEvent = /** @type {NativeEvent} */ (event);

		switch (nativeEvent) {
			case NativeEvent.TIMELINE_CHANGED: {
				if (!this._receivedTimelineChanged) {
					this._fireEvent(this.EVENT_DURATION_CHANGE, this.getDuration());
					this._receivedTimelineChanged = true;
				}
				break;
			}
			case NativeEvent.TRACKS_CHANGED: {
				if (!this._receivedTracksChanged) {
					this._fireEvent(this.EVENT_LOADED_META_DATA);
					this._receivedTracksChanged = true;
				}
				break;
			}
			case NativeEvent.READY: {
				const startingPlayback = data[0];

				if (startingPlayback) {
					this._setState(State.PLAYING);
				} else {
					this._setState(State.PAUSED);
				}

				if (!this._receivedReady) {
					this._receivedReady = true;
				}
				break;
			}
			case NativeEvent.STALLED: {
				if (this.getState() !== State.LOADING) {
					this._setState(State.BUFFERING);
				}
				break;
			}
			case NativeEvent.IDLE: {
				// IDLE may occasionally happen during media preparing,
				// so we have to distinguish it from IDLE after playback stop
				if (this._receivedReady) {
					this._setState(State.STOPPED);
				}
				break;
			}
			case NativeEvent.ENDED: {
				this._fireEvent(this.EVENT_ENDED);
				break;
			}
			case NativeEvent.POSITION_DISCONTINUITY: {
				this._setState(State.SEEKING);
				break;
			}
			case NativeEvent.ERROR: {
				this._onPlayerError(...data);
				break;
			}
			case NativeEvent.DESTROYED: {
				this._setState(State.DEINITED);
				break;
			}
			default: {
				console.warn(`Unhandled Android event ${nativeEvent}, arguments: ${data.join(', ')}`);
				break;
			}
		}
	}

	/**
	 * Receives mediaplayer errors
	 * @param {NativeError} error
	 * @param {string} message
	 * @protected
	 */
	_onPlayerError(error, message) {
		console.error(`Native player error ${error}: ${message}`);
		this._setState(State.ERROR);
		this._fireEvent(this.EVENT_ERROR, `Native player error ${error}: ${message}`);
	}

	/**
	 * Inits Timeout for triggering TIME_UPDATE
	 * @protected
	 */
	_initTimeUpdateTimeout() {
		this._timeUpdateTimeout = new Timeout(() => {
			this._fireEvent(this.EVENT_TIME_UPDATE, this.getPosition());
			this._timeUpdateTimeout.restart();
		}, this.TIME_UPDATE_INTERVAL);
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
}


/**
 * @enum {string}
 */
const NativeEvent = {
	READY: 'ready', // Fired with {boolean} - whether playback will start or not
	TIMELINE_CHANGED: 'timeline_changed',
	TRACKS_CHANGED: 'tracks_changed',
	ENDED: 'ended',
	DESTROYED: 'destroyed',
	STALLED: 'stalled',
	FIRST_FRAME: 'first_frame',
	IDLE: 'idle',
	POSITION_DISCONTINUITY: 'position_discontinuity',
	ERROR: 'error' // Fired with {number} error code and {?string} error description
};


/**
 * @enum {number}
 */
const NativeError = {
	CANT_CREATE_VIDEO_OBJECT: 1,
	UNINITIALIZED: 3,
	MEDIA_ERROR: 5,
	UNKNOWN: 100
};


/**
 * @enum {string}
 */
const NativeVideoType = {
	SURFACE_VIEW: 'SURFACE_VIEW',
	TEXTURE_VIEW: 'TEXTURE_VIEW'
};


/**
 * @enum {string}
 */
export const MediaType = {
	AUTO: 'auto',
	DASH: 'dash',
	HLS: 'hls',
	RTMP: 'rtmp'
};


/**
 * Android platforms has two options for video rendering engine,
 * unfortunately, one does not support rotations, while the other has poor performance.
 * It's up to application to choose which one to use.
 * Changing is only possible before play() is called.
 * @enum {symbol}
 */
export const VideoOptimisation = {
	ROTATION_SUPPORT: Symbol('Optimised for rotation support'),
	SMOOTH_PLAYBACK: Symbol('Optimised for smooth playback')
};
