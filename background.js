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
                urlMatches: 'https://*',
            },
        ],
    };

    /**
     * 指定ページ(filter)へのナビゲーション発生時イベントのリスナ
     */
    chrome.webNavigation.onBeforeNavigate.addListener((details) => {

        // webページ以外の場合、何もしない
        if (!details.url.startsWith("http")) {
            return;
        }

        (async () => {

            try {
                // tab情報
                // ※NOTE:
                // chrome.tabs.getはcb関数を指定するとPromiseが返らず、try～await～catchでエラートラップできない
                // cb関数なしのawaitで呼ぶとPromiseが返り、エラー時にexceptionがthrowされる状態になる
                // chrome.runtime.lastError で確認できるエラーもthrow対象
                const tabId = details.tabId;
                const tab = await chrome.tabs.get(tabId);

                // url情報
                // ※NOTE:
                // chromeで新規タブを追加すると最初はアカウント情報を取りに行くhttp～のURLになる
                // それも除外したいのでここで改めてタブのurl情報を確認している
                const url = tab.url ?? tab.pendingUrl ?? "";
                if (!url.startsWith("http")) {
                    // webページ以外の場合、何もしない
                    return;
                }

                // 設定値を取得
                const settings = await Util.getStorage(Util.STRAGE_KEY);
                if (settings.trapOnOff !== "on") {
                    // ONではない場合、何もしない
                    return;
                }

                // デバッガが接続されている対象を全て取得
                const attachedTabs = await chrome.debugger.getTargets();

                // 現在のタブに、デバッガが接続されているか確認
                if (attachedTabs.some(attachedTab => attachedTab.tabId === tabId && attachedTab.attached)) {
                    // すでにデバッガが接続されている場合、何もしない
                    return;
                }

                // 現在のタブに、デバッガを接続
                // ※NOTE:cb関数を指定しない理由はchrome.tabs.getと同じ
                await chrome.debugger.attach({"tabId": tabId}, "1.3");

                // デバッガにコマンドを送信
                // ※NOTE:cb関数を指定しない理由はchrome.tabs.getと同じ
                await chrome.debugger.sendCommand({"tabId": tabId}, "Log.enable");
                await chrome.debugger.sendCommand({"tabId": tabId}, "Runtime.enable");

            } catch (error) {
                console.log(`An error occured in chrome.webNavigation.onCompleted.addListener : ${error} ${details.url}`)
            }

        })();

    // }, filter);
    });

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
                    case "Runtime.exceptionThrown":
                        // エラー
                        const {timestamp, exceptionDetails} = params;
                        logInfo["level"] = "exception";
                        logInfo["message"] = exceptionDetails.exception.description;
                        console.log(`params(${message})`, exceptionDetails.exception.description);
                        break;

                    case "Log.entryAdded":
                        // ログ出力
                        const {entry} = params;
                        logInfo["level"] = entry.level;
                        logInfo["message"] = entry.text;
                        console.log(`params(${message})`, entry.text);
                        // 抽出対象ではない場合、何もしない
                        if (!settings.trapLogLevels.includes(entry.level)) {
                            return;
                        }
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
// --------------------------------------------------
