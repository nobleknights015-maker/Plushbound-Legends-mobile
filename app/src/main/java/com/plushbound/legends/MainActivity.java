package com.plushbound.legends;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final String TAG = "PlushboundEditor";
    private static final int FILE_CHOOSER_REQUEST = 4201;
    private static final int READY_RETRY_LIMIT = 40;
    private static final long READY_RETRY_DELAY_MS = 500L;
    private static final String EDITOR_URL =
            "https://appassets.androidplatform.net/assets/tools/editor/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileChooser;
    private int readyChecks;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF120D14);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                readyChecks = 0;
                Log.i(TAG, "PAGE_STARTED " + url);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "PAGE_FINISHED " + url);
                super.onPageFinished(view, url);
                if (EDITOR_URL.equals(url)) {
                    verifyEditorReady();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                Log.e(TAG, "RESOURCE_ERROR " + request.getUrl() + " code=" + error.getErrorCode()
                        + " description=" + error.getDescription());
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onReceivedHttpError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceResponse errorResponse) {
                Log.e(TAG, "HTTP_ERROR " + request.getUrl() + " status=" + errorResponse.getStatusCode()
                        + " reason=" + errorResponse.getReasonPhrase());
                super.onReceivedHttpError(view, request, errorResponse);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = "CONSOLE_" + consoleMessage.messageLevel()
                        + " " + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber()
                        + " " + consoleMessage.message();
                if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Log.e(TAG, message);
                } else if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.WARNING) {
                    Log.w(TAG, message);
                } else {
                    Log.i(TAG, message);
                }
                return true;
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (pendingFileChooser != null) {
                    pendingFileChooser.onReceiveValue(null);
                }
                pendingFileChooser = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    pendingFileChooser = null;
                    return false;
                }
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);

        setContentView(webView);
        if (savedInstanceState == null) {
            webView.loadUrl(EDITOR_URL);
        } else if (webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(EDITOR_URL);
        }
    }

    private void verifyEditorReady() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "Boolean(window.__PLUSHBOUND_EDITOR_MODULE_READY__)",
                value -> {
                    if ("true".equals(value)) {
                        Log.i(TAG, "PLUSHBOUND_EDITOR_READY");
                        return;
                    }
                    readyChecks++;
                    if (readyChecks < READY_RETRY_LIMIT && webView != null) {
                        webView.postDelayed(this::verifyEditorReady, READY_RETRY_DELAY_MS);
                    } else {
                        Log.e(TAG, "PLUSHBOUND_EDITOR_NOT_READY checks=" + readyChecks
                                + " url=" + (webView == null ? "destroyed" : webView.getUrl()));
                    }
                });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileChooser == null) {
            return;
        }
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        pendingFileChooser.onReceiveValue(result);
        pendingFileChooser = null;
    }

    @Override
    protected void onDestroy() {
        if (pendingFileChooser != null) {
            pendingFileChooser.onReceiveValue(null);
            pendingFileChooser = null;
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
