import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { destination, retryPage, websiteOrigin } from "../lib/navigation";
import { initialLoad, loadState } from "../lib/load-state";

// EXPO_PUBLIC values ship to the device. Only the website address belongs here.
let website = "";
let configurationError = "";
try {
  website = websiteOrigin(process.env.EXPO_PUBLIC_REWEAR_URL);
} catch {
  configurationError =
    "The preview needs a valid public HTTPS website address. Check mobile/.env and restart Expo.";
}
export default function RewearWebView() {
  const dark = useColorScheme() === "dark";
  const palette = dark
    ? {
        background: "#111c18",
        surface: "#1c2b24",
        ink: "#e9f3e6",
        muted: "#b6c7b5",
        border: "#405344",
      }
    : {
        background: "#fffdf7",
        surface: "#ffffff",
        ink: "#163e32",
        muted: "#58655b",
        border: "#d7dfd0",
      };
  const web = useRef<WebView>(null);
  const [load, dispatch] = useReducer(loadState, initialLoad);
  const [source, setSource] = useState(website);
  const [instance, setInstance] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const lastPage = useRef(website);
  const topFrame = useRef(website);
  const externalInFlight = useRef<string | null>(null);
  const error = configurationError || load.message;
  const openExternal = useCallback(async (url: string) => {
    if (
      destination(url, website) !== "external" ||
      externalInFlight.current === url
    )
      return;
    externalInFlight.current = url;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Could not open this link",
        "Try again, or use Open in browser to continue on the website.",
      );
    } finally {
      externalInFlight.current = null;
    }
  }, []);
  const navigate = useCallback(
    (url: string, popup = false) => {
      const kind = destination(url, website);
      if (kind === "internal") {
        if (popup) {
          setSource(url);
          setInstance((n) => n + 1);
          dispatch({ type: "start" });
          return false;
        }
        return true;
      }
      if (kind === "blank") return !popup;
      if (kind === "external") {
        dispatch({ type: "finish" });
        void openExternal(url);
        return false;
      }
      return false;
    },
    [openExternal],
  );
  const navigationChanged = (state: WebViewNavigation) => {
    topFrame.current = state.url;
    setCanGoBack(state.canGoBack);
    const page = retryPage(state.url, website);
    if (page) lastPage.current = page;
  };
  const restart = (url = lastPage.current) => {
    lastPage.current = url;
    topFrame.current = url;
    setSource(url);
    setCanGoBack(false);
    dispatch({ type: "start" });
    setInstance((n) => n + 1);
  };
  const back = useCallback(() => {
    if (canGoBack) {
      web.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", back);
    return () => listener.remove();
  }, [back]);
  useEffect(() => {
    if (load.phase !== "loading" || configurationError) return;
    const timer = setTimeout(
      () =>
        dispatch({
          type: "error",
          message:
            "The website is taking too long to respond. Check your connection, then retry.",
        }),
      30000,
    );
    return () => clearTimeout(timer);
  }, [load.phase, load.attempt, instance]);
  const browser = async () => {
    try {
      await Linking.openURL(lastPage.current);
    } catch {
      Alert.alert(
        "Browser unavailable",
        "Open the Rewear website in Safari to continue.",
      );
    }
  };
  const button = (title: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: palette.border,
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
      ]}
    >
      <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 13 }}>
        {title}
      </Text>
    </Pressable>
  );
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={["top", "right", "bottom", "left"]}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={[styles.chrome, { borderBottomColor: palette.border }]}>
        <Text
          style={[styles.brand, { color: palette.ink }]}
          accessibilityRole="header"
        >
          Rewear <Text style={styles.preview}>preview</Text>
        </Text>
        <Text style={[styles.caption, { color: palette.muted }]}>
          Website in an app · existing test payments
        </Text>
        <View style={styles.tools}>
          {button(
            "Back",
            () => {
              back();
            },
            !canGoBack || !!configurationError,
          )}
          {button("Home", () => restart(website), !!configurationError)}
          {button("Reload", () => restart(), !!configurationError)}
          {button(
            "Open in browser",
            () => {
              void browser();
            },
            !!configurationError,
          )}
        </View>
      </View>
      <View style={[styles.content, { backgroundColor: palette.surface }]}>
        {!configurationError && (
          <WebView
            key={instance}
            ref={web}
            source={{ uri: source }}
            style={[styles.web, { backgroundColor: palette.surface }]}
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={(request) => {
              if (request.isTopFrame === false) {
                const kind = destination(request.url, website);
                return (
                  kind === "internal" ||
                  kind === "blank" ||
                  (kind === "external" && request.url.startsWith("https://"))
                );
              }
              const allow = navigate(request.url);
              if (allow) topFrame.current = request.url;
              return allow;
            }}
            onOpenWindow={(event) =>
              navigate(event.nativeEvent.targetUrl, true)
            }
            onNavigationStateChange={navigationChanged}
            onLoadStart={(event) => {
              topFrame.current = event.nativeEvent.url;
              dispatch({ type: "start" });
            }}
            onLoadEnd={() => dispatch({ type: "finish" })}
            onError={() =>
              dispatch({
                type: "error",
                message:
                  "Rewear could not connect. Check your internet connection or try the website in Safari.",
              })
            }
            onHttpError={(event) => {
              if (event.nativeEvent.url === topFrame.current)
                dispatch({
                  type: "error",
                  message: `The website returned HTTP ${event.nativeEvent.statusCode}. Retry, or open it in your browser to check its deployment.`,
                });
            }}
            onContentProcessDidTerminate={() =>
              dispatch({
                type: "error",
                message:
                  "The website process stopped. Reload the page to continue.",
              })
            }
            onRenderProcessGone={() => {
              dispatch({
                type: "error",
                message:
                  "The website process stopped. Reload the page to continue.",
              });
            }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={false}
            cacheEnabled={false}
            incognito={false}
            mixedContentMode="never"
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            setSupportMultipleWindows
            allowsBackForwardNavigationGestures
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction
            webviewDebuggingEnabled={__DEV__}
          />
        )}{" "}
        {load.phase === "loading" && !configurationError && (
          <View
            style={[
              styles.loading,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator color={dark ? "#b7ed83" : "#08714e"} />
            <Text style={{ color: palette.ink }}>Connecting to Rewear…</Text>
          </View>
        )}
        {error && (
          <View
            style={[styles.recovery, { backgroundColor: palette.surface }]}
            accessibilityViewIsModal
          >
            <Text
              accessibilityRole="header"
              style={[styles.errorTitle, { color: palette.ink }]}
            >
              Let’s reconnect.
            </Text>
            <Text
              accessibilityRole="alert"
              style={[styles.errorMessage, { color: palette.muted }]}
            >
              {error}
            </Text>
            {!configurationError && (
              <>
                {button("Retry connection", () => restart())}
                {button("Open website in browser", () => {
                  void browser();
                })}
              </>
            )}
            <Text style={[styles.privacy, { color: palette.muted }]}>
              Nothing is queued for later payment. Check your order before
              starting another checkout.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  chrome: {
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { fontSize: 21, fontWeight: "800" },
  preview: { fontSize: 13, fontWeight: "400" },
  caption: { fontSize: 11, marginTop: 2, marginBottom: 9 },
  tools: { flexDirection: "row", gap: 6 },
  button: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  content: { flex: 1 },
  web: { flex: 1 },
  loading: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 13,
  },
  recovery: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 14,
  },
  errorTitle: { fontSize: 24, fontWeight: "700" },
  errorMessage: { textAlign: "center", fontSize: 15, lineHeight: 23 },
  privacy: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 12 },
});
