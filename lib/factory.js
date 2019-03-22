import app from 'generated/app';
import Device from './device';


/**
 * @return {?Device}
 */
const createDevice = () => {
	const isAndroidTVPlatform = Device.detect();

	if (isAndroidTVPlatform) {
		const videoContainer = app.getVideoContainer();
		return new Device(videoContainer);
	}

	return null;
};

export default createDevice;
