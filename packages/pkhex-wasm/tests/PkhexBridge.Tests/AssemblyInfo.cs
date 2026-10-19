// 句柄表是一张普通的静态 Dictionary —— wasm 是单线程的，桥接层不加锁。
// xUnit 默认按 collection 并行跑，多个测试类同时进出句柄表会互相踩，
// 表现就是「刚拿到的句柄立刻无效」。这里整个程序集串行。
[assembly: CollectionBehavior(DisableTestParallelization = true)]
