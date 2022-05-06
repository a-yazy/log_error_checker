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
    }

};

const popup = new Popup();
