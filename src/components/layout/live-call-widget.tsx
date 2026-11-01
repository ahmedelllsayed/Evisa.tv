export function LiveCallWidget({ bookingUrl }: { bookingUrl: string }) {
  if (!bookingUrl) return null;
  return (
    <div data-live-call="" className="fixed right-4 bottom-20 z-40 hidden w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-float lg:block">
      <div className="p-4">
        <p className="font-display text-sm font-semibold">Live Video Call</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-ink">
          Join a live video call with our expert to get help with your visa application.
        </p>
      </div>
      <a
        href={bookingUrl}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center bg-brand py-3 text-sm font-medium text-white"
      >
        Start Live Video Call
      </a>
    </div>
  );
}
