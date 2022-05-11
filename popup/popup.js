'use strict';

class Popup {

    /**
     * ユーティリティ
     */
    #Util = null;

    /**
     * 設定値
     */
    #settings = {};

    /**
     * 初期処理
     */
    constructor() {

        (async () => {

            try {
                // utilモジュール
                this.#Util = (await import("/util/util.js")).default;

                // 設定取得
                this.#settings = await this.#Util.getStorage(this.#Util.STRAGE_KEY);

                // アクティブタブを取得
                const activeTabs = await chrome.tabs.query({"active": true, "currentWindow": true});
                const tab = activeTabs[0];

                // アクティブタブに、デバッガが接続されているか確認
                const attachedTabs = await chrome.debugger.getTargets();
                if (!attachedTabs.some(attachedTab => attachedTab.tabId === tab.id && attachedTab.attached)) {
                    // 接続されていない場合、スイッチOFF表示
                    // ※デバッガが手動でOFFにされた（一時的に無効になっているだけ）の場合は、ストレージの保存データは変更しない
                    this.#settings.trapOnOff = "";
                }

                // 画面初期値
                this.#setScreen();

                // イベントリスナ設定
                document.querySelectorAll(`input[name="trap-on-off"]`).forEach((e) => {
                    e.addEventListener("change", this.#trapSettingsChanged);
                });
                document.querySelectorAll(`input[name="trap-log-level"]`).forEach((e) => {
                    e.addEventListener("change", this.#trapSettingsChanged);
                });

            } catch (error) {
                console.log(`An error occured in constructor : ${error}`)
            }

        })();
    }

    /**
     * 画面初期値
     */
    #setScreen = () => {

        // 設定値を画面に反映
        this.#Util.setCheckboxValue("trap-on-off", this.#settings.trapOnOff);
        this.#Util.setCheckboxListValue("trap-log-level", ...this.#settings.trapLogLevels);
    }

    /**
     * 設定変更時
     */
    #trapSettingsChanged = (e) => {

        // 画面値をオブジェクトに設定
        this.#settings.trapOnOff = this.#Util.getCheckboxValue("trap-on-off") ?? "";
        this.#settings.trapLogLevels = this.#Util.getCheckboxListValue("trap-log-level") ?? [];

        // 設定を保存
        this.#Util.setStorage(this.#Util.STRAGE_KEY, this.#settings);

        // メッセージ送信
        (async () => {
            try {
                // メッセージ送信(To:background)
                await chrome.runtime.sendMessage({"command": "settings_changed"});
            } catch (error) {
                console.log(`An error occured in trapSettingsChanged : ${error}`)
            }
        })();

    }

};

const popup = new Popup();
