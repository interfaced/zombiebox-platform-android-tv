package ru.interfaced.tvplatform;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.media.AudioManager;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;


public class MainActivity extends Activity {
    private WebView webView;

    private static String TAG = "MainActivity";

    private DeviceWebInterface deviceWebInterface;
    private PlayerWebInterface playerWebInterface;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        setContentView(R.layout.activity_main);

        playerWebInterface = new PlayerWebInterface(this);
        deviceWebInterface = new DeviceWebInterface(this);

        webView = (WebView)findViewById(R.id.webview);
        initWebView();

        if (BuildConfig.USE_BUNDLED_HTML) {
            webView.loadUrl("file:///android_asset/html/index.html");
        } else {
            webView.loadUrl(BuildConfig.APPLICATION_URL);
        }
    }

    private void setupScreen() {
        int flags =
                View.SYSTEM_UI_FLAG_LOW_PROFILE
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;

        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(flags);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "onResume");

        setupScreen();
        deviceWebInterface.resume();
        playerWebInterface.resume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "onPause");

        deviceWebInterface.suspend();
        playerWebInterface.suspend();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        Log.d(TAG, "configuration changed, new keyboard type: " + newConfig.keyboard);
    }

    private void initWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.WEBVIEW_DEBUG);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccessFromFileURLs(BuildConfig.USE_BUNDLED_HTML);
        webSettings.setAllowUniversalAccessFromFileURLs(BuildConfig.USE_BUNDLED_HTML);

        webView.setInitialScale(1);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.SINGLE_COLUMN);
        webSettings.setSupportZoom(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setBuiltInZoomControls(false);

        webView.setBackgroundColor(Color.TRANSPARENT);

        webView.clearCache(true);
        webView.setWebViewClient(new WebViewClient());

        webView.addJavascriptInterface(playerWebInterface, getString(R.string.player_interface));
        webView.addJavascriptInterface(deviceWebInterface, getString(R.string.device_interface));
    }

    public void notifyWebView(String context, String event, @Nullable JSONArray arguments, final @Nullable ValueCallback<String> callback) {
        String interfaceString = String.format("window.%s.onEvent", context);
        String eventString = JSONObject.quote(event);
        String argumentsString = "undefined";

        if (arguments != null && arguments.length() > 0) {
            try {
                argumentsString = arguments.join(", ");
            } catch (JSONException e) {
                e.printStackTrace();
                Log.e(TAG, e.getMessage());
            }
        }

        final String call = String.format("%s && %s(%s, %s)", interfaceString, interfaceString, eventString, argumentsString);

        webView.post(new Runnable() {
            @Override
            public void run() {
//                Log.d(TAG, String.format("Evaluating JS: %s", call));
                webView.evaluateJavascript(call, callback);
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack() && event.getRepeatCount() == 0) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        int action = event.getAction();

        Integer mouseActions[] = {
            MotionEvent.ACTION_MOVE,
            MotionEvent.ACTION_HOVER_MOVE,
            MotionEvent.ACTION_HOVER_ENTER,
            MotionEvent.ACTION_HOVER_EXIT
        };

        if (Arrays.asList(mouseActions).contains(action)) {
            deviceWebInterface.onMouseSuspicion();
        };

        return false;
    };
}
