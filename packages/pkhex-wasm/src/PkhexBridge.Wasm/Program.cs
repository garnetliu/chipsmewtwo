// wasm 入口。真正的调用面是 Exports 上的那批 [JSExport]，
// Main 只负责把运行时跑起来然后停在这儿等 JS 调，所以什么都不做。
return;
