/**
 * 把 wasm 吐出来的字节存到磁盘。
 *
 * 文件名沿用原名不加时间戳 —— 用户拿它去覆盖原存档，改了名反而要手动改回去。
 */
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  // bytes.buffer 那一下不能省：TS 5.7 起 Uint8Array 带上了 ArrayBufferLike 泛型，
  // 直接塞进 BlobPart 会因为「可能是 SharedArrayBuffer」而类型不过
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  // 立刻 revoke 会让部分浏览器下到空文件，挪到下一轮事件循环
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
