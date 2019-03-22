/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2011-nowadays, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
goog.provide('zb.device.platforms.android.Video');
goog.require('zb.Timeout');
goog.require('zb.console');
goog.require('zb.device.AbstractVideo');
goog.require('zb.device.IVideo');
goog.require('zb.device.errors.UnsupportedFeature');
goog.require('zb.device.platforms.android.Viewport');


/**
 */
zb.device.platforms.android.Video = class extends zb.device.AbstractVideo {
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
		 * @type {zb.Timeout}
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

		this._setState(zb.device.IVideo.State.UNINITED);
		this._player.create();

		this._initViewPort();

		this._setState(zb.device.IVideo.State.INITED);
	}

	/**
	 * @override
	 */
	forward() {
		throw new zb.device.errors.UnsupportedFeature('Forward');
	}

	/**
	 * @override
	 */
	rewind() {
		throw new zb.device.errors.UnsupportedFeature('Rewind');
	}

	/**
	 * @override
	 */
	setPlaybackRate(rate) {
		throw new zb.device.errors.UnsupportedFeature('Playback rate setting');
	}

	/**
	 * @override
	 */
	getPlaybackRate() {
		throw new zb.device.errors.UnsupportedFeature('Playback rate getting');
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

		this._setState(zb.device.IVideo.State.LOADING);

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
	 * mediaType - zb.device.platforms.android.Video.MediaType
	 */
	setMediaOptions(options) {
		if (options['mediaType']) {
			this._player.setMediaType(options['mediaType']);
		}
	}

	/**
	 * @param {zb.device.platforms.android.Video.VideoOptimisation} type
	 */
	setVideoOptimisation(type) {
		const VideoOptimisation = zb.device.platforms.android.Video.VideoOptimisation;
		const NativeVideoType = zb.device.platforms.android.Video.NativeVideoType;

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
		return new zb.device.platforms.android.Viewport(containerRect, this._player);
	}

	/**
	 * @override
	 */
	_setState(state) {
		const shouldStartTimeUpdate = state === zb.device.IVideo.State.PLAYING;
		const shouldStopTimeUpdate = !shouldStartTimeUpdate;

		const stateEvents = {
			[zb.device.IVideo.State.LOADING]: this.EVENT_LOAD_START,
			[zb.device.IVideo.State.BUFFERING]: this.EVENT_BUFFERING,
			[zb.device.IVideo.State.PAUSED]: this.EVENT_PAUSE,
			[zb.device.IVideo.State.STOPPED]: this.EVENT_STOP,
			[zb.device.IVideo.State.PLAYING]: this.EVENT_PLAY
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

		if (state === zb.device.IVideo.State.DEINITED) {
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
		const Event = zb.device.platforms.android.Video.NativeEvent;
		const nativeEvent = /** @type {zb.device.platforms.android.Video.NativeEvent} */ (event);

		switch (nativeEvent) {
			case Event.TIMELINE_CHANGED: {
				if (!this._receivedTimelineChanged) {
					this._fireEvent(this.EVENT_DURATION_CHANGE, this.getDuration());
					this._receivedTimelineChanged = true;
				}
				break;
			}
			case Event.TRACKS_CHANGED: {
				if (!this._receivedTracksChanged) {
					this._fireEvent(this.EVENT_LOADED_META_DATA);
					this._receivedTracksChanged = true;
				}
				break;
			}
			case Event.READY: {
				const startingPlayback = data[0];

				if (startingPlayback) {
					this._setState(zb.device.IVideo.State.PLAYING);
				} else {
					this._setState(zb.device.IVideo.State.PAUSED);
				}

				if (!this._receivedReady) {
					this._receivedReady = true;
				}
				break;
			}
			case Event.STALLED: {
				if (this.getState() !== zb.device.IVideo.State.LOADING) {
					this._setState(zb.device.IVideo.State.BUFFERING);
				}
				break;
			}
			case Event.IDLE: {
				// IDLE may occasionally happen during media preparing,
				// so we have to distinguish it from IDLE after playback stop
				if (this._receivedReady) {
					this._setState(zb.device.IVideo.State.STOPPED);
				}
				break;
			}
			case Event.ENDED: {
				this._fireEvent(this.EVENT_ENDED);
				break;
			}
			case Event.POSITION_DISCONTINUITY: {
				this._setState(zb.device.IVideo.State.SEEKING);
				break;
			}
			case Event.ERROR: {
				this._onPlayerError(...data);
				break;
			}
			case Event.DESTROYED: {
				this._setState(zb.device.IVideo.State.DEINITED);
				break;
			}
			default: {
				zb.console.warn(`Unhandled Android event ${nativeEvent}, arguments: ${data.join(', ')}`);
				break;
			}
		}
	}

	/**
	 * Receives mediaplayer errors
	 * @param {zb.device.platforms.android.Video.NativeError} error
	 * @param {string} message
	 * @protected
	 */
	_onPlayerError(error, message) {
		zb.console.error(`Native player error ${error}: ${message}`);
		this._setState(zb.device.IVideo.State.ERROR);
		this._fireEvent(this.EVENT_ERROR, `Native player error ${error}: ${message}`);
	}

	/**
	 * Inits zb.Timeout for triggering TIME_UPDATE
	 * @protected
	 */
	_initTimeUpdateTimeout() {
		this._timeUpdateTimeout = new zb.Timeout(() => {
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
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Video.NativeEvent = {
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
zb.device.platforms.android.Video.NativeError = {
	CANT_CREATE_VIDEO_OBJECT: 1,
	UNINITIALIZED: 3,
	MEDIA_ERROR: 5,
	UNKNOWN: 100
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Video.NativeVideoType = {
	SURFACE_VIEW: 'SURFACE_VIEW',
	TEXTURE_VIEW: 'TEXTURE_VIEW'
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Video.MediaType = {
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
zb.device.platforms.android.Video.VideoOptimisation = {
	ROTATION_SUPPORT: Symbol('Optimised for rotation support'),
	SMOOTH_PLAYBACK: Symbol('Optimised for smooth playback')
};
