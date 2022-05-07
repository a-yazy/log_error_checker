'use strict';
{
    // メッセージを受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

        switch (message["type"]) {
            case "viewLogInformation":
                // ログ情報表示
                viewLogInformation(message, sender, sendResponse);
                break;
        }

        return;
    });

    function viewLogInformation(message, sender, sendResponse) {

        try {
            const logInfo = message;

            // 出力パネル
            let container = document.querySelector(".logErrorCheckerResult");
            if (!container) {

                // templateを作成
                const template = document.createElement("template");
                template.innerHTML =
                    `<div class="logErrorCheckerResult">
                        <div class="logErrorCheckerResult__info">
                        </div>
                        <div class="logErrorCheckerResult__msg">
                            この通知は Log & Error Checker が出しています。<br>
                            通知を出したくない場合は、拡張機能「Log & Error Checker」を無効にしてください。<br>
                            ダブルクリックでこの通知を閉じます。<br>
                        </div>
                    </div>`;

                // templateを複製
                const divFragment = template.content.cloneNode(true);

                // documentに追加
                document.body.prepend(divFragment);
                container = document.querySelector(".logErrorCheckerResult");

                // イベントリスナ追加
                container.addEventListener("dblclick", (e) => {
                    const logPanel = e.target.closest(".logErrorCheckerResult__log");
                    if (logPanel) {
                        // 個別のメッセージがクリックされた場合、メッセージを削除
                        logPanel.remove();
                    } else {
                        // 個別のメッセージ以外がクリックされた場合、全体を削除
                        container.remove();
                    }
                });
            }

            // ログ内容
            let logMessage = "";
            if (logInfo["level"] === "exception") {
                logMessage = `エラーが発生しました。<br>${logInfo["message"]}`;
            } else {
                logMessage = `${logInfo["level"]} ログが出力されました。<br>${logInfo["message"]}`
            }
            const msgHtml = `<div class="logErrorCheckerResult__log" title="ダブルクリックでこのログを消します。">${logMessage}</div>`;

            // ログ内容追加
            container.querySelector(".logErrorCheckerResult__info").insertAdjacentHTML("afterbegin", msgHtml);

            sendResponse();
            return;

        } catch (error) {
            // 何もしない
            // ※NOTE:ここでログを出力すると無限ループにはまる
        }
    }
}
