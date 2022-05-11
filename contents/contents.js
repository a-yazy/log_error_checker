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
                            ページのログの一部を「Log & Error Checker」が表示しています。<br>
                            気になるログがあったら、開発者ツールで具体的な内容をご確認ください。（メッセージは一致しない場合があります）<br>
                            この通知を表示したくない場合は、拡張機能「Log & Error Checker」を無効にしてください。<br>
                            ダブルクリックで通知を閉じます。<br>
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
            const msgHtml = `<div class="logErrorCheckerResult__log logErrorCheckerResult__level-${logInfo["level"]}" title="ダブルクリックでこのログを消します。">${logInfo["message"]}</div>`;

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
