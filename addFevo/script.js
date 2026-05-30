// script.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("favorites-form");
  const messageDiv = document.getElementById("message");

  // プレビュー要素の取得
  const previewGroup = document.getElementById("preview-group");
  const previewName = document.getElementById("preview-name");
  const previewMainDescription = document.getElementById("preview-main-description");
  const previewSubDescription = document.getElementById("preview-sub-description");

  // フォームの各入力フィールドを取得
  const groupInput = document.getElementById("group");
  const nameInput = document.getElementById("name");
  const mainDescriptionInput = document.getElementById("main-description");
  const subDescriptionInput = document.getElementById("sub-description");

  // 入力フィールドにイベントリスナーを追加
  groupInput.addEventListener("input", updatePreview);
  nameInput.addEventListener("input", updatePreview);
  mainDescriptionInput.addEventListener("input", updatePreview);
  subDescriptionInput.addEventListener("input", updatePreview);

  // フォームの送信イベントリスナー
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 必須フィールドの検証
    if (!groupInput.value.trim() || !nameInput.value.trim() || !mainDescriptionInput.value.trim() || !subDescriptionInput.value.trim()) {
      messageDiv.style.color = "red";
      messageDiv.textContent = "すべてのフィールドを入力してください。";
      return;
    }

    fetch("http://127.0.0.1:3000/add-fave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_name: groupInput.value.trim(),
        name: nameInput.value.trim(),
        description: mainDescriptionInput.value.trim(),
        sub_description: subDescriptionInput.value.trim(),
      }),
    });

    // 成功メッセージの表示
    messageDiv.style.color = "green";
    messageDiv.textContent = "Favoritesが正常に追加されました。";

    window.location.href = "/index.html";

    // フォームのリセット
    form.reset();

    // プレビューのリセット
    updatePreview();

    // メッセージを3秒後に非表示にする
    setTimeout(() => {
      messageDiv.textContent = "";
    }, 3000);
  });

  /**
   * プレビューを更新する関数
   */
  function updatePreview() {
    previewGroup.textContent = groupInput.value.trim() || "所属";
    previewName.textContent = nameInput.value.trim() || "名前";
    previewMainDescription.textContent = mainDescriptionInput.value.trim() || "メインの説明";
    previewSubDescription.textContent = subDescriptionInput.value.trim() || "サブの説明";
  }

  // ページ読み込み時にプレビューを初期化
  updatePreview();
});
