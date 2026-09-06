export function createEventDrain({ onError } = {}) {
  const tasks = new Set();
  let accepting = true;

  function track(label, handler) {
    return (...args) => {
      if (!accepting) return undefined;
      const task = Promise.resolve().then(() => handler(...args));
      tasks.add(task);
      void task.then(
        () => tasks.delete(task),
        (error) => {
          tasks.delete(task);
          onError?.(error, label);
        },
      );
      return task;
    };
  }

  async function stopAndDrain(timeoutMs) {
    accepting = false;
    const active = [...tasks];
    if (active.length === 0) return { drained: true, pending: 0 };

    let timer;
    const drained = await Promise.race([
      Promise.allSettled(active).then(() => true),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
        timer.unref?.();
      }),
    ]);
    clearTimeout(timer);
    return { drained, pending: tasks.size };
  }

  return { track, stopAndDrain };
}
