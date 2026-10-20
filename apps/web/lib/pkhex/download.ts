/**
 * 把字节存到磁盘。
 *
 * 文件名沿用原名不加时间戳 —— 用户拿它去覆盖原存档，改了名反而要手动改回去。
 */
export function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  mime = "application/octet-stream",
): void {
  /**
   * 这里必须重新包一层。
   *
   * TS 5.7 起 Uint8Array 带上了 ArrayBufferLike 泛型，wasm 吐出来的那个直接塞
   * 进 BlobPart 类型过不了。曾经写的是 bytes.buffer，但那样会丢掉 byteOffset ——
   * 拿到的是整个底层缓冲区而不是这一段视图。new Uint8Array(bytes) 走的是
   * ArrayLike 那条重载，拷一份出来，类型和语义一起对
   */
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  // 立刻 revoke 会让部分浏览器下到空文件，挪到下一轮事件循环
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
