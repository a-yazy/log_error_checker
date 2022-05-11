'use strict';

// manifest.jsonで Service Worker の type=module に指定しているので利用可能
// moduleではない場合は importScript() を使用
// popupと共通のutilをimportしたいため、ここではESmoduleを使用
// https://numb86-tech.hatenablog.com/entry/2021/05/26/122742
import Util from "/util/util.js"

(() => {

    const filter = {
        url: [
            {
                urlContains: 'https://*',
            },
        ],
    };

    /**
     * 指定ページ(filter)へのナビゲーション発生時イベントのリスナ
     */
    chrome.webNavigation.onCommitted.addListener((details) => {
        // デバッガの設定
        setDebugger(details.tabId, details.url);
    });
    // }, filter);

    /**
     * メッセージリスナ
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

        // コマンドに応じた処理
        switch (message.command) {
            case 'settings_changed':
                // 設定変更
                setDebugger();
        }

        return true;
    });

    /**
     * デバッガの接続
     * @param {*} tabId
     * @param {*} url
     * @returns なし
     */
    async function setDebugger(tabId = null, url = null) {

        try {
            // tab情報
            // ※NOTE:
            // chrome.tabs.getはcb関数を指定するとPromiseが返らず、try～await～catchでエラートラップできない
            // cb関数なしのawaitで呼ぶとPromiseが返り、エラー時にexceptionがthrowされる状態になる
            // chrome.runtime.lastError で確認できるエラーもthrow対象
            let tab = null;
            if (tabId) {
                // idが指定されている場合、そのidのtab
                tab = await chrome.tabs.get(tabId);
            } else {
                // 指定がない場合、アクティブタブ
                const activeTabs = await chrome.tabs.query({"active": true});
                tab = activeTabs[0];
            }
            // 対象のtabが取得できない場合、何もしない
            if (!tab) {
                return;
            }

            // url情報
            // ※NOTE:
            // chrome://extensions/等、chrome独自ページを排除
            // chromeで新規タブを追加すると最初はアカウント情報を取りに行くhttp～のURLになる
            // それも除外したいのでここでタブのurl情報を確認している
            const targetUrl = url ?? tab.url ?? tab.pendingUrl ?? "";
            if (!targetUrl.startsWith("http")) {
                // webページ以外の場合、何もしない
                return;
            }

            // 設定値を取得
            const settings = await Util.getStorage(Util.STRAGE_KEY);

            // デバッガが接続されている対象を全て取得
            const attachedTabs = await chrome.debugger.getTargets();

            // 現在のタブに、デバッガが接続されているか確認
            const debuggerAttached = attachedTabs.some(attachedTab => attachedTab.tabId === tab.id && attachedTab.attached);

            // 設定値とデバッガの接続状況を確認
            if (debuggerAttached) {
                // デバッガ接続済
                if (settings.trapOnOff === "on") {
                    // 設定値＝ON：何もしない
                    return;
                } else {
                    // 設定値＝OFF：接続解除
                    await chrome.debugger.detach({"tabId": tab.id});
                    return;
                }
            } else {
                // デバッガ未接続
                if (settings.trapOnOff === "on") {
                    // 設定値＝ON：接続処置を継続
                } else {
                    // 設定値＝OFF：何もしない
                    return;
                }
            }

            // 現在のタブに、デバッガを接続
            await chrome.debugger.attach({"tabId": tab.id}, "1.3");

            // デバッガにコマンドを送信
            await chrome.debugger.sendCommand({"tabId": tab.id}, "Log.enable");
            await chrome.debugger.sendCommand({"tabId": tab.id}, "Runtime.enable");
            await chrome.debugger.sendCommand({"tabId": tab.id}, "Console.enable");
            await chrome.debugger.sendCommand({"tabId": tab.id}, "Network.enable");
            // await chrome.debugger.sendCommand({"tabId": tab.id}, "Audits.enable");

        } catch (error) {
            console.log(`An error occured in setDebugger : ${error}`)
        }
    }

    /**
     * デバッガーで発生するイベントのリスナ
     */
    chrome.debugger.onEvent.addListener((source, message, params) => {

        (async () => {

            try {
                const tabId = source.tabId;
                const logInfo = {};
                logInfo["type"] = "viewLogInformation";

                // 設定値を取得
                const settings = await Util.getStorage(Util.STRAGE_KEY);
                if (settings?.trapOnOff !== "on") {
                    // ONではない場合、何もしない
                    return;
                }

                // 情報取得
                switch (message) {
                    case "Network.webSocketFrameError":
                        // Fired when WebSocket message error occurs
                        logInfo["level"] = "error";
                        logInfo["message"] = `[${message}] ${params.errorMessage}`;

                        console.log(`[${message} params=${params}`);
                        break;

                    case "Network.loadingFailed":
                        // Fired when HTTP request has failed to load.
                        logInfo["level"] = "error";
                        logInfo["message"] = `[${message}] ${params.errorText}`;

                        console.log(`[${message} params=${params}`);
                        break;

                    // case "Audits.issueAdded":
                        // // リスク通知
                        // logInfo["level"] = "info";
                        // logInfo["message"] = `[${message}] ${params.issue.code}`;

                        // console.log(`[${message} params=${params}`);
                        // break;

                    case "Runtime.consoleAPICalled":
                        // コンソール呼び出し

                        // ログレベル判定
                        let logLevel = "info";
                        if (params.type === "Debug") {
                            logLevel = "verbose";
                        } else if (params.type === "Error" || params.type === "Assert") {
                            logLevel = "error";
                        } else if (params.type === "Warning") {
                            logLevel = "warning";
                        } else if (params.type === "Info" || params.type === "Log") {
                            logLevel = "info";
                        }
                        logInfo["level"] = logLevel;

                        // ログメッセージ編集
                        let logMessage = '';
                        if (params.args.length && params.args[0].unserializableValue) {
                            logMessage = params.args[0].unserializableValue;
                        } else if (params.args.length && (typeof params.args[0].value !== 'object' || params.args[0].value === null)) {
                            logMessage = String(params.args[0].value);
                        } else if (params.args.length && params.args[0].description) {
                            logMessage = params.args[0].description;
                        }
                        logInfo["message"] = `[${message}] ${logMessage}`;

                        // 抽出対象ではない場合、何もしない
                        if (!settings.trapLogLevels.includes(logInfo["level"])) {
                            return;
                        }

                        console.log(`[${message} params=${params}`);
                        break;

                    case "Runtime.exceptionThrown":
                        // 例外

                        // ログメッセージ編集処理
                        getExceptionMessage = (exceptionDetails) => {
                            if (exceptionDetails.exception)
                                return (exceptionDetails.exception.description || exceptionDetails.exception.value);
                            let message = exceptionDetails.text;
                            if (exceptionDetails.stackTrace) {
                                for (const callframe of exceptionDetails.stackTrace.callFrames) {
                                    const location = callframe.url +
                                        ':' +
                                        callframe.lineNumber +
                                        ':' +
                                        callframe.columnNumber;
                                    const functionName = callframe.functionName || '<anonymous>';
                                    message += `\n    at ${functionName} (${location})`;
                                }
                            }
                            return message;
                        };

                        logInfo["level"] = "error";
                        logInfo["message"] = `[${message}] ${getExceptionMessage(params.exceptionDetails)}`;

                        console.log(`[${message} params=${params}`);
                        break;

                    case "Log.entryAdded":
                        // ログ出力

                        logInfo["level"] = params.entry.level;
                        logInfo["message"] = `[${message}] ${params.entry.text}`;

                        // 抽出対象ではない場合、何もしない
                        if (!settings.trapLogLevels.includes(params.entry.level)) {
                            return;
                        }

                        console.log(`[${message} params=${params}`);
                        break;

                    default:
                        // 何もしない
                        return;
                }

                // 対象タブページにリソース挿入
                await Promise.all([
                    // 対象タブにcssを挿入
                    chrome.scripting.insertCSS({
                        "target": {"tabId": tabId},
                        "files": ["/contents/contents.css"]
                    }),
                    // 対象タブにjsを挿入
                    chrome.scripting.executeScript({
                        "target": {"tabId": tabId},
                        "files": ["/contents/contents.js"]
                    })
                ]);

                // メッセージ送信 (To:contents)
                await chrome.tabs.sendMessage(tabId, logInfo);

            } catch (error) {
                console.log(`An error occured in chrome.debugger.onEvent.addListener : ${error}`)
            }

        })();

    });

})();

