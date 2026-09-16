import { AppleMark, AndroidMark } from "@/components/stacks/os-marks";

export function InstallSection() {
  return (
    <section id="install" className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="install-panel rounded-[1.6rem] border border-primary-bright/30 px-5 py-10 sm:px-10">
          <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
            Add to Home Screen
          </p>
          <h2 className="font-display max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Add Stacks to your phone as your personal AI and products engine.
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            One icon. Apps, 500+ tools, Everyday Tools, Flagship windows, and Premium. Works on iPhone and Android.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a href="/?install=1&platform=ios" className="os-card">
              <span className="os-logo os-logo-ios">
                <AppleMark className="size-10" />
              </span>
              <p className="font-display mt-4 text-xl font-semibold">iOS</p>
              <p className="mt-1 text-sm text-muted">Safari. Share. Add to Home Screen.</p>
              <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold">
                Add on iPhone
              </span>
            </a>
            <a href="/?install=1&platform=android" className="os-card">
              <span className="os-logo os-logo-android">
                <AndroidMark className="size-10" />
              </span>
              <p className="font-display mt-4 text-xl font-semibold">Android</p>
              <p className="mt-1 text-sm text-muted">Chrome menu. Install app.</p>
              <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold">
                Add on Android
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
