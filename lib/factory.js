goog.provide('zb.device.platforms.android.factory.createDevice');
goog.require('zb.device.platforms.android.Device');


/**
 * @return {?zb.device.platforms.android.Device}
 */
zb.device.platforms.android.factory.createDevice = () => {
	const isAndroidTVPlatform = zb.device.platforms.android.Device.detect();

	if (isAndroidTVPlatform) {
		const videoContainer = app.getVideoContainer();
		return new zb.device.platforms.android.Device(videoContainer);
	}

	return null;
};
