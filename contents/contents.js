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

            // ログ内容
            let logMessage = "";
            if (logInfo["level"] === "exception") {
                logMessage = `エラーが発生しました。<br>${logInfo["message"]}`;
            } else {
                logMessage = `${logInfo["level"]} ログが出力されました。<br>${logInfo["message"]}`
            }

            // templateを作成
            const template = document.createElement("template");
            template.innerHTML =
                `<div class="logErrorCheckerResult">
                    <div class="logErrorCheckerResult__info">
                        <div class="logErrorCheckerResult__log">
                            ${logMessage}
                        </div>
                        <div class="logErrorCheckerResult__close">×</div>
                    </div>
                    <div class="logErrorCheckerResult__msg">
                        この通知は Log & Error Checker が出しています。<br>
                        通知を出したくない場合は、拡張機能「Log & Error Checker」を無効にしてください。
                    </div>
                </div>`;

            // templateを複製
            const divFragment = template.content.cloneNode(true);

            // documentに追加
            document.body.prepend(divFragment);

            // イベントリスナ追加
            const closeLink = document.querySelector(".logErrorCheckerResult__close");

            closeLink.addEventListener("click", (e) => {
                e.currentTarget.closest(".logErrorCheckerResult")?.remove();
            });

            sendResponse();
            return;

        } catch (error) {
            // 何もしない
            // ※NOTE:ここでログを出力すると無限ループにはまる
        }
    }
}
