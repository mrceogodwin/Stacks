export function InstallSection() {
  return (
    <section id="install" className="px-4 pb-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="install-panel overflow-hidden rounded-[1.85rem] px-5 py-10 sm:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                On your home screen
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Add Stacks to mobile home screen as your personal AI & Products Solution Engine.
              </h2>
              <p className="mt-3 max-w-lg text-muted">
                Keep the showroom, the 500+ tools, and Premium in one icon. iOS and Android both get a short walkthrough.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/?install=1&platform=ios"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-5 text-sm font-semibold text-fg"
                >
                  <span className="device-tile device-ios" aria-hidden="true">
                    <span />
                  </span>
                  Add on iOS
                </a>
                <a
                  href="/?install=1&platform=android"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-line px-5 text-sm font-semibold"
                >
                  <span className="device-tile device-android" aria-hidden="true">
                    <span />
                  </span>
                  Add on Android
                </a>
              </div>
            </div>
            <div className="install-stage mx-auto grid w-full max-w-sm grid-cols-2 gap-4">
              <div className="install-phone">
                <span className="device-tile device-ios mx-auto" />
                <p className="mt-3 text-center text-sm font-semibold">iOS</p>
                <p className="text-center text-xs text-dim">Share → Add to Home Screen</p>
              </div>
              <div className="install-phone">
                <span className="device-tile device-android mx-auto" />
                <p className="mt-3 text-center text-sm font-semibold">Android</p>
                <p className="text-center text-xs text-dim">Menu → Install app</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
