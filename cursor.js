const fileInput = document.getElementById("fileInput");

if (fileInput) {
  // ファイルが選ばれたときの処理
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) {
      // 選択されなかった場合はデフォルトに戻す
      document.body.style.cursor = "auto";
      localStorage.removeItem("cursorImage");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target.result;

      // localStorage に保存
      localStorage.setItem("cursorImage", dataURL);

      // カーソル画像を変更する
      document.body.style.cursor = `url(${dataURL}), auto`;
    };
    reader.readAsDataURL(file);
  });
}
// ページ読み込み時に localStorage からカーソル画像を読み込む
window.addEventListener("load", () => {
  console.log("1");
  const savedCursorURL = localStorage.getItem("cursorImage");
  console.log(savedCursorURL);
  if (savedCursorURL) {
    document.body.style.cursor = `url(${savedCursorURL}), auto`;
  } else {
    document.body.style.cursor = "auto";
  }
});
