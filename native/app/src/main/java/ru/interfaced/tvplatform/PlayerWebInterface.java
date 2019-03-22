package ru.interfaced.tvplatform;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import android.support.annotation.IntRange;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.SurfaceView;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.widget.RelativeLayout;

import com.google.android.exoplayer2.ExoPlaybackException;
import com.google.android.exoplayer2.ExoPlayerFactory;
import com.google.android.exoplayer2.PlaybackParameters;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.SimpleExoPlayer;
import com.google.android.exoplayer2.Timeline;
import com.google.android.exoplayer2.source.ExtractorMediaSource;
import com.google.android.exoplayer2.source.MediaSource;
import com.google.android.exoplayer2.source.TrackGroupArray;
import com.google.android.exoplayer2.source.dash.DashMediaSource;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;
import com.google.android.exoplayer2.trackselection.TrackSelectionArray;
import com.google.android.exoplayer2.ui.AspectRatioFrameLayout;
import com.google.android.exoplayer2.upstream.DataSource;
import com.google.android.exoplayer2.upstream.DefaultDataSourceFactory;
import com.google.android.exoplayer2.util.Util;
import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.video.VideoListener;

import org.json.JSONArray;
import java.util.Locale;


class PlayerWebInterface implements
        Player.EventListener,
        VideoListener {
    private Context context;
    private AspectRatioFrameLayout videoContainer;
    private RelativeLayout viewport;
    private SurfaceView videoSurfaceView;
    private TextureView videoTextureView;
    private View currentVideoView;
    private View shutterView;
    private String uri;

    private SimpleExoPlayer player;
    private boolean playbackStateBeforeSuspend;

    private Format desiredVideoFormat = null;

    private static final String TAG = "PlayerWebInterface";

    private enum Event {
        ERROR,
        DESTROYED,
        TIMELINE_CHANGED,
        TRACKS_CHANGED,
        FIRST_FRAME,
        IDLE,
        STALLED,
        READY,
        POSITION_DISCONTINUITY,
        ENDED
    }

    private enum Format {
        AUTO,
        DASH,
        HLS,
        SS,
        RTMP
    }

    private enum InterfaceError {
        CANT_CREATE_VIDEO_OBJECT (1, "Can't create video object"),
        UNINITIALIZED (3, "Video is not initialized"),
        MEDIA_ERROR(5, "Media Error"),
        UNKNOWN (100, "Unknown error");

        private final int code;
        private final String message;

        InterfaceError(int code, String message) {
            this.code = code;
            this.message = message;
        }

        public int getCode() { return code; }
        public String getMessage() { return message; }
    }

    private enum Orientation {
        LANDSCAPE (0),
        LANDSCAPE_INVERSE (180),
        PORTRAIT (90),
        PORTRAIT_INVERSE (270);

        public final int angle;

        Orientation(int angle) {
            this.angle = angle;
        }
    }

    private enum ResizeMode {
        FIT (AspectRatioFrameLayout.RESIZE_MODE_FIT),
        FILL (AspectRatioFrameLayout.RESIZE_MODE_FILL),
        DEFAULT (AspectRatioFrameLayout.RESIZE_MODE_FIT),
        FIXED_HEIGHT (AspectRatioFrameLayout.RESIZE_MODE_FIXED_HEIGHT),
        FIXED_WIDTH (AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH),
        FIXED_MIN (-897513599), // Chosen by mashing numpad. Guaranteed to be unique
        FIXED_MAX (AspectRatioFrameLayout.RESIZE_MODE_FIT);

        public final int mode;

        ResizeMode(int mode) {
            this.mode = mode;
        }
    }

    private enum VideoType {
        SURFACE_VIEW,
        TEXTURE_VIEW;
    }

    PlayerWebInterface(Context aContext) {
        context = aContext;
        Activity mainActivity = (Activity) context;

        viewport = (RelativeLayout) mainActivity.findViewById(R.id.viewport);
        videoContainer = (AspectRatioFrameLayout) mainActivity.findViewById(R.id.videoContainer);
        videoSurfaceView = (SurfaceView) mainActivity.findViewById(R.id.videoSufraceView);
        videoTextureView = (TextureView) mainActivity.findViewById(R.id.videoTextureView);
        shutterView = (View) mainActivity.findViewById(R.id.shutter);
        uri = "";
    }

    private void dispatchEvent(Event event, @Nullable JSONArray params, @Nullable ValueCallback<String> callback) {
        ((MainActivity)context).notifyWebView(context.getString(R.string.player_interface), event.toString().toLowerCase(), params, callback);
    }

    private void dispatchEvent(Event event, @Nullable JSONArray params) {
        dispatchEvent(event, params, null);
    }

    private void dispatchEvent(Event event) {
        dispatchEvent(event, null, null);
    }

    private void dispatchError(InterfaceError interfaceError, @Nullable String additionalMessage) {
        JSONArray arguments = new JSONArray();
        arguments.put(interfaceError.getCode());

        String message = interfaceError.getMessage();
        if (additionalMessage != null) {
            message += ": ";
            message += additionalMessage;
        }

        arguments.put(message);

        dispatchEvent(Event.ERROR, arguments);
    }

    private void dispatchError(InterfaceError interfaceError) {
        dispatchError(interfaceError, null);
    }

    private void onFatalError(InterfaceError interfaceError, @Nullable String message) {
        dispatchError(interfaceError, message);

        Log.e(TAG, "Fatal error " + interfaceError + ": " + message);

        if (player != null) {
            player.stop();
            player.seekToDefaultPosition();
            hideVideo();
        }
    }

    private void onFatalError(InterfaceError interfaceError, Throwable exception) {
        Throwable cause = null;
        Throwable result = exception;
        String message = "";

        while(null != (cause = result.getCause())  && (result != cause) ) {
            if (result.getMessage() != null) {
                message += result.getMessage();
                message += ". ";
            }
            result = cause;
        }

        onFatalError(interfaceError, message);
    }

    private void onFatalError(InterfaceError interfaceError) {
        onFatalError(interfaceError, (String) null);
    }

    private boolean assertPlayer() {
        if (player == null) {
            onFatalError(InterfaceError.UNINITIALIZED);
            return false;
        }

        return true;
    }

    void suspend() {
        if (player == null) {
            return;
        }

        playbackStateBeforeSuspend = player.getPlayWhenReady();
        player.setPlayWhenReady(false);
    }

    void resume() {
        if (player == null) {
            return;
        }

        player.setPlayWhenReady(playbackStateBeforeSuspend);
    }

    private void hideVideo() {
        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "Hiding video");
                shutterView.setVisibility(View.VISIBLE);
            }
        });
    }

    private void showVideo() {
        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "Showing video");
                shutterView.setVisibility(View.INVISIBLE);
            }
        });
    }

    @JavascriptInterface
    public void create() {
        if (player != null) {
            dispatchError(InterfaceError.CANT_CREATE_VIDEO_OBJECT);
            return;
        }

        player = ExoPlayerFactory.newSimpleInstance(context);
        player.addListener(this);
        player.addVideoListener(this);
        player.setPlayWhenReady(false);
        switchToSurfaceView();
        hideVideo();
    }

    @JavascriptInterface
    public void setVideoType(String typeString) {
        Log.d(TAG, "Requested video type " + typeString);

        if (!assertPlayer()) {
            return;
        }
        if (player.getPlaybackState() != Player.STATE_IDLE) {
            onFatalError(InterfaceError.MEDIA_ERROR, "Cannot change video type after playback started.");
            return;
        }

        VideoType type;

        try {
            type = VideoType.valueOf(typeString.toUpperCase(Locale.US));
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Failed to parse video type \"" + typeString + "\", defaulting to " + VideoType.SURFACE_VIEW);
            type = VideoType.SURFACE_VIEW;
        }

        switch (type) {
            case TEXTURE_VIEW:
                switchToTextureView();
                break;
            case SURFACE_VIEW:
                switchToSurfaceView();
                break;
            default:
                Log.wtf(TAG, "Unknown video type " + type);
        }
    }

    @JavascriptInterface
    public String getVideoType() {
        if (currentVideoView == videoTextureView) {
            return VideoType.TEXTURE_VIEW.toString();
        } else if (currentVideoView == videoSurfaceView) {
            return VideoType.SURFACE_VIEW.toString();
        } else {
            Log.wtf(TAG, "Unknown video type " + currentVideoView.toString());
            return "";
        }
    }

    private void switchToSurfaceView() {
        if (currentVideoView == videoSurfaceView) {
            return;
        }
        Log.d(TAG, "Switching to SurfaceView");

        player.clearVideoTextureView(videoTextureView);
        player.setVideoTextureView(null);
        player.setVideoSurfaceView(videoSurfaceView);
        currentVideoView = videoSurfaceView;

        ((Activity) context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                videoSurfaceView.setVisibility(View.VISIBLE);
                videoTextureView.setVisibility(View.GONE);
                videoContainer.setRotation(0);
            }
        });
    }

    private void switchToTextureView() {
        if (currentVideoView == videoTextureView) {
            return;
        }
        Log.d(TAG, "Switching to TextureView");

        player.clearVideoSurfaceView(videoSurfaceView);
        player.setVideoSurfaceView(null);
        player.setVideoTextureView(videoTextureView);
        currentVideoView = videoTextureView;

        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                videoTextureView.setVisibility(View.VISIBLE);
                videoSurfaceView.setVisibility(View.GONE);
            }
        });
    }

    @JavascriptInterface
    public void setMediaType(String formatString) {
        Format format;

        try {
            format = Format.valueOf(formatString.toUpperCase(Locale.US));
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Failed to parse video format \"" + formatString + "\", defaulting to " + Format.AUTO);
            format = Format.AUTO;
        }

        desiredVideoFormat = format;
    }

    @JavascriptInterface
    public void setVideoURI(String uriString) {
        if (!assertPlayer()) {
            return;
        }

        Log.d(TAG, "Playing " + uriString);

        final Uri uri = Uri.parse(uriString);
        final MediaSource source = generateMediaSource(uri, desiredVideoFormat);

        player.prepare(source);
        this.uri = uriString;
    }

    @JavascriptInterface
    public String getVideoURI() {
        return uri;
    }

    private MediaSource generateMediaSource(Uri uri, Format format) {
        Log.d(TAG, "Generating media source for " + (format == null ? "automatic" : format));

        String userAgent = Util.getUserAgent(context, "ru.interfaced.ok");
        DataSource.Factory dataSourceFactory = new DefaultDataSourceFactory(context, userAgent);

        if (format == null || format == Format.AUTO) {
            String uriString = uri.toString().toLowerCase();
            if (uriString.endsWith(".m3u8")) {
                format = Format.HLS;
            } else if (uriString.endsWith(".mpd")) {
                format = Format.DASH;
            } else if (uriString.startsWith("rtmp://")) {
                format = Format.RTMP;
            } else  if (uriString.endsWith(".ism") || uriString.endsWith(".isml")) {
                format = Format.SS;
            } else {
                format = Format.AUTO;
            }

            Log.d(TAG, "Guessed stream format to be " + format);
        }

        switch (format) {
            case DASH:
                return new DashMediaSource.Factory(dataSourceFactory)
                        .createMediaSource(uri);
            case HLS:
                return new HlsMediaSource.Factory(dataSourceFactory)
                        .createMediaSource(uri);
            case RTMP:
            case SS:
                Log.e(TAG, "Unsupported format " + format); // TODO
            case AUTO:
            default: {
                return new ExtractorMediaSource.Factory(dataSourceFactory)
                        .createMediaSource(uri);
            }
        }
    }

    @JavascriptInterface
    public void start() {
        if (!assertPlayer()) {
            return;
        }

        player.setPlayWhenReady(true);
    }

    @JavascriptInterface
    public void pause() {
        if (!assertPlayer()) {
            return;
        }

        player.setPlayWhenReady(false);
    }

    @JavascriptInterface
    public void stop() {
        if (!assertPlayer()) {
            return;
        }

        player.stop();
        player.seekToDefaultPosition();
        hideVideo();
    }

    @JavascriptInterface
    public void restart() {
        if (!assertPlayer()) {
            return;
        }

        player.stop();
        player.seekToDefaultPosition();
        player.setPlayWhenReady(true);
    }

    @JavascriptInterface
    public float getDuration() {
        if (!assertPlayer()) {
            return 0;
        }

        return player.getDuration();
    }

    @JavascriptInterface
    public boolean isLiveStream() {
        return player.isCurrentWindowDynamic() || player.getDuration() == C.TIME_UNSET;
    }

    @JavascriptInterface
    public int getCurrentPosition() {
        if (!assertPlayer()) {
            return 0;
        }

        return (int) player.getCurrentPosition();
    }

    @JavascriptInterface
    public void seekTo(final int time) {
        if (!assertPlayer()) {
            return;
        }

        player.seekTo(time);
    }

    @JavascriptInterface
    public float getPlaybackRate() {
        // TODO
        return 1;
    }

    @JavascriptInterface
    public void setPlaybackRate(float rate) {
        // TODO
        // https://github.com/google/ExoPlayer/issues/26#issuecomment-288835803
    }

    // TODO: verify this volume api works nicely with android AudioManager
    @JavascriptInterface
    public @IntRange(from = 0, to = 100) int getVolume() {
        return (int) player.getVolume();
    }

    @JavascriptInterface
    public void setVolume(@IntRange(from = 0, to = 100) int percent) {
        player.setVolume(percent);
    }

    @JavascriptInterface
    public boolean getMuted() {
        return getVolume() == 0;
    }

    @JavascriptInterface
    public void setMuted(boolean mute) {
        setVolume(0);
    }

    @JavascriptInterface
    public void destroy() {
        if (!assertPlayer()) {
            return;
        }

        player.release();
        uri = "";
        player = null;
        currentVideoView = null;

        dispatchEvent(Event.DESTROYED);
    }

    @JavascriptInterface
    public void setArea(final int x, final int y, final int width, final int height) {
        if (!assertPlayer()) {
            return;
        }

        Log.d(TAG, "setArea " + x + " " + y + " " + width + " " + height);

        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ViewGroup.LayoutParams surfaceParams = viewport.getLayoutParams();
                surfaceParams.width = width;
                surfaceParams.height = height;
                ((ViewGroup.MarginLayoutParams)surfaceParams).setMargins(x, y, 0, 0);
                viewport.requestLayout();
            }
        });
    }

    @JavascriptInterface
    public void setOrientation(String orientationString) {
        if (!assertPlayer()) {
            return;
        }

        Orientation orientation;
        try {
            orientation = Orientation.valueOf(orientationString.toUpperCase(Locale.US));
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Failed to parse orientation  \"" + orientationString + "\", defaulting to " + Orientation.LANDSCAPE);
            orientation = Orientation.LANDSCAPE;
        }

        if (currentVideoView == videoSurfaceView && orientation != Orientation.LANDSCAPE) {
            Log.w(TAG, "Trying to rotate SurfaceView - this isn't going to work.");
            return;
        }

        int horizontalDimension = 0,
                verticalDimension = 0;
        switch (orientation) {
            case PORTRAIT:
            case PORTRAIT_INVERSE:
                horizontalDimension = videoContainer.getHeight();
                verticalDimension = videoContainer.getWidth();
                break;
            case LANDSCAPE:
            case LANDSCAPE_INVERSE:
                horizontalDimension = videoContainer.getWidth();
                verticalDimension = videoContainer.getHeight();
                break;
        }

        if (horizontalDimension == 0 && verticalDimension == 0) {
            return;
        }

        final float scale = Math.min(
                (float) viewport.getWidth() / horizontalDimension,
                (float) viewport.getHeight() / verticalDimension
        );

        final Orientation finalOrientation = orientation;
        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "Rotating to " + finalOrientation.angle + " with a scale of " + scale);

                videoContainer.setRotation(finalOrientation.angle);
                videoContainer.setScaleX(scale);
                videoContainer.setScaleY(scale);
                videoContainer.invalidate();
            }
        });
    }

    @JavascriptInterface
    public void setResizeMode(final String modeString) {
        if (!assertPlayer()) {
            return;
        }

        Log.d(TAG, "setResizeMode " + modeString);

        ResizeMode mode;
        try {
            mode = ResizeMode.valueOf(modeString.toUpperCase(Locale.US));
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Failed to parse resize mode \"" + modeString + "\", defaulting to " + ResizeMode.DEFAULT);
            mode = ResizeMode.DEFAULT;
        }

        if (mode == ResizeMode.FIXED_MIN) {
            int height = currentVideoView.getHeight();
            int width = currentVideoView.getWidth();

            if (width < height) {
                mode = ResizeMode.FIXED_WIDTH;
            } else {
                mode = ResizeMode.FIXED_HEIGHT;
            }

            Log.d(TAG, "Requested FIXED_MIN choosing " + mode + " (w:" + width + " h:" + height + ")");
        }

        final int finalMode = mode.mode;
        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                videoContainer.setResizeMode(finalMode);
            }
        });
    }

    @JavascriptInterface
    public void setAspectRatio(final float ratio) {
        if (!assertPlayer()) {
            return;
        }

        Log.d(TAG, "setAspectRatio " + ratio);

        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                videoContainer.setAspectRatio(ratio);
            }
        });
    }

    @Override
    public void onVideoSizeChanged(final int width, final int height, int unAppliedRotationDegrees, final float pixelWidthHeightRatio) {
        Log.d(TAG, "onVideoSizeChanged " +
                width + " " +
                height + " " +
                unAppliedRotationDegrees + " " +
                pixelWidthHeightRatio
        );

        final int containerWidth = viewport.getWidth();
        final int containerHeight = viewport.getHeight();

        float scale = Math.min(
                (float) containerHeight / height,
                (float) containerWidth / width
        );

        // No idea why this is necessary. Applying aspect ratio changes video position for some reasons
        // TODO: investigate
        final float positionCorrectionX = containerWidth / 2 - scale * width / 2;
        final float positionCorrectionY = containerHeight / 2 - scale * height / 2;

        ((Activity)context).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                videoContainer.setAspectRatio(width * pixelWidthHeightRatio / height);
                videoContainer.setX(positionCorrectionX);
                videoContainer.setY(positionCorrectionY);
            }
        });
    }

    @Override
    public void onSurfaceSizeChanged(int width, int height) {
        Log.d(TAG, "Surface size changed to" + width + "x" + height);
    }

    @Override
    public void onRenderedFirstFrame() {
        Log.d(TAG, "First frame of the video shown");
        dispatchEvent(Event.FIRST_FRAME);
        showVideo();
    }

    @Override
    public void onTimelineChanged(Timeline timeline, @Nullable Object manifest, int reason) {
        if (!timeline.isEmpty()) {
            dispatchEvent(Event.TIMELINE_CHANGED);
            Log.v(TAG, "onTimelineChanged; reason: " + reason);
        }
    }

    @Override
    public void onTracksChanged(TrackGroupArray trackGroups, TrackSelectionArray trackSelections) {
        dispatchEvent(Event.TRACKS_CHANGED);
        Log.v(TAG, "onTracksChanged");
    }

    @Override
    public void onLoadingChanged(boolean isLoading) {
//        Log.v(TAG, "onLoadingChanged " + isLoading);
    }

    @Override
    public void onPlayerStateChanged(boolean playWhenReady, int playbackState) {
        Log.d(TAG, "onPlayerStateChange " + playbackState);

        switch (playbackState) {
            case Player.STATE_IDLE: {
                dispatchEvent(Event.IDLE);
                break;
            }
            case Player.STATE_BUFFERING: {
                dispatchEvent(Event.STALLED);
                break;
            }
            case Player.STATE_READY: {
                JSONArray params = new JSONArray();
                params.put(playWhenReady);
                dispatchEvent(Event.READY, params);
                break;
            }
            case Player.STATE_ENDED: {
                dispatchEvent(Event.ENDED);
                break;
            }
        }
    }

    @Override
    public void onRepeatModeChanged(int repeatMode) {}

    @Override
    public void onShuffleModeEnabledChanged(boolean shuffleModeEnabled) {}

    @Override
    public void onPlayerError(ExoPlaybackException error) {
        Log.e(TAG, "onError: " + error.getMessage() + " cause: " + error.getCause());
        onFatalError(InterfaceError.MEDIA_ERROR, error);
        error.printStackTrace();
    }

    @Override
    public void onPositionDiscontinuity(int reason) {
        Log.v(TAG, "onPositionDiscontinuity; reason: " + reason);
        dispatchEvent(Event.POSITION_DISCONTINUITY);
    }

    @Override
    public void onPlaybackParametersChanged(PlaybackParameters playbackParameters) {
        Log.v(TAG, "PlaybackParametersChanged");
    }

    @Override
    public void onSeekProcessed() {}
}
