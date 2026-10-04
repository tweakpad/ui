const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const root = document.getElementById('storage')!;
const controller = new api.MeterController(root, { value: 30, minimum: 20, maximum: 40 });
controller.registerPart('label', document.getElementById('storage-label')!);
controller.registerPart('value', document.getElementById('storage-value')!);
document.getElementById('increase')!.addEventListener('click', () => {
  controller.update({ value: controller.state.value + 5 });
});
Object.assign(window, { meterFixture: { api, root, controller, built } });
