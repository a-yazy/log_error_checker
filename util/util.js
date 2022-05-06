/**
 * 汎用ユーティリティ
 */
export default class Util {

    /**
     * ストレージキー
     */
    static STRAGE_KEY = "log_error_checker_settings";

    /**
     * ランタイムエラーチェック
     * @returns ランタイムエラーか
     */
    static isRuntimeError(source = "unknown", isThrow = false) {
        // Check API for any errors thrown
        if (chrome.runtime.lastError) {
            const msg = `chrome.runtime.lastError(${source}): ${chrome.runtime.lastError.message}`;
            console.log(msg);
            if (isThrow) {
                throw msg;
            } else {
                return true;
            }
        }
        return false;
    }

    /**
     * ローカルストレージからデータ(JSON)を取得し、parseして返す
     * @param {*} storageKey ストレージキー
     * @param {*} defaultObj 取得できなかった場合に返す値
     * @returns ストレージに保存されているデータ
     */
    static async getStorage(storageKey = Util.STRAGE_KEY, defaultObj = { trapOnOff : "on", trapLogLevels : ["error", "warning", "info"]}) {

        // ローカルストレージからデータ(JSON)を取得し、parseして返す
        // （存在しない場合は空のオブジェクト）
        const storageData = await chrome.storage.local.get(storageKey);
        if (storageData?.hasOwnProperty(storageKey)) {
            return JSON.parse(storageData[storageKey]) ?? defaultObj;
        } else {
            return defaultObj;
        }
    }

    /**
     * データをJSONに変換してローカルストレージに保存（非同期で実施）
     * @param {*} storageKey ストレージキー
     * @param {*} targetObj 保存するデータ
     */
    static setStorage(storageKey = UtilSTRAGE_KEY, targetObj = null) {

        // 非同期で実施
        (async() => {
            if (targetObj) {
                await chrome.storage.local.set({[storageKey]: JSON.stringify(targetObj)});
            } else {
                await chrome.storage.local.remove(storageKey);
            }
        })();
    }

    /**
     * チェックボックスに値を設定する
     * @param {*} checkboxName チェックボックスのname
     * @param  {...any} values 設定する値（複数）
     * @returns 選択されたチェックボックス（要素配列）
     */
    static setCheckboxListValue(checkboxName, ...values) {

        const elements = Array.from(document.querySelectorAll(`input[name="${checkboxName}"]`));

        const selectedCheckboxes = [];
        elements.forEach(element => {
            element.checked = false;
            if (values.some(value => value === element.value)) {
                element.checked = true;
                selectedCheckboxes.push(element);
            }
        });

        return selectedCheckboxes;
    }

    /**
     * チェックボックスの選択値を取得する
     * @param {*} checkboxName チェックボックスのname
     * @returns 選択されているチェックボックスの値（選択なしの場合はnull、１つ以上の場合は値の配列）
     */
    static getCheckboxListValue(checkboxName) {

        const elements = Array.from(document.querySelectorAll(`input[name="${checkboxName}"]`));
        const selectedElements = elements.filter(element => element.checked);

        // 選択されているチェックボックスの数によって戻り値が変わる
        if (selectedElements.length === 0) {
            return null;
        } else {
            return selectedElements.map(selectedElement => selectedElement.value);
        }
    }

    /**
     * チェックボックスに値を設定する
     * @param {*} checkboxName チェックボックスのname
     * @param {*} value 設定する値（複数）
     * @returns 選択されたチェックボックス
     */
    static setCheckboxValue(checkboxName, value) {

        const element = document.querySelector(`input[name="${checkboxName}"]`);

        if (value === element.value) {
            element.checked = true;
        } else {
            element.checked = false;
        }

        return element;
    }

    /**
     * チェックボックスの選択値を取得する
     * @param {*} checkboxName チェックボックスのname
     * @returns 選択されているチェックボックスの値（選択なしの場合はnull、選択ありの場合は値）
     */
    static getCheckboxValue(checkboxName) {

        const element = document.querySelector(`input[name="${checkboxName}"]`);

        if (element.checked) {
            return element.value;
        } else {
            return null;
        }
    }
}