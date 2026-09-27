export const CLEAR_GAMEPLAY_INPUT_EVENT = "buckland:clear-gameplay-input";

export function clearGameplayInput(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLEAR_GAMEPLAY_INPUT_EVENT));
}

export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function releaseGameplayPointerLock(): void {
  if (typeof document === "undefined") return;
  if (document.pointerLockElement) document.exitPointerLock();
}

export function requestGameplayPointerLock(element: HTMLElement): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (document.pointerLockElement === element) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: number | undefined;

    const finish = (locked: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("pointerlockchange", handleChange);
      document.removeEventListener("pointerlockerror", handleError);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      resolve(locked);
    };

    const handleChange = () => finish(document.pointerLockElement === element);
    const handleError = () => finish(false);

    document.addEventListener("pointerlockchange", handleChange);
    document.addEventListener("pointerlockerror", handleError);

    try {
      element.requestPointerLock();
      timeoutId = window.setTimeout(() => finish(document.pointerLockElement === element), 1000);
    } catch {
      finish(false);
    }
  });
}