// --------------------------------------------------
// ※参考
// --------------------------------------------------
// https://developer.chrome.com/docs/extensions/reference/debugger/
// https://www.webpuroguramingu-zhi-wen-ying-dashisutemu.com/ja/google-chrome-extension/chrome%e6%8b%a1%e5%bc%b5%e6%a9%9f%e8%83%bd%e3%81%8b%e3%82%89%e3%81%aehttp%e5%bf%9c%e7%ad%94%e3%82%92%e5%a4%89%e6%9b%b4%e3%81%99%e3%82%8b/1040459096/
// https://pastebin.com/EYnrjY7M
// https://github.com/KeithHenry/chromeExtensionAsync/issues/22
// https://qiita.com/Tommydevelop/items/87ce6f0a0da0416dc891
// https://numb86-tech.hatenablog.com/entry/2021/05/26/122742
// https://developer.chrome.com/docs/extensions/mv3/service_workers/#manifest
// https://stackoverflow.com/questions/61629590/in-puppeteer-how-to-capture-chrome-browser-log-in-the-console/61703803#61703803
// https://stackoverflow.com/questions/44231098/debugging-source-files-using-chrome-extension
// https://blog.recruit.co.jp/rtc/2020/10/02/chromepatrol/
// https://jpdebug.com/p/2257584
// https://bugs.chromium.org/p/chromium/issues/detail?id=334019
// https://stackoverflow.com/questions/69282540/how-can-i-get-the-console-log-of-the-current-website-opened-in-a-iframe-or-page
// https://jablogs.com/detail/108075
// https://github.com/markknol/console-log-viewer
// https://stackoverflow.com/questions/19846078/how-to-read-from-chromes-console-in-javascript
// https://developer.chrome.com/docs/extensions/reference/debugger/#method-sendCommand
// https://blog.recruit.co.jp/rtc/2020/10/02/chromepatrol/
// --------------------------------------------------
